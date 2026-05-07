import { buildTest, clean } from "./helpers.ts";

Deno.test({
  name: "build: babel + rspack + standalone",
  fn: () =>
    buildTest({ parser: "babel", bundler: "rspack", output: "standalone" }),
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "build: babel + rspack + executable",
  fn: () =>
    buildTest({ parser: "babel", bundler: "rspack", output: "executable" }),
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "cleanup",
  fn: clean,
  sanitizeOps: false,
  sanitizeResources: false,
});
