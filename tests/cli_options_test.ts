import { assertEquals } from "@std/assert";
import { resolveConfig } from "@ultimate-js/core";
import {
  applyBuildOverrides,
  applyDevOverrides,
  applyServerOverrides,
  parseCommandOptions,
} from "../packages/cli/options.ts";

function env(values: Record<string, string>): Deno.Env {
  return {
    get(key: string) {
      return values[key];
    },
  } as Deno.Env;
}

Deno.test("CLI options parse project separately from flags", () => {
  const options = parseCommandOptions([
    "examples/showcase",
    "--port",
    "9400",
    "--host=127.0.0.1",
  ]);

  assertEquals(options.project, "examples/showcase");
  assertEquals(options.rest, ["--port", "9400", "--host=127.0.0.1"]);
});

Deno.test("dev runtime overrides prefer flags over environment", () => {
  const config = applyDevOverrides(
    resolveConfig(),
    ["--port", "9400", "--api-port=9401", "--rpc-endpoint", "/api/rpc"],
    env({
      ULTIMATE_DEV_PORT: "9500",
      ULTIMATE_DEV_API_PORT: "9501",
      ULTIMATE_DEV_HOST: "127.0.0.1",
      ULTIMATE_RPC_ENDPOINT: "/env/rpc",
    }),
  );

  assertEquals(config.dev.port, 9400);
  assertEquals(config.dev.apiPort, 9401);
  assertEquals(config.dev.host, "127.0.0.1");
  assertEquals(config.server.endpoint, "/api/rpc");
  assertEquals(config.client.rpcBase, "/api/rpc");
});

Deno.test("server runtime overrides support host, port, and endpoint", () => {
  const config = applyServerOverrides(
    resolveConfig({
      server: {
        port: 8100,
        host: "0.0.0.0",
        endpoint: "/_ultimate/rpc",
      },
      client: { apiUrl: "https://example.com" },
    }),
    ["--port=9700", "--host", "127.0.0.1"],
    env({
      ULTIMATE_SERVER_PORT: "9800",
      ULTIMATE_SERVER_HOST: "0.0.0.0",
      ULTIMATE_SERVER_RPC_ENDPOINT: "rpc",
    }),
  );

  assertEquals(config.server.port, 9700);
  assertEquals(config.server.host, "127.0.0.1");
  assertEquals(config.server.endpoint, "/rpc");
  assertEquals(config.client.rpcBase, "https://example.com/rpc");
});

Deno.test("build overrides support parser and bundler with flag priority", () => {
  const config = applyBuildOverrides(
    resolveConfig({
      bundler: "native",
      parser: "babel",
      server: { port: 8100 },
    }),
    ["--bundler", "rspack", "--parser=swc", "--port", "9700"],
    env({
      ULTIMATE_BUILD_BUNDLER: "vite",
      ULTIMATE_BUILD_PARSER: "babel",
      ULTIMATE_SERVER_PORT: "9800",
    }),
  );

  assertEquals(config.bundler, "rspack");
  assertEquals(config.parser, "swc");
  assertEquals(config.server.port, 9700);
});

Deno.test("build overrides read parser and bundler from environment", () => {
  const config = applyBuildOverrides(
    resolveConfig({ bundler: "native", parser: "babel" }),
    [],
    env({
      ULTIMATE_BUILD_BUNDLER: "rspack",
      ULTIMATE_BUILD_PARSER: "swc",
    }),
  );

  assertEquals(config.bundler, "rspack");
  assertEquals(config.parser, "swc");
});

Deno.test("build overrides reject invalid parser and bundler", () => {
  try {
    applyBuildOverrides(resolveConfig(), ["--bundler", "webpack"], env({}));
    throw new Error("expected invalid bundler to throw");
  } catch (err) {
    assertEquals(
      (err as Error).message,
      "--bundler must be one of: native, vite, rspack",
    );
  }

  try {
    applyBuildOverrides(resolveConfig(), ["--parser", "typescript"], env({}));
    throw new Error("expected invalid parser to throw");
  } catch (err) {
    assertEquals((err as Error).message, "--parser must be one of: babel, swc");
  }
});
