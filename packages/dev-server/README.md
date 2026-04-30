# @ultimate-js/dev-server

Development server for Ultimate.js. Full client build on startup, auto-rebuild on file changes, dual-port architecture.

## Exports

- `startDevServer(projectRoot, config)` — start the dev server

## Architecture

```
Port 8000 (static)  — serves built client assets + SPA fallback + RPC
Port 8001 (api)     — dedicated RPC endpoint + file-watch rebuild
```

Both ports are configurable via `ultimate.config.ts`:

```ts
export default defineConfig({
  dev: { port: 8000, apiPort: 8001 },
});
```
