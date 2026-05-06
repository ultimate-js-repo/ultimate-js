# @ultimate-js/bundler-deno

Build tooling for Ultimate.js. Handles client bundling, server output, source
transformation, and static path generation.

## Bundler Adapters

| Adapter         | Backend        | Config                        |
| --------------- | -------------- | ----------------------------- |
| `DenoBundler`   | `deno bundle`  | `bundler: "native"` (default) |
| `RspackBundler` | `@rspack/core` | `bundler: "rspack"`           |

## Exports

- `bundleClient(projectRoot, distDir, config)` — bundle client JS + generate
  HTML
- `buildServer(projectRoot, distDir, appDir, generatedDir, config)` — build
  server bundle
- `transformAndCopyAppSources(...)` — rewrite server imports for client build
- `generateStaticPaths(routes, distDir)` — pre-generate HTML for
  `generateStaticParams`
- `generateRouteManifestCodeFromTransformed(...)` — route manifest with layouts
- `generateClientEntryCode(rpcBase)` — client entry point
- `DenoBundler` — default bundler adapter
