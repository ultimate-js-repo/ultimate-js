import { ensureDir } from "@std/fs";
import { dirname, fromFileUrl, join, relative } from "@std/path";
import type { RspackCompileResult } from "./types.ts";

export async function loadAliases(
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
