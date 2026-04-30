# @ultimate-js/core

Shared foundation for the Ultimate.js framework. Zero external dependencies.

## Exports

- **Errors** — `UltimateError`, `BadRequestError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`
- **Serialization** — `serialize()`, `deserialize()` for JSON-safe RPC transport
- **Hash** — `hashId()`, `functionFingerprint()` for stable function IDs
- **Diagnostics** — `Diagnostic`, `formatDiagnostic()`, `addDiagnostic()`, `hasErrors()`
- **Config** — `defineConfig()`, `resolveConfig()`, `loadConfig()`, `UltimateConfig`, `ResolvedConfig`
- **Document** — `DocumentHead`, `renderDocument()` for HTML shell generation
- **Runtime Import** — `runtimeImport()` for dynamic module loading

## Usage

```ts
import { defineConfig, hashId, serialize } from "@ultimate-js/core";
```
