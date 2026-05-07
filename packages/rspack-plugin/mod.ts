import { ensureDir, exists } from "@std/fs";
import { dirname, fromFileUrl, join, relative, toFileUrl } from "@std/path";
import {
  analyzeModule,
  BabelParserAdapter,
  classifyFunctions,
  scanSourceFiles,
} from "@ultimate-js/analyzer";
import type {
  ClassificationResult,
  ClassifiedFunction,
  ModuleAnalysis,
  ParserAdapter,
} from "@ultimate-js/analyzer";
import type { RouteRecord } from "@ultimate-js/router";
import { scanRoutes } from "@ultimate-js/router";
import {
  formatDiagnostic,
  renderDocument,
  resolveConfig,
} from "@ultimate-js/core";
import type {
  DocumentHead,
  ParserType,
  ResolvedConfig,
  UltimateConfig,
} from "@ultimate-js/core";

const PLUGIN_NAME = "UltimateRspackPlugin";
const PAGE_OR_LAYOUT_RE = /\/(page|layout)\.(tsx?|jsx?)$/;

type RspackStats = {
  hasErrors(): boolean;
  toJson(opts: { errors: boolean }): { errors?: { message: string }[] };
};

type RspackCompiler = {
  context?: string;
  run(callback: (err: Error | null, stats: RspackStats | null) => void): void;
  hooks?: {
    beforeRun?: RspackAsyncHook<RspackCompiler>;
    watchRun?: RspackAsyncHook<RspackCompiler>;
  };
};

type RspackAsyncHook<T> = {
  tapPromise(name: string, handler: (arg: T) => Promise<void>): void;
};

type RspackFn = (config: Record<string, unknown>) => RspackCompiler;

export interface RspackCompileResult {
  routes: RouteRecord[];
  analyses: ModuleAnalysis[];
  classification: ClassificationResult;
  serverFunctions: ClassifiedFunction[];
  clientFunctions: ClassifiedFunction[];
  sharedFunctions: ClassifiedFunction[];
  serverFunctionFiles: Set<string>;
}

export interface RspackBuildResult extends RspackCompileResult {
  clientBundle: string;
  serverBundle: string;
}

export interface UltimateRspackPluginOptions {
  /**
   * Project root. Defaults to the Rspack compiler context and then `Deno.cwd()`.
   */
  projectRoot?: string;
  /** App directory relative to the project root. Defaults to `app`. */
  appDir?: string;
  /** Parser used by `@ultimate-js/analyzer`. Defaults to Ultimate config. */
  parser?: ParserType;
  /**
   * Ultimate config. If omitted, framework defaults are used. `parser` overrides
   * this config when both are provided.
   */
  config?: UltimateConfig | ResolvedConfig;
  /** Receives the latest analysis result after every analysis pass. */
  onResult?: (result: RspackCompileResult) => void | Promise<void>;
}

export interface BuildRspackProjectOptions extends UltimateRspackPluginOptions {
  projectRoot: string;
  config: ResolvedConfig;
  distDir?: string;
}

/**
 * Rspack adapter for Ultimate's analyzer semantics.
 *
 * Rspack builds use this package as their orchestration entry point instead of
 * calling `compileProject()`. Native builds still use the compiler package.
 */
export class UltimateRspackPlugin {
  readonly options: UltimateRspackPluginOptions;
  #lastResult: RspackCompileResult | undefined;

  constructor(options: UltimateRspackPluginOptions = {}) {
    this.options = options;
  }

  get result(): RspackCompileResult | undefined {
    return this.#lastResult;
  }

  apply(compiler: RspackCompiler): void {
    const run = async (activeCompiler: RspackCompiler) => {
      await this.analyze(activeCompiler);
    };

    compiler.hooks?.beforeRun?.tapPromise(PLUGIN_NAME, run);
    compiler.hooks?.watchRun?.tapPromise(PLUGIN_NAME, run);
  }

  async analyze(compiler?: RspackCompiler): Promise<RspackCompileResult> {
    const projectRoot = this.options.projectRoot ?? compiler?.context ??
      Deno.cwd();
    const config = resolvePluginConfig(this.options);
    const result = await analyzeRspackProject({
      projectRoot,
      appDir: this.options.appDir,
      config,
    });
    this.#lastResult = result;
    await this.options.onResult?.(result);
    return result;
  }
}

export function createUltimateRspackPlugin(
  options: UltimateRspackPluginOptions = {},
): UltimateRspackPlugin {
  return new UltimateRspackPlugin(options);
}

export async function buildRspackProject(
  options: BuildRspackProjectOptions,
): Promise<RspackBuildResult> {
  const projectRoot = options.projectRoot;
  const appDir = join(projectRoot, options.appDir || "app");
  const distDir = options.distDir ?? join(projectRoot, "dist");
  const clientDir = join(distDir, "client");
  const serverDir = join(distDir, "server");

  await ensureDir(join(clientDir, "assets"));
  await ensureDir(serverDir);

  const result = await analyzeRspackProject(options);
  const html = renderDocument(await loadDocumentHead(projectRoot));
  await Deno.writeTextFile(join(clientDir, "index.html"), html);

  const aliases = await loadAliases(projectRoot, result);
  const rspack = await loadRspack();
  const clientBundle = join(clientDir, "assets", "client.js");
  await runRspack(
    rspack,
    createClientConfig({
      projectRoot,
      appDir,
      result,
      aliases,
      outFile: clientBundle,
      rpcBase: options.config.client.rpcBase,
    }),
  );
  console.log(`  Client bundle: ${clientBundle}`);

  const serverBundle = join(serverDir, "main.ts");
  await runRspack(
    rspack,
    createServerConfig({
      projectRoot,
      result,
      aliases,
      outFile: serverBundle,
      config: options.config,
    }),
  );
  console.log(`  Server bundle: ${serverDir}`);

  if (options.config.server.output === "executable") {
    await compileServerExecutable(projectRoot, serverDir);
  }

  return { ...result, clientBundle, serverBundle };
}

async function analyzeRspackProject(options: {
  projectRoot: string;
  appDir?: string;
  config?: ResolvedConfig;
}): Promise<RspackCompileResult> {
  const projectRoot = options.projectRoot;
  const appDir = join(projectRoot, options.appDir || "app");
  const parser = await createParser(options.config);
  const routes = await scanRoutes(appDir);
  const sourceFiles = await scanSourceFiles(appDir);
  const analyses: ModuleAnalysis[] = [];

  for (const file of sourceFiles) {
    const code = await Deno.readTextFile(file);
    const parsed = await parser.parseModule({ file, code });
    analyses.push(
      analyzeModule(file, parsed, PAGE_OR_LAYOUT_RE.test(file), appDir),
    );
  }

  const classification = classifyFunctions(analyses);
  if (classification.diagnostics.length > 0) {
    const message = classification.diagnostics.map(formatDiagnostic).join("\n");
    if (classification.diagnostics.some((diag) => diag.level === "error")) {
      throw new Error(message);
    }
    console.log(message);
  }

  const allFns = [...classification.functions.values()];
  const buildTimeOnly = new Set(["generateStaticParams"]);
  const serverFunctions = allFns.filter((fn) =>
    fn.runtime === "server" && !buildTimeOnly.has(fn.info.name)
  );
  const clientFunctions = allFns.filter((fn) => fn.runtime === "client");
  const sharedFunctions = allFns.filter((fn) => fn.runtime === "shared");
  const serverFunctionFiles = new Set(
    serverFunctions.map((fn) => fn.info.file),
  );

  return {
    routes,
    analyses,
    classification,
    serverFunctions,
    clientFunctions,
    sharedFunctions,
    serverFunctionFiles,
  };
}

async function createParser(config?: ResolvedConfig): Promise<ParserAdapter> {
  switch (config?.parser ?? "babel") {
    case "babel":
      return new BabelParserAdapter();
    case "swc": {
      const { SwcParserAdapter } = await import(
        "@ultimate-js/analyzer/swc-parser"
      );
      return new SwcParserAdapter();
    }
    default:
      throw new Error(`Unknown parser: ${config?.parser}`);
  }
}

function createClientConfig(options: {
  projectRoot: string;
  appDir: string;
  result: RspackCompileResult;
  aliases: Record<string, string>;
  outFile: string;
  rpcBase: string;
}): Record<string, unknown> {
  const outDir = dirname(options.outFile);
  const outFilename = options.outFile.substring(
    options.outFile.lastIndexOf("/") + 1,
  );
  const proxySpec = dataModule(
    generateClientProxyJs(options.result.serverFunctions),
  );

  return baseRspackConfig({
    projectRoot: options.projectRoot,
    aliases: options.aliases,
    entry: dataModule(
      generateClientEntryCode(options.result.routes, options.rpcBase),
    ),
    outDir,
    outFilename,
    extraRuleUse: [{
      loader: loaderPath("client-transform-loader.cjs"),
      options: {
        appDir: options.appDir,
        proxySpec,
        serverFunctionFiles: [...options.result.serverFunctionFiles],
      },
    }],
  });
}

function createServerConfig(options: {
  projectRoot: string;
  result: RspackCompileResult;
  aliases: Record<string, string>;
  outFile: string;
  config: ResolvedConfig;
}): Record<string, unknown> {
  const outDir = dirname(options.outFile);
  const outFilename = options.outFile.substring(
    options.outFile.lastIndexOf("/") + 1,
  );

  return baseRspackConfig({
    projectRoot: options.projectRoot,
    aliases: options.aliases,
    entry: dataModule(
      generateServerEntryCode(
        options.result.serverFunctions,
        options.config,
      ),
    ),
    outDir,
    outFilename,
  });
}

function baseRspackConfig(options: {
  projectRoot: string;
  aliases: Record<string, string>;
  entry: string;
  outDir: string;
  outFilename: string;
  extraRuleUse?: unknown[];
}): Record<string, unknown> {
  return {
    mode: "production",
    target: "web",
    context: options.projectRoot,
    entry: options.entry,
    output: { path: options.outDir, filename: options.outFilename },
    externals: {
      hono: "hono",
      "hono/cors": "hono/cors",
      "node:async_hooks": "node:async_hooks",
    },
    externalsType: "module",
    experiments: {
      outputModule: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
      alias: options.aliases,
      modules: [join(options.projectRoot, "node_modules"), "node_modules"],
    },
    module: {
      rules: [{
        test: /\.(tsx?|jsx?)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "builtin:swc-loader",
            options: {
              jsc: {
                parser: { syntax: "typescript", tsx: true },
                transform: { react: { runtime: "classic" } },
              },
            },
          },
          ...(options.extraRuleUse ?? []),
        ],
      }],
    },
  };
}

function generateClientEntryCode(
  routes: RouteRecord[],
  rpcBase: string,
): string {
  const imports: string[] = [
    `import React from "react";`,
    `import { createRoot } from "react-dom/client";`,
    `import { Router } from "@ultimate-js/react";`,
    `import { setRemoteEndpoint } from "@ultimate-js/rpc-client";`,
  ];
  const layoutAlias = new Map<string, string>();
  let idx = 0;

  for (const route of routes) {
    for (const layout of route.layoutFiles) {
      if (!layoutAlias.has(layout)) {
        const alias = `layout${idx++}`;
        layoutAlias.set(layout, alias);
        imports.push(`import * as ${alias} from ${JSON.stringify(layout)};`);
      }
    }
  }

  const entries: string[] = [];
  for (const route of routes) {
    const alias = `page${idx++}`;
    imports.push(`import * as ${alias} from ${JSON.stringify(route.file)};`);
    const layouts = route.layoutFiles
      .map((layout) => `${layoutAlias.get(layout)!}.default`)
      .join(", ");
    entries.push(`  {
    id: ${JSON.stringify(route.id)},
    path: ${JSON.stringify(route.path)},
    component: ${alias}.default,
    layouts: [${layouts}],
  }`);
  }

  return `${imports.join("\n")}

const routes = [
${entries.join(",\n")}
];

setRemoteEndpoint(${JSON.stringify(rpcBase)});

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    React.createElement(Router, { routes }),
  );
}
`;
}

function generateClientProxyJs(serverFunctions: ClassifiedFunction[]): string {
  const lines = [
    `import { remoteFunctionCall } from "@ultimate-js/rpc-client";`,
    ``,
  ];
  for (const fn of serverFunctions) {
    const name = fn.info.exportName || fn.info.name;
    lines.push(`export function ${name}(...args) {`);
    lines.push(
      `  return remoteFunctionCall(${JSON.stringify(fn.info.id)}, args);`,
    );
    lines.push(`}`);
    lines.push(``);
  }
  return lines.join("\n");
}

function generateServerEntryCode(
  serverFunctions: ClassifiedFunction[],
  config: ResolvedConfig,
): string {
  const imports = [
    `import { Hono } from "hono";`,
    `import { cors } from "hono/cors";`,
    `import { createRpcHandler } from "@ultimate-js/rpc-server";`,
  ];
  const byFile = new Map<string, ClassifiedFunction[]>();
  for (const fn of serverFunctions) {
    const existing = byFile.get(fn.info.file) ?? [];
    existing.push(fn);
    byFile.set(fn.info.file, existing);
  }

  let idx = 0;
  const manifestEntries: string[] = [];
  for (const [file, fns] of byFile) {
    const names = [
      ...new Set(fns.map((fn) => fn.info.exportName || fn.info.name)),
    ];
    const alias = `serverMod${idx++}`;
    if (names.length === 1 && names[0] === "default") {
      imports.push(`import ${alias} from ${JSON.stringify(file)};`);
      manifestEntries.push(`  ${JSON.stringify(fns[0].info.id)}: ${alias},`);
    } else {
      imports.push(
        `import { ${names.join(", ")} } from ${JSON.stringify(file)};`,
      );
      for (const fn of fns) {
        const name = fn.info.exportName || fn.info.name;
        manifestEntries.push(`  ${JSON.stringify(fn.info.id)}: ${name},`);
      }
    }
  }

  const { port, host, endpoint } = config.server;
  const ep = endpoint.replace(/\/+$/, "");

  return `${imports.join("\n")}

const serverManifest = {
${manifestEntries.join("\n")}
};

const defaultRuntimeOptions = {
  port: ${JSON.stringify(port)},
  host: ${JSON.stringify(host)},
  endpoint: ${JSON.stringify(ep)},
};

function parseRuntimeOptions() {
  const flags = new Map();
  for (let i = 0; i < Deno.args.length; i++) {
    const arg = Deno.args[i];
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      flags.set(raw.slice(0, eq), raw.slice(eq + 1));
      continue;
    }
    const next = Deno.args[i + 1];
    if (next && !next.startsWith("-")) {
      flags.set(raw, next);
      i++;
    }
  }

  return {
    port: parsePort(flag(flags, ["port", "listen-port"]) ?? env(["ULTIMATE_SERVER_PORT", "ULTIMATE_PORT", "PORT"]) ?? String(defaultRuntimeOptions.port), "port"),
    host: flag(flags, ["host", "listen-host", "hostname"]) ?? env(["ULTIMATE_SERVER_HOST", "ULTIMATE_HOST", "HOST"]) ?? defaultRuntimeOptions.host,
    endpoint: normalizeEndpoint(flag(flags, ["rpc-endpoint", "endpoint"]) ?? env(["ULTIMATE_SERVER_RPC_ENDPOINT", "ULTIMATE_RPC_ENDPOINT", "RPC_ENDPOINT", "ENDPOINT"]) ?? defaultRuntimeOptions.endpoint),
  };
}

function flag(flags, names) {
  for (const name of names) {
    const value = flags.get(name);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
}

function env(names) {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value?.trim()) return value.trim();
  }
}

function parsePort(value, source) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(source + " must be a valid TCP port");
  }
  return port;
}

function normalizeEndpoint(endpoint) {
  const trimmed = endpoint.trim();
  if (!trimmed.startsWith("/")) return ("/" + trimmed).replace(/\\/+$/, "");
  return trimmed.replace(/\\/+$/, "") || "/";
}

const runtimeOptions = parseRuntimeOptions();
const app = new Hono();
const dev = Deno.env.get("DENO_ENV") !== "production";

app.use(runtimeOptions.endpoint + "/*", cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Accept", "Ultimate-Session-Cursor"],
}));

const rpcHandler = createRpcHandler({
  manifest: serverManifest,
  dev,
  createContext(request) {
    return { request };
  },
});

app.post(runtimeOptions.endpoint + "/:functionId", async (c) => {
  return await rpcHandler(c.req.raw, c.req.param("functionId"));
});

app.options(runtimeOptions.endpoint + "/:functionId", async (c) => {
  return await rpcHandler(c.req.raw, c.req.param("functionId"));
});

app.all("*", (c) => {
  return c.text("Not found", 404);
});

const displayHost = runtimeOptions.host === "0.0.0.0"
  ? "localhost"
  : runtimeOptions.host;
console.log("Listening on http://" + runtimeOptions.host + ":" + runtimeOptions.port + "/ (http://" + displayHost + ":" + runtimeOptions.port + "/)");
Deno.serve({ port: runtimeOptions.port, hostname: runtimeOptions.host, onListen() {} }, app.fetch);
`;
}

async function loadDocumentHead(projectRoot: string): Promise<DocumentHead> {
  const layoutPath = join(projectRoot, "app", "layout.tsx");
  if (!(await exists(layoutPath, { isFile: true }))) return {};

  const code = `
const mod = await import(${JSON.stringify(toFileUrl(layoutPath).href)});
console.log(JSON.stringify(mod.head ?? {}));
`;
  const command = new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-check", "--config", "deno.json", code],
    cwd: projectRoot,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(
      `failed to load document head:\n${stderr.substring(0, 500)}`,
    );
  }

  const stdout = new TextDecoder().decode(output.stdout).trim();
  return stdout ? JSON.parse(stdout) as DocumentHead : {};
}

async function loadRspack(): Promise<RspackFn> {
  const mod = await import("@rspack/core") as Record<string, unknown>;
  return (mod.rspack ??
    (mod.default as Record<string, unknown>)?.rspack) as RspackFn;
}

async function runRspack(
  rspack: RspackFn,
  config: Record<string, unknown>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const compiler = rspack(config);
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats?.hasErrors()) {
        const info = stats.toJson({ errors: true });
        const messages = (info.errors ?? []).map((e) => e.message).join("\n");
        reject(new Error(`rspack build failed:\n${messages}`));
        return;
      }
      resolve();
    });
  });
}

async function compileServerExecutable(
  projectRoot: string,
  serverDist: string,
): Promise<void> {
  const mainTs = join(serverDist, "main.ts");
  const outBin = join(serverDist, "server");
  console.log(`  Compiling executable...`);

  const output = await new Deno.Command(Deno.execPath(), {
    args: ["compile", "-A", "--no-check", "--output", outBin, mainTs],
    cwd: projectRoot,
    stdout: "piped",
    stderr: "piped",
  }).output();

  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(`deno compile failed:\n${stderr.substring(0, 500)}`);
  }
  console.log(`  Executable: ${outBin}`);
}

async function loadAliases(
  projectRoot: string,
  result: RspackCompileResult,
): Promise<Record<string, string>> {
  const entry = await writeDenoInfoEntry(projectRoot, result);
  await installNodeModules(projectRoot, entry);
  const output = await new Deno.Command(Deno.execPath(), {
    args: ["info", "--json", entry],
    cwd: projectRoot,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(`deno info failed:\n${stderr.substring(0, 500)}`);
  }

  const info = JSON.parse(new TextDecoder().decode(output.stdout)) as DenoInfo;
  const vendorRoot = join(projectRoot, ".ultimate", "rspack-vendor");
  const aliases: Record<string, string> = {};
  const specToPath = new Map<string, string>();

  for (const mod of info.modules) {
    if (mod.kind !== "esm" || !mod.local) continue;
    let path: string | undefined;
    if (mod.specifier.startsWith("file:")) {
      path = fromFileUrl(mod.specifier);
    } else if (
      mod.specifier.startsWith("http://") ||
      mod.specifier.startsWith("https://")
    ) {
      path = remoteModulePath(vendorRoot, mod.specifier);
    }
    if (path) specToPath.set(mod.specifier, path);
  }

  for (const mod of info.modules) {
    if (
      mod.kind === "esm" &&
      mod.local &&
      (mod.specifier.startsWith("http://") ||
        mod.specifier.startsWith("https://"))
    ) {
      await vendorRemoteModule(
        vendorRoot,
        mod,
        specToPath,
        info.packages ?? {},
      );
    }
  }

  for (const mod of info.modules) {
    for (const dep of mod.dependencies ?? []) {
      if (!dep.code) continue;
      if (dep.npmPackage) {
        const target = resolveNpmSpecifier(dep.code.specifier);
        if (target) {
          aliases[dep.specifier] ??= target;
          aliases[dep.code.specifier] ??= target;
        }
        continue;
      }
      const target = resolveDenoSpecifier(
        dep.code.specifier,
        specToPath,
        info.packages ?? {},
      );
      if (!target) continue;
      aliases[dep.specifier] ??= target;
      aliases[dep.code.specifier] ??= target;
    }
  }

  for (
    const dir of [
      projectRoot,
      join(projectRoot, "../.."),
      join(projectRoot, ".."),
    ]
  ) {
    try {
      const raw = await Deno.readTextFile(join(dir, "deno.json"));
      const cfg = JSON.parse(raw) as { imports?: Record<string, string> };
      for (const [key, value] of Object.entries(cfg.imports ?? {})) {
        if (value.startsWith("./") || value.startsWith("../")) {
          aliases[key] = join(dir, value);
        } else if (value.startsWith("/")) {
          aliases[key] = value;
        }
      }
    } catch { /* no deno.json */ }
  }

  return aliases;
}

async function writeDenoInfoEntry(
  projectRoot: string,
  result: RspackCompileResult,
): Promise<string> {
  const entry = join(projectRoot, ".ultimate", "rspack", "deno-info-entry.ts");
  await ensureDir(dirname(entry));
  const imports = new Set<string>([
    "hono",
    "hono/cors",
    "react",
    "react-dom/client",
    "@ultimate-js/hono",
    "@ultimate-js/react",
    "@ultimate-js/rpc-client",
    "@ultimate-js/rpc-server",
  ]);
  for (const route of result.routes) {
    imports.add(route.file);
    for (const layout of route.layoutFiles) imports.add(layout);
  }
  for (const fn of result.serverFunctions) imports.add(fn.info.file);
  await Deno.writeTextFile(
    entry,
    [...imports].map((specifier, i) =>
      `import * as mod${i} from ${JSON.stringify(specifier)}; void mod${i};`
    ).join("\n"),
  );
  return entry;
}

async function installNodeModules(
  projectRoot: string,
  entry: string,
): Promise<void> {
  const output = await new Deno.Command(Deno.execPath(), {
    args: ["install", "--node-modules-dir=auto", "--entrypoint", entry],
    cwd: projectRoot,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(`deno install failed:\n${stderr.substring(0, 500)}`);
  }
}

async function vendorRemoteModule(
  vendorRoot: string,
  mod: DenoInfoModule,
  specToPath: Map<string, string>,
  packages: Record<string, string>,
): Promise<void> {
  const path = remoteModulePath(vendorRoot, mod.specifier);
  let source = await Deno.readTextFile(mod.local!);
  for (const dep of mod.dependencies ?? []) {
    if (!dep.code) continue;
    const replacement = dep.npmPackage
      ? resolveNpmSpecifier(dep.code.specifier)
      : resolveDenoImportSpecifier(
        path,
        dep.code.specifier,
        specToPath,
        packages,
      );
    if (!replacement) continue;
    source = replaceImportSpecifier(source, dep.specifier, replacement);
  }
  await ensureDir(dirname(path));
  await Deno.writeTextFile(path, source);
}

function resolveNpmSpecifier(specifier: string): string | undefined {
  const npm = specifier.replace(/^npm:/, "");
  const match = npm.match(/^(@[^/]+\/[^@/]+|[^@/]+)(?:@[^/]+)?(\/.*)?$/);
  if (!match) return undefined;
  const [, name, subpath = ""] = match;
  return name + subpath;
}

function resolveDenoImportSpecifier(
  fromFile: string,
  specifier: string,
  specToPath: Map<string, string>,
  packages: Record<string, string>,
): string | undefined {
  const target = resolveDenoSpecifier(specifier, specToPath, packages);
  if (!target) return undefined;
  let rel = relative(dirname(fromFile), target);
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

function resolveDenoSpecifier(
  specifier: string,
  specToPath: Map<string, string>,
  packages: Record<string, string>,
): string | undefined {
  if (
    specifier.startsWith("file:") ||
    specifier.startsWith("http://") ||
    specifier.startsWith("https://")
  ) {
    return specToPath.get(specifier);
  }
  if (specifier.startsWith("jsr:")) {
    return resolveJsrSpecifier(
      specifier.replace(/^jsr:\//, "jsr:"),
      specToPath,
      packages,
    );
  }
}

function resolveJsrSpecifier(
  specifier: string,
  specToPath: Map<string, string>,
  packages: Record<string, string>,
): string | undefined {
  const jsr = specifier.replace(/^jsr:/, "");
  const match = jsr.match(/^(@[^/]+\/[^@/]+|[^@/]+)(?:@([^/]+))?(\/.*)?$/);
  if (!match) return undefined;

  const [, name, requestedVersion = "*", subpath = ""] = match;
  const resolved = packages[`${name}@${requestedVersion}`] ??
    packages[`${name}@*`] ??
    Object.entries(packages).find(([key]) => key.startsWith(`${name}@`))?.[1];
  if (!resolved) return undefined;

  const version = resolved.slice(name.length + 1);
  const file = subpath ? subpath.replace(/^\/+/, "") : "mod.ts";
  const normalizedFile = file.replaceAll("-", "_");
  const candidates = [
    file,
    `${file}.ts`,
    `${file}.tsx`,
    `src/${file}`,
    `src/${file}.ts`,
    `src/${file}.tsx`,
    `src/${file}/index.ts`,
    `src/middleware/${file}/index.ts`,
    normalizedFile,
    `${normalizedFile}.ts`,
    `${normalizedFile}.tsx`,
    `src/${normalizedFile}`,
    `src/${normalizedFile}.ts`,
    `src/${normalizedFile}.tsx`,
    `src/${normalizedFile}/index.ts`,
    `src/middleware/${normalizedFile}/index.ts`,
    `${file}/mod.ts`,
    `${normalizedFile}/mod.ts`,
    "src/index.ts",
  ];

  for (const candidate of candidates) {
    const path = specToPath.get(
      `https://jsr.io/${name}/${version}/${candidate}`,
    );
    if (path) return path;
  }
}

function remoteModulePath(vendorRoot: string, specifier: string): string {
  const url = new URL(specifier);
  return join(
    vendorRoot,
    url.protocol.replace(/:$/, ""),
    url.hostname,
    decodeURIComponent(url.pathname.replace(/^\/+/, "")),
  );
}

function replaceImportSpecifier(
  source: string,
  from: string,
  to: string,
): string {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(
    new RegExp(`(["'])${escaped}\\1`, "g"),
    (_match, quote: string) => `${quote}${to}${quote}`,
  );
}

function dataModule(code: string): string {
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
}

function loaderPath(name: string): string {
  return fromFileUrl(new URL(`./${name}`, import.meta.url));
}

function resolvePluginConfig(
  options: UltimateRspackPluginOptions,
): ResolvedConfig {
  const raw = isResolvedConfig(options.config)
    ? options.config
    : resolveConfig(options.config);
  if (!options.parser) return raw;
  return { ...raw, parser: options.parser };
}

function isResolvedConfig(
  config: UltimateRspackPluginOptions["config"],
): config is ResolvedConfig {
  return !!config && "server" in config && "client" in config &&
    typeof config.client === "object" && config.client !== null &&
    "rpcBase" in config.client;
}

interface DenoInfoModule {
  kind: string;
  specifier: string;
  local?: string;
  dependencies?: DenoInfoDependency[];
}

interface DenoInfoDependency {
  specifier: string;
  code?: { specifier: string };
  npmPackage?: string;
}

interface DenoInfo {
  modules: DenoInfoModule[];
  packages?: Record<string, string>;
}
