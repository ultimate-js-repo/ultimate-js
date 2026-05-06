# @ultimate-js/generator

Code generation for Ultimate.js. Produces client proxies, server manifests, and
source transforms.

## Exports

- `generateClientProxyCode(serverFunctions)` — generate RPC proxy wrappers
- `generateServerManifestCode(serverFunctions, outDir)` — generate function
  registry
- `transformClientSource(source, ...)` — rewrite server imports to proxy imports
- `getClientFiles(analyses)` — determine which files belong in the client bundle
