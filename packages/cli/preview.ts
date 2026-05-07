import { join } from "@std/path";
import type { ResolvedConfig } from "@ultimate-js/core";
import { runtimeImport } from "@ultimate-js/core";
import type { ServerManifest } from "@ultimate-js/rpc-server";

interface HonoContext {
  req: { raw: Request; param(name: string): string; url: string };
}

export async function preview(
  projectRoot: string,
  config: ResolvedConfig,
): Promise<void> {
  console.log("Starting Ultimate.js preview server...");
  console.log(`  Project: ${projectRoot}`);

  const { Hono } = await import("hono");
  const { createRpcHandler } = await import("@ultimate-js/rpc-server");
  const { createStaticHandler } = await import("@ultimate-js/hono");

  const clientApp = new Hono();
  const apiApp = new Hono();
  const { port, host, endpoint } = config.server;
  const apiPort = config.dev.apiPort;
  const ep = endpoint.replace(/\/+$/, "");

  const serverManifest = await loadServerManifest(projectRoot, config);

  const rpcHandler = createRpcHandler({ manifest: serverManifest, dev: false });

  apiApp.post(`${ep}/:functionId`, async (c: HonoContext) => {
    return await rpcHandler(c.req.raw, c.req.param("functionId"));
  });

  apiApp.options(`${ep}/:functionId`, async (c: HonoContext) => {
    return await rpcHandler(c.req.raw, c.req.param("functionId"));
  });

  clientApp.post(`${ep}/:functionId`, async (c: HonoContext) => {
    return await rpcHandler(c.req.raw, c.req.param("functionId"));
  });

  clientApp.options(`${ep}/:functionId`, async (c: HonoContext) => {
    return await rpcHandler(c.req.raw, c.req.param("functionId"));
  });

  const clientDir = join(projectRoot, "dist", "client");
  const serveClient = createStaticHandler(clientDir);

  clientApp.get("*", async (c: HonoContext) => {
    const pathname = new URL(c.req.raw.url).pathname;
    const response = await serveClient(c.req.raw, pathname);
    if (response) return response;

    const indexPath = join(clientDir, "index.html");
    try {
      const content = await Deno.readTextFile(indexPath);
      return new Response(content, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });

  console.log(
    `\nPreview client running at http://${
      host === "0.0.0.0" ? "localhost" : host
    }:${port}`,
  );
  console.log(
    `Preview API running at http://${
      host === "0.0.0.0" ? "localhost" : host
    }:${apiPort}`,
  );
  Deno.serve({ port: apiPort, hostname: host, onListen() {} }, apiApp.fetch);
  Deno.serve({ port, hostname: host }, clientApp.fetch);
}

async function loadServerManifest(
  projectRoot: string,
  config: ResolvedConfig,
): Promise<ServerManifest> {
  const manifestPaths = config.bundler === "rspack"
    ? [
      join(projectRoot, "dist", "server", "main.ts"),
      join(
        projectRoot,
        "dist",
        "server",
        ".ultimate",
        "generated",
        "server-manifest.ts",
      ),
    ]
    : [
      join(
        projectRoot,
        "dist",
        "server",
        ".ultimate",
        "generated",
        "server-manifest.ts",
      ),
      join(projectRoot, "dist", "server", "main.ts"),
    ];

  for (const manifestPath of manifestPaths) {
    try {
      const manifestModule = await runtimeImport(manifestPath);
      if (manifestModule.serverManifest) {
        return manifestModule.serverManifest as ServerManifest;
      }
    } catch {
      // Try the next production artifact shape.
    }
  }

  console.log("  Warning: Could not load server manifest");
  return {};
}
