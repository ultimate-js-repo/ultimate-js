import { defineConfig } from "@ultimate-js/core";

export default defineConfig({
  server: {
    port: 8000,
    endpoint: "/_ultimate/rpc",
  },
  dev: {
    port: 8000,
    apiPort: 8001,
  },
});
