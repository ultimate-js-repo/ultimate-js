import { join, relative } from "@std/path";
import type { ResolvedConfig } from "@ultimate-js/core";
import { runtimeImport } from "@ultimate-js/core";
import { compileProject } from "@ultimate-js/compiler";
import {
  generateClientProxyCode,
  generateServerManifestCode,
} from "@ultimate-js/generator";
import {
  bundleClient,
  ensureDir,
  generateClientEntryCode,
  generateRouteManifestCodeFromTransformed,
  removeDir,
  transformAndCopyAppSources,
  writeTextFile,
} from "@ultimate-js/bundler-deno";
import type { ServerManifest } from "@ultimate-js/rpc-server";

interface HonoContext {
  req: { raw: Request; param(name: string): string; url: string; path: string };
}

interface HonoNext {
  (): Promise<void>;
}

export async function startDevServer(
  projectRoot: string,
  config: ResolvedConfig,
): Promise<void> {
  const appDir = join(projectRoot, "app");
  const generatedDir = join(projectRoot, ".ultimate", "generated");
  const transformedDir = join(projectRoot, ".ultimate", "transformed-app");
  const distDir = join(projectRoot, "dist");

  const { port: staticPort, apiPort } = config.dev;
  const endpoint = config.server.endpoint.replace(/\/+$/, "");

  console.log("Starting Ultimate.js dev server...");
  console.log(`  Project: ${projectRoot}`);

  // ── Initial build ──
  console.log("\n  Building client...");
  await fullBuild(
    projectRoot,
    appDir,
    generatedDir,
    transformedDir,
    distDir,
    config,
  );
  console.log("  Build complete.");

  // ── Load server manifest for RPC ──
  const { Hono } = await import("hono");
  const { createRpcHandler } = await import("@ultimate-js/rpc-server");
  const { createStaticHandler } = await import("@ultimate-js/hono");

  let serverManifest: ServerManifest = {};
  try {
    const manifestModule = await runtimeImport(
      join(projectRoot, ".ultimate", "generated", "server-manifest.ts"),
    );
    serverManifest = manifestModule.serverManifest as ServerManifest;
  } catch {
    console.log("  Warning: Could not load server manifest, RPC may not work");
  }

  let rpcHandler = createRpcHandler({ manifest: serverManifest, dev: true });

  // ── File-watching rebuild (throttled) ──
  let lastBuild = Date.now();
  let building = false;

  async function maybeRebuild(): Promise<void> {
    const now = Date.now();
    if (building || now - lastBuild < 2000) return;

    let changed = false;
    try {
      const { scanSourceFiles } = await import("@ultimate-js/analyzer");
      const files = await scanSourceFiles(appDir);
      for (const f of files) {
        const stat = await Deno.stat(f);
        if (stat.mtime && stat.mtime.getTime() > lastBuild) {
          changed = true;
          break;
        }
      }
    } catch { /* ignore */ }

    if (!changed) return;

    building = true;
    console.log("\n  File change detected, rebuilding...");
    try {
      await fullBuild(
        projectRoot,
        appDir,
        generatedDir,
        transformedDir,
        distDir,
        config,
      );

      const manifestPath =
        join(projectRoot, ".ultimate", "generated", "server-manifest.ts") +
        `?t=${Date.now()}`;
      const mod = await runtimeImport(manifestPath);
      serverManifest = mod.serverManifest as ServerManifest;
      rpcHandler = createRpcHandler({ manifest: serverManifest, dev: true });

      console.log("  Rebuild complete.");
    } catch (err) {
      console.log(`  Rebuild failed: ${err}`);
    }
    lastBuild = Date.now();
    building = false;
  }

  // ── API server ──

  const api = new Hono();

  api.use("*", async (_c: HonoContext, next: HonoNext) => {
    await maybeRebuild();
    await next();
  });

  api.post(`${endpoint}/:functionId`, async (c: HonoContext) => {
    return await rpcHandler(c.req.raw, c.req.param("functionId"));
  });

  // ── Static server ──

  const app = new Hono();
  const clientDir = join(distDir, "client");
  const serveClient = createStaticHandler(clientDir);
  const publicDir = join(projectRoot, "public");
  const servePublic = createStaticHandler(publicDir);

  app.use("*", async (_c: HonoContext, next: HonoNext) => {
    await maybeRebuild();
    await next();
  });

  app.post(`${endpoint}/:functionId`, async (c: HonoContext) => {
    return await rpcHandler(c.req.raw, c.req.param("functionId"));
  });

  app.get("*", async (c: HonoContext) => {
    const pathname = new URL(c.req.raw.url).pathname;

    const clientResponse = await serveClient(c.req.raw, pathname);
    if (clientResponse) return clientResponse;

    const publicResponse = await servePublic(c.req.raw, pathname);
    if (publicResponse) return publicResponse;

    try {
      const html = await Deno.readTextFile(join(clientDir, "index.html"));
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      return new Response("Not found — run build first", { status: 404 });
    }
  });

  // ── Start ──
  console.log(`\n  Static : http://localhost:${staticPort}`);
  console.log(`  API    : http://localhost:${apiPort}`);

  Deno.serve({ port: apiPort, onListen() {} }, api.fetch);
  Deno.serve({ port: staticPort }, app.fetch);
}

async function fullBuild(
  projectRoot: string,
  appDir: string,
  generatedDir: string,
  transformedDir: string,
  distDir: string,
  config: ResolvedConfig,
): Promise<void> {
  await removeDir(join(projectRoot, ".ultimate"));
  await ensureDir(generatedDir);
  await ensureDir(transformedDir);
  await ensureDir(join(distDir, "client", "assets"));

  const result = await compileProject({ projectRoot, config });

  const serverManifest = generateServerManifestCode(
    result.serverFunctions,
    generatedDir,
  );
  await writeTextFile(join(generatedDir, "server-manifest.ts"), serverManifest);

  const proxyFilePath = join(generatedDir, "client-proxies.ts");
  const clientProxy = generateClientProxyCode(result.serverFunctions);
  await writeTextFile(proxyFilePath, clientProxy);

  await transformAndCopyAppSources(
    appDir,
    transformedDir,
    result.analyses,
    result.serverFunctionFiles,
    proxyFilePath,
  );

  const transformedRoutes = result.routes.map((r) => ({
    ...r,
    file: join(transformedDir, relative(appDir, r.file)),
    layoutFiles: r.layoutFiles.map((lf) =>
      join(transformedDir, relative(appDir, lf))
    ),
  }));
  const routeManifest = generateRouteManifestCodeFromTransformed(
    transformedRoutes,
    generatedDir,
  );
  await writeTextFile(join(generatedDir, "route-manifest.ts"), routeManifest);

  const clientEntry = generateClientEntryCode(config.client.rpcBase);
  await writeTextFile(
    join(projectRoot, ".ultimate", "client-entry.tsx"),
    clientEntry,
  );

  await bundleClient(projectRoot, distDir, config);
}
