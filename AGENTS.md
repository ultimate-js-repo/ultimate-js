# Repository Guidelines

## Project Structure & Module Organization

This is a Deno workspace. Package source lives under `packages/*`, with each
package exposing its own `deno.json` and `mod.ts` entry point where applicable.
Core areas include `packages/cli`, `packages/core`, `packages/compiler`,
`packages/analyzer`, `packages/generator`, `packages/bundler-deno`,
`packages/rspack-plugin`, `packages/dev-server`, and runtime helpers such as
`packages/react` and `packages/rpc-server`.

The integration app is in `examples/showcase`. Tests live in `tests/`, with
shared helpers in `tests/helpers.ts`. Generated output such as `.ultimate/`,
`dist/`, and local `logs/` should not be treated as source.

## Build, Test, and Development Commands

- `deno task dev`: run the showcase app through the local CLI.
- `deno task build`: build `examples/showcase`.
- `deno task preview`: serve the built showcase output.
- `deno task create`: run the local project generator.
- `deno task test`: run repository tests with required permissions.
- `deno task fmt`: format all Deno-managed files.
- `deno task lint`: lint the workspace.

For targeted CLI work, use `deno run -A packages/cli/mod.ts <command>`, for
example `deno run -A packages/cli/mod.ts build examples/showcase`.

## Coding Style & Naming Conventions

Use TypeScript and Deno conventions. Format with `deno fmt`; do not hand-format
around the formatter. Prefer explicit exports from package entry points and keep
package-local helpers close to their feature area.

Use kebab-case for file names such as `build-server.ts` and descriptive
camelCase for functions and variables. Keep generated files clearly marked and
avoid editing `.ultimate/` or `dist/` output directly.

## Testing Guidelines

Tests use Deno’s built-in test runner plus `@std/assert`. Test files should end
in `_test.ts`, matching the existing pattern such as
`tests/build_babel_native_test.ts`. Add or update tests when changing compiler,
bundler, CLI, routing, or RPC behavior.

When validating build artifacts, test all supported parser/bundler combinations:
`babel/native`, `swc/native`, `babel/rspack`, and `swc/rspack`. `vite` is listed
in config types but intentionally fails with
`bundler "vite" is not implemented yet` until a real adapter exists. For
standalone output, verify `dist/client/index.html` and
`dist/client/assets/client.js` exist, `dist/server/client` is not created, and
at least one RPC endpoint returns `ok: true`.

Before committing, run:

```sh
deno fmt --check
deno lint
deno test -A --no-check tests/
```

## Architecture & Build Notes

`ultimate-js-empty` is the independent project template repository. The CLI
`create` command fetches template files from
`https://raw.githubusercontent.com/ultimate-js-repo/ultimate-js-empty/main`; do
not reintroduce an `examples/template` package or a `deno.json.tmpl` lookup.

Client and server build output are separate under `dist/client` and
`dist/server`. Server output must not copy or serve client static files; use
`dist/client` with `preview` or an external static file server for browser
assets.

When loading user project modules such as `app/layout.tsx`, use the user
project’s own `deno.json` import map. Do not dynamically import these modules
directly from the CLI process if that would bypass the project config.

The native bundler uses `deno bundle` with `--config deno.json`. The Rspack
adapter must preserve Rspack’s value: do not pre-bundle with Deno. It should use
Deno only to install npm dependencies and resolve the Deno module graph, then
vendor/rewrite JSR or remote source imports so Rspack can compile the original
TS/TSX entry graph directly.

`packages/rspack-plugin` is the Rspack lifecycle adapter for Ultimate compiler
analysis. Keep framework semantics such as route scanning, function
classification, diagnostics, and RPC metadata in the bundler-independent
`packages/analyzer`, `packages/compiler`, and `packages/generator` packages. The
Rspack plugin should call those shared packages, surface diagnostics through
Rspack, and emit or connect generated assets rather than reimplementing analyzer
logic in Rspack-specific code.

For `bundler: "rspack"`, do not call `compileProject()` as a standalone parser
pre-scan. Rspack builds are orchestrated through `packages/rspack-plugin`, which
analyzes sources with the shared analyzer APIs, generates virtual client/server
entries, and bundles both client and server output without relying on
`.ultimate/generated/*.ts`. Native builds still use the existing compiler and
generated-file flow.

## Commit & Pull Request Guidelines

Git history uses concise gitmoji-prefixed commit messages, for example
`🔧 fix build artifact bundling`, `✅ fix lint and formatting`, or
`🔖 bump package versions`. Keep commits focused on one logical change.

Pull requests should include a short summary, tests performed, and behavior or
compatibility notes. Link related issues when available. For UI-facing example
changes, include screenshots or a brief verification note.

## Security & Configuration Tips

Do not commit secrets, local logs, or generated build artifacts. Keep Deno
import maps and package versions intentional. When changing versions, update the
relevant package `deno.json` and verify publish workflows still target the right
packages.

The GitHub Actions JSR publish workflow runs only when `packages/*/deno.json`
changes on `main`; when it runs, it publishes from the repository root with
`npx jsr publish`. Avoid unrelated version bumps because any matching package
config change triggers a root workspace publish.

## Agent-Specific Instructions

During an active session, update this `AGENTS.md` immediately when workflow
rules, conventions, or recurring instructions change. Treat it as living
guidance, not stale background documentation. The file may grow beyond the
initial concise target as the project gains structure, conventions, or recurring
operational knowledge. Any information written to memory for this repository
must also be reflected here so future contributors and agents share the same
source of truth.

When implementation, verification, or commit preparation reveals a repeatable
project rule, testing expectation, package boundary, or operational gotcha,
update `AGENTS.md` in the same session before finalizing or committing the
related work. This includes lessons learned while using repo skills such as
logical commit splitting, temporary integration-app validation, or local package
linking.

CLI runtime overrides follow a consistent precedence order: explicit flags, then
environment variables, then resolved `ultimate.config.ts` defaults. `dev`
supports `--port`, `--api-port`, `--host`, and `--rpc-endpoint`; server runtime
entry points such as `preview`, `dist/server/main.ts`, and compiled executable
output support `--port`, `--host`, and `--rpc-endpoint`. The `build` command
also supports `--parser` and `--bundler`, with environment fallbacks
`ULTIMATE_BUILD_PARSER` / `ULTIMATE_PARSER` and `ULTIMATE_BUILD_BUNDLER` /
`ULTIMATE_BUNDLER`. The resolved config is still baked into server output as the
default runtime options.

RPC streaming resume uses `Ultimate-Session-Cursor`; do not reintroduce
`Ultimate-Session-Id`. SSE cursor values are server-generated UUIDs, opaque to
clients, and resume queues are currently in-memory and single-process. Client
callback arguments are encoded into the RPC protocol and invoked from
cursor-bearing SSE `callback` events.
