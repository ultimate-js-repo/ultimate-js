import type { ServerManifest } from "@ultimate-js/rpc-server";
import { createRpcHandler } from "@ultimate-js/rpc-server";

/** Minimal Hono-compatible app interface (avoids depending on Hono types). */
interface HonoLike {
  post(
    path: string,
    handler: (c: HonoContext) => Promise<Response> | Response,
  ): void;
}

interface HonoContext {
  req: { raw: Request; param(name: string): string };
}

export interface MountRpcOptions {
  path?: string;
  manifest: ServerManifest;
  dev?: boolean;
  createContext?: (request: Request) => unknown | Promise<unknown>;
}

/**
 * Mount Ultimate.js RPC routes on a Hono app.
 *
 * Registers POST <path>/:functionId so each server function
 * gets its own endpoint, e.g. POST /_ultimate/rpc/cb9ceb43.
 */
export function mountUltimateRpc(
  app: HonoLike,
  options: MountRpcOptions,
): void {
  const { path = "/_ultimate/rpc", manifest, dev, createContext } = options;
  const handler = createRpcHandler({ manifest, dev, createContext });
  const prefix = path.replace(/\/+$/, "");

  app.post(`${prefix}/:functionId`, async (c: HonoContext) => {
    const functionId = c.req.param("functionId");
    return await handler(c.req.raw, functionId);
  });
}
