import { buildTest, clean } from "./helpers.ts";

Deno.test({
  name: "build: swc + native + standalone",
  fn: () =>
    buildTest({ parser: "swc", bundler: "native", output: "standalone" }),
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "build: swc + native + executable",
  fn: () =>
    buildTest({ parser: "swc", bundler: "native", output: "executable" }),
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "cleanup",
  fn: clean,
  sanitizeOps: false,
  sanitizeResources: false,
});
