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

## SSE resume

Requests with `Accept: text/event-stream` use the streaming RPC transport. The
handler stores emitted RPC messages in an in-memory queue, assigns each message
a UUID cursor, and emits `message` events followed by an `end` event.

Clients can reconnect with `Ultimate-Session-Cursor: <uuid>` to resume after the
last delivered message. If there are no later messages, the handler immediately
returns an `end` event. Queues are retained briefly for reconnects and are not
shared across server processes.

When a client passes a callback function as an argument, the request body
carries a protocol callback ref. The handler revives that ref into a server-side
function; each server call to it queues a cursor-bearing SSE `callback` event
for the browser to invoke.
