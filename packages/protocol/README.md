# @ultimate-js/protocol

RPC protocol types and helpers for Ultimate.js.

## Exports

- **Types** — `RemoteFunctionCalling`, `RemoteFunctionSuccess`, `RemoteFunctionFailure`, `RemoteFunctionResult`
- **Helpers** — `createRemoteCall()`, `createSuccessResult()`, `createFailureResult()`, `validateRemoteCall()`
- **Error serialization** — `serializeError()`

## Protocol

```
Client → POST /<endpoint>/<functionId>
Body:    { type: "RemoteFunctionCalling", version: 1, args: [...] }

Server → 200
Body:    { type: "RemoteFunctionResult", version: 1, ok: true, value: ... }
```
