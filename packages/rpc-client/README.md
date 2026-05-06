# @ultimate-js/rpc-client

Browser-side RPC client for Ultimate.js. Calls server functions transparently.

## Exports

- `setRemoteEndpoint(url)` — set the RPC base URL (path or full URL)
- `getRemoteEndpoint()` — get the current RPC base URL
- `remoteFunctionCall(functionId, args)` — POST to `<base>/<functionId>`

## Usage

```ts
import { remoteFunctionCall, setRemoteEndpoint } from "@ultimate-js/rpc-client";

setRemoteEndpoint("/_ultimate/rpc");
const user = await remoteFunctionCall<User>("abc123", ["1"]);
```

> In normal usage, the compiler generates proxy functions that call
> `remoteFunctionCall` automatically. You don't call it directly.

## Retry and resume

`remoteFunctionCall` uses the SSE RPC transport and retries transient network
failures by default. It tracks the latest UUID cursor received from the server
and sends it back as `Ultimate-Session-Cursor` when reconnecting, so the server
can resume after the last delivered message.

Application errors returned by server functions are not retried; they are
re-thrown on the client.

Callback arguments are supported over the SSE transport. If a client calls a
server function with a callback argument, the callback is encoded into the RPC
protocol and invoked on the client whenever the server calls it:

```ts
await streamDemoText((chunk) => {
  console.log(chunk);
});
```
