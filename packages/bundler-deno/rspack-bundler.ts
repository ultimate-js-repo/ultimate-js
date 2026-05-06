import { dirname, fromFileUrl, join, relative } from "@std/path";
import type { BundlerAdapter } from "./bundler-types.ts";

/** Minimal rspack compiler interface. */
interface RspackStats {
  hasErrors(): boolean;
  toJson(opts: { errors: boolean }): { errors?: { message: string }[] };
}

interface RspackCompiler {
  run(callback: (err: Error | null, stats: RspackStats | null) => void): void;
}

type RspackFn = (config: Record<string, unknown>) => RspackCompiler;

/**
 * Rspack client bundler.
 * Lazily loads @rspack/core on first use.
 */
export class RspackBundler implements BundlerAdapter {
  async bundleClient(options: {
    entry: string;
    outFile: string;
    projectRoot: string;
  }): Promise<void> {
    const mod = await import("@rspack/core") as Record<string, unknown>;
    const rspack = (mod.rspack ??
      (mod.default as Record<string, unknown>)?.rspack) as RspackFn;

    const outDir = options.outFile.substring(
      0,
      options.outFile.lastIndexOf("/"),
    );
    const outFilename = options.outFile.substring(
      options.outFile.lastIndexOf("/") + 1,
    );
    const aliases = await loadAliases(options.projectRoot, options.entry);

    return new Promise<void>((resolve, reject) => {
      const compiler = rspack({
        mode: "production",
        entry: options.entry,
        output: { path: outDir, filename: outFilename },
        resolve: {
          extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
          alias: aliases,
          modules: [join(options.projectRoot, "node_modules"), "node_modules"],
        },
        module: {
          rules: [
            {
              test: /\.(tsx?|jsx?)$/,
              exclude: /node_modules/,
              use: {
                loader: "builtin:swc-loader",
                options: {
                  jsc: {
                    parser: { syntax: "typescript", tsx: true },
                    transform: { react: { runtime: "classic" } },
                  },
                },
              },
            },
          ],
        },
      });

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
}

async function loadAliases(
  projectRoot: string,
  entry: string,
): Promise<Record<string, string>> {
  const aliases = await loadDenoAliases(projectRoot, entry);

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
      if (cfg.imports) {
        for (const [key, value] of Object.entries(cfg.imports)) {
          if (value.startsWith("./") || value.startsWith("../")) {
            aliases[key] = join(dir, value);
          }
        }
      }
    } catch { /* no deno.json */ }
  }

  return aliases;
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

async function loadDenoAliases(
  projectRoot: string,
  entry: string,
): Promise<Record<string, string>> {
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

  return aliases;
}

function resolveNpmSpecifier(specifier: string): string | undefined {
  const npm = specifier.replace(/^npm:/, "");
  const match = npm.match(/^(@[^/]+\/[^@/]+|[^@/]+)(?:@[^/]+)?(\/.*)?$/);
  if (!match) return undefined;

  const [, name, subpath = ""] = match;
  return name + subpath;
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
): Promise<string> {
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

  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, source);
  return path;
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
    return resolveJsrSpecifier(specifier, specToPath, packages);
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
    normalizedFile,
    `${normalizedFile}.ts`,
    `${normalizedFile}.tsx`,
    `${file}/mod.ts`,
    `${normalizedFile}/mod.ts`,
  ];

  for (const candidate of candidates) {
    const path = specToPath.get(
      `https://jsr.io/${name}/${version}/${candidate}`,
    );
    if (path) return path;
  }
}
