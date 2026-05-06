# Ultimate.js

One codebase, two targets. Build full-stack apps with static frontend +
independent API backend, using the same development experience as writing a
single-machine application.

## Quick Start

```bash
deno run -A jsr:@ultimate-js/cli create my-app
cd my-app
deno task dev
```

## Features

- **Transparent RPC** — import server functions in client code. The compiler
  replaces them with type-safe network calls.
- **File-based routing** — Next.js App Router convention. `app/page.tsx` = `/`,
  `app/users/[id]/page.tsx` = `/users/:id`.
- **Nested layouts** — `app/layout.tsx` wraps all routes. Add `layout.tsx` at
  any level for nested layouts.
- **Smart code classification** — functions are classified as client, server, or
  shared at build time. Server code never reaches the browser.

## Project Structure

```
my-app/
  ultimate.config.ts       # Framework configuration
  app/
    layout.tsx             # Root layout (HTML head + wrapper)
    page.tsx               # / route
    about/
      page.tsx             # /about route
    users/
      [id]/
        page.tsx           # /users/:id route
    components/
      Counter.tsx          # "use client" component
    functions/
      user.ts              # Server function (auto-RPC)
```

## Configuration

```ts
// ultimate.config.ts
import { defineConfig } from "@ultimate-js/core";

export default defineConfig({
  parser: "babel", // "babel" | "swc"
  bundler: "native", // "native" | "rspack"
  server: {
    port: 8000,
    endpoint: "/_ultimate/rpc",
    output: "standalone", // "standalone" | "executable"
  },
  client: {
    apiUrl: "http://localhost:8001", // cross-origin API
  },
});
```

## Packages

| Package                     | Description                                   |
| --------------------------- | --------------------------------------------- |
| `@ultimate-js/core`         | Types, errors, serialization, config, hashing |
| `@ultimate-js/protocol`     | RPC protocol types and validation             |
| `@ultimate-js/rpc-client`   | Browser-side RPC client                       |
| `@ultimate-js/rpc-server`   | Web-standard RPC request handler              |
| `@ultimate-js/hono`         | Hono adapter for RPC + static serving         |
| `@ultimate-js/router`       | File-based route scanning and matching        |
| `@ultimate-js/react`        | React Router, Link, hooks                     |
| `@ultimate-js/analyzer`     | AST analysis with Babel/SWC adapters          |
| `@ultimate-js/generator`    | Code generation (proxies, manifests)          |
| `@ultimate-js/compiler`     | Compilation orchestrator                      |
| `@ultimate-js/bundler-deno` | Client/server build with Deno/rspack          |
| `@ultimate-js/dev-server`   | Development server with hot rebuild           |
| `@ultimate-js/cli`          | CLI (`create`, `dev`, `build`, `preview`)     |

## License

MIT
