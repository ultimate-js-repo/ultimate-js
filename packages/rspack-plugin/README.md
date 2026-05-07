# @ultimate-js/rspack-plugin

Rspack orchestration for Ultimate.js analysis and bundling.

The plugin keeps framework semantics in the bundler-independent
`@ultimate-js/analyzer` package, then drives Rspack client and server builds
without using the standalone `compileProject()` pre-scan.

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

## API

- `new UltimateRspackPlugin(options)` — run Ultimate analysis before Rspack
  builds and watch rebuilds.
- `createUltimateRspackPlugin(options)` — factory helper.
- `plugin.analyze(compiler?)` — manually run analysis and return a
  `RspackCompileResult`.
- `plugin.result` — latest `RspackCompileResult`, if analysis has run.
- `buildRspackProject(options)` — analyze sources, generate virtual client and
  server entries, bundle both outputs, and return a `RspackBuildResult`.

## Scope

Rspack builds do not write or depend on `.ultimate/generated/*.ts`. Client
proxies, route manifests, and server manifests are generated as virtual source
inside the Rspack build. Native builds continue to use the compiler and physical
generated-file flow.
