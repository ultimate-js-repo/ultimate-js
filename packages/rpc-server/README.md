# @ultimate-js/rpc-server

Web-standard RPC request handler for Ultimate.js. Framework-agnostic — works
with any server that gives you a `Request` and expects a `Response`.

## Exports

- `createRpcHandler(options)` — returns
  `(request, functionId?) => Promise<Response>`
- `runWithContext(ctx, fn)` — execute a function with async context
- `getContext()` — retrieve the current request context
- **Types** — `ServerFunction`, `ServerManifest`

## Usage

```ts
import { createRpcHandler } from "@ultimate-js/rpc-server";

const handler = createRpcHandler({ manifest, dev: true });
const response = await handler(request, "abc123");
```
