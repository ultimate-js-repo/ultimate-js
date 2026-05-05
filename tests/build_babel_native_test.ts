import { buildTest, clean } from "./helpers.ts";

Deno.test({
  name: "build: babel + native + standalone",
  fn: () =>
    buildTest({ parser: "babel", bundler: "native", output: "standalone" }),
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "build: babel + native + executable",
  fn: () =>
    buildTest({ parser: "babel", bundler: "native", output: "executable" }),
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "cleanup",
  fn: clean,
  sanitizeOps: false,
  sanitizeResources: false,
});
