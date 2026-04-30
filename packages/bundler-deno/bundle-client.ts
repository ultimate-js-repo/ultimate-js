import { join, relative, resolve, dirname } from "@std/path";
import type { CompileResult } from "@ultimate-js/compiler";
import type { RouteRecord } from "@ultimate-js/router";
import type { DocumentHead, ResolvedConfig } from "@ultimate-js/core";
import { renderDocument, runtimeImport } from "@ultimate-js/core";
import { transformClientSource } from "@ultimate-js/generator";
import type { BundlerAdapter } from "./bundler-types.ts";
import { DenoBundler } from "./deno-bundler.ts";
import { ensureDir, writeTextFile } from "./utils.ts";

/**
 * Transform and copy app sources for client build, rewriting server imports to proxies.
 */
export async function transformAndCopyAppSources(
  appDir: string,
  transformedDir: string,
  analyses: CompileResult["analyses"],
  serverFunctionFiles: Set<string>,
  proxyFilePath: string,
): Promise<void> {
  const clientFileSet = new Set<string>();

  for (const a of analyses) {
    if (a.isRouteFile || a.directive === "client" || a.directive === "shared") {
      clientFileSet.add(a.file);
    }
  }

  for (const srcFile of clientFileSet) {
    const relPath = relative(appDir, srcFile);
    const destFile = join(transformedDir, relPath);
    await ensureDir(dirname(destFile));

    const source = await Deno.readTextFile(srcFile);

    let needsTransform = false;
    const importRegex = /(?:import|export)\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']/g;
    let m;
    while ((m = importRegex.exec(source)) !== null) {
      const specifier = m[1];
      if (!specifier || !specifier.startsWith(".")) continue;
      const resolved = resolve(dirname(srcFile), specifier);
      for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        if (serverFunctionFiles.has(resolved + ext)) {
          needsTransform = true;
          break;
        }
      }
      if (needsTransform) break;
    }

    if (needsTransform) {
      console.log(`    Transforming: ${relPath}`);
      const transformed = transformClientSource(source, srcFile, destFile, serverFunctionFiles, proxyFilePath);
      await writeTextFile(destFile, transformed);
    } else {
      await writeTextFile(destFile, source);
    }
  }

  console.log(`    Transformed ${clientFileSet.size} file(s)`);
}

/**
 * Load the head export from app/layout.tsx (if it exists).
 */
export async function loadDocumentHead(projectRoot: string): Promise<DocumentHead> {
  const layoutPath = join(projectRoot, "app", "layout.tsx");
  try {
    await Deno.stat(layoutPath);
    const mod = await runtimeImport(layoutPath);
    return (mod.head as DocumentHead) ?? {};
  } catch {
    return {};
  }
}

/**
 * Check whether app/layout.tsx exists.
 */
export async function hasLayoutFile(projectRoot: string): Promise<boolean> {
  try {
    await Deno.stat(join(projectRoot, "app", "layout.tsx"));
    return true;
  } catch {
    return false;
  }
}

async function createBundler(config?: ResolvedConfig): Promise<BundlerAdapter> {
  switch (config?.bundler ?? "native") {
    case "native":
      return new DenoBundler();
    case "rspack": {
      const { RspackBundler } = await import("./rspack-bundler.ts");
      return new RspackBundler();
    }
    case "vite":
      throw new Error('bundler "vite" is not implemented yet');
    default:
      throw new Error(`Unknown bundler: ${config?.bundler}`);
  }
}

/**
 * Bundle client assets: generate index.html + run bundler.
 */
export async function bundleClient(
  projectRoot: string,
  distDir: string,
  config?: ResolvedConfig,
): Promise<void> {
  const head = await loadDocumentHead(projectRoot);
  const html = renderDocument(head);
  await writeTextFile(join(distDir, "client", "index.html"), html);

  const entry = join(projectRoot, ".ultimate", "client-entry.tsx");
  const outFile = join(distDir, "client", "assets", "client.js");

  const bundler = await createBundler(config);
  await bundler.bundleClient({ entry, outFile, projectRoot });

  console.log(`  Client bundle: ${outFile}`);
}

/**
 * For each dynamic route that exports `generateStaticParams()`,
 * call it and write an index.html at every concrete path so the
 * site can be served from a static CDN without SPA fallback.
 *
 * Returns the number of pages generated.
 */
export async function generateStaticPaths(
  routes: RouteRecord[],
  distDir: string,
): Promise<number> {
  const clientDir = join(distDir, "client");
  let count = 0;

  // Read the root index.html that was already generated
  let rootHtml: string;
  try {
    rootHtml = await Deno.readTextFile(join(clientDir, "index.html"));
  } catch {
    return 0;
  }

  for (const route of routes) {
    const hasDynamic = route.segments.some(
      (s) => s.type === "param" || s.type === "catchAll",
    );
    if (!hasDynamic) continue;

    let mod: Record<string, unknown>;
    try {
      mod = await runtimeImport(route.file);
    } catch {
      continue;
    }

    if (typeof mod.generateStaticParams !== "function") continue;

    const paramsList: Record<string, string>[] = await mod.generateStaticParams();

    for (const params of paramsList) {
      // Replace :param placeholders with concrete values
      let concretePath = route.path;
      for (const [key, value] of Object.entries(params)) {
        concretePath = concretePath.replace(`:${key}`, value);
      }
      concretePath = concretePath.replace(/\/+$/, "") || "/";

      const htmlDir = join(clientDir, concretePath);
      await ensureDir(htmlDir);
      await writeTextFile(join(htmlDir, "index.html"), rootHtml);
      count++;
    }
  }

  return count;
}
