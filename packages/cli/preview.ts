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

  const app = new Hono();
  const { port, host, endpoint } = config.server;
  const ep = endpoint.replace(/\/+$/, "");

  let serverManifest: ServerManifest = {};
  try {
    const manifestPath = join(
      projectRoot,
      "dist",
      "server",
      ".ultimate",
      "generated",
      "server-manifest.ts",
    );
    const manifestModule = await runtimeImport(manifestPath);
    serverManifest = manifestModule.serverManifest as ServerManifest;
  } catch {
    console.log("  Warning: Could not load server manifest");
  }

  const rpcHandler = createRpcHandler({ manifest: serverManifest, dev: false });

  app.post(`${ep}/:functionId`, async (c: HonoContext) => {
    return await rpcHandler(c.req.raw, c.req.param("functionId"));
  });

  app.options(`${ep}/:functionId`, async (c: HonoContext) => {
    return await rpcHandler(c.req.raw, c.req.param("functionId"));
  });

  const clientDir = join(projectRoot, "dist", "client");
  const serveClient = createStaticHandler(clientDir);

  app.get("*", async (c: HonoContext) => {
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
    `\nPreview server running at http://${
      host === "0.0.0.0" ? "localhost" : host
    }:${port}`,
  );
  Deno.serve({ port, hostname: host }, app.fetch);
}
