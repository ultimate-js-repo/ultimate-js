# @ultimate-js/rspack-plugin

Rspack adapter for Ultimate.js compiler analysis.

The plugin keeps framework semantics in the bundler-independent
`@ultimate-js/analyzer` / `@ultimate-js/compiler` packages, then runs that
analysis from Rspack's build lifecycle.

## Usage

```ts
import { UltimateRspackPlugin } from "@ultimate-js/rspack-plugin";

export default {
  context: Deno.cwd(),
  plugins: [
    new UltimateRspackPlugin({
      projectRoot: Deno.cwd(),
      parser: "swc",
    }),
  ],
};
```

By default the plugin writes:

- `.ultimate/generated/client-proxies.ts`
- `.ultimate/generated/server-manifest.ts`

Disable generated files when another build step owns them:

```ts
new UltimateRspackPlugin({
  emit: false,
});
```

Or select individual generated files:

```ts
new UltimateRspackPlugin({
  emit: {
    clientProxy: true,
    serverManifest: false,
  },
});
```

## API

- `new UltimateRspackPlugin(options)` — run Ultimate analysis before Rspack
  builds and watch rebuilds.
- `createUltimateRspackPlugin(options)` — factory helper.
- `plugin.analyze(compiler?)` — manually run analysis and return a
  `CompileResult`.
- `plugin.result` — latest `CompileResult`, if analysis has run.

## Scope

This package is the Rspack lifecycle adapter. Function classification, route
scanning, diagnostics, and RPC metadata generation remain in the core Ultimate
packages so native and Rspack builds share the same behavior.
