# @ultimate-js/hono

Hono adapter for Ultimate.js. Mounts RPC routes and serves static files.

## Exports

- `mountUltimateRpc(app, options)` — registers `POST <path>/:functionId` on a Hono app
- `createStaticHandler(rootDir)` — static file serving with MIME detection
- `serveStaticFile(path)` — serve a single file

## Usage

```ts
import { Hono } from "hono";
import { mountUltimateRpc } from "@ultimate-js/hono";

const app = new Hono();
mountUltimateRpc(app, { manifest, path: "/_ultimate/rpc" });
```
