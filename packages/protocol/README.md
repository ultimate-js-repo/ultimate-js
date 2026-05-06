# @ultimate-js/protocol

RPC protocol types and helpers for Ultimate.js.

## Exports

- **Types** — `RemoteFunctionCalling`, `RemoteFunctionSuccess`,
  `RemoteFunctionFailure`, `RemoteFunctionResult`, `RemoteFunctionSseEvent`
- **Helpers** — `createRemoteCall()`, `createSuccessResult()`,
  `createFailureResult()`, `validateRemoteCall()`
- **Error serialization** — `serializeError()`

## Protocol

```
Client → POST /<endpoint>/<functionId>
Body:    { type: "RemoteFunctionCalling", version: 1, args: [...] }

Server → 200
Body:    { type: "RemoteFunctionResult", version: 1, ok: true, value: ... }
```

Streaming transport uses the same POST body with `Accept: text/event-stream`.
Each queued RPC message includes an opaque UUID cursor:

```
Client → POST /<endpoint>/<functionId>
Headers: Accept: text/event-stream

Server → event: message
Data:    { type: "message", cursor: "<uuid>", result: ... }

Server → event: end
Data:    { type: "end", cursor: "<uuid>" }
```

To resume after a dropped connection, clients send the latest cursor in
`Ultimate-Session-Cursor`. If no queued messages remain after that cursor, the
server sends `end`.

Callback arguments are encoded as protocol refs in the request body. When the
server function calls one of those callback arguments, the SSE stream emits a
cursor-bearing `callback` event:

```
Server → event: callback
Data:    { type: "callback", cursor: "<uuid>", callbackId: "...", args: [...] }
```

The client invokes the original callback function with `args` and then continues
waiting for more callback events or the final RPC result message.
