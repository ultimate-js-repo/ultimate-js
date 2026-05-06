# @ultimate-js/cli

Command-line interface for Ultimate.js.

## Commands

```bash
ultimate create <name>     # Scaffold a new project (interactive)
ultimate dev   [project]   # Start development server
ultimate build [project]   # Production build
ultimate preview [project] # Preview production build
```

## Runtime Options

`ultimate dev` accepts runtime overrides:

```bash
ultimate dev [project] --port 8000 --api-port 8001 --host 0.0.0.0 --rpc-endpoint /_ultimate/rpc
```

Environment variables are also supported:

- `ULTIMATE_DEV_PORT`, `ULTIMATE_PORT`, or `PORT`
- `ULTIMATE_DEV_API_PORT`, `ULTIMATE_API_PORT`, or `API_PORT`
- `ULTIMATE_DEV_HOST`, `ULTIMATE_HOST`, or `HOST`
- `ULTIMATE_DEV_RPC_ENDPOINT`, `ULTIMATE_RPC_ENDPOINT`, `RPC_ENDPOINT`, or
  `ENDPOINT`

`ultimate preview`, standalone server output, and executable server output
accept server runtime overrides:

```bash
ultimate preview [project] --port 8000 --host 0.0.0.0 --rpc-endpoint /_ultimate/rpc
deno run -A dist/server/main.ts --port 8000 --host 0.0.0.0 --rpc-endpoint /_ultimate/rpc
dist/server/server --port 8000 --host 0.0.0.0 --rpc-endpoint /_ultimate/rpc
```

Server output uses the resolved `ultimate.config.ts` values as baked-in
defaults, then applies flags first and environment variables second at startup.
Supported server environment variables are `ULTIMATE_SERVER_PORT`,
`ULTIMATE_PORT`, `PORT`, `ULTIMATE_SERVER_HOST`, `ULTIMATE_HOST`, `HOST`,
`ULTIMATE_SERVER_RPC_ENDPOINT`, `ULTIMATE_RPC_ENDPOINT`, `RPC_ENDPOINT`, and
`ENDPOINT`.

## Interactive Create

`ultimate create` prompts for:

- **Parser** — babel / swc
- **Bundler** — native / vite / rspack
- **Server port**
- **RPC endpoint** — defaults to `/_ultimate/rpc`

Supports arrow keys, Tab, and Enter. Falls back to defaults in non-TTY
environments.
