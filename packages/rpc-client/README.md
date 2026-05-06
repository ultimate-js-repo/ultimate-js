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
