import { defineConfig } from "@ultimate-js/core";
import type { UltimateConfig } from "@ultimate-js/core";

const config: UltimateConfig = defineConfig({
  server: {
    port: 8000,
    endpoint: "/_ultimate/rpc",
  },
  dev: {
    port: 8000,
    apiPort: 8001,
  },
});

export default config;
