import { buildTest, clean } from "./helpers.ts";

Deno.test({
  name: "build: swc + rspack + standalone",
  fn: () =>
    buildTest({ parser: "swc", bundler: "rspack", output: "standalone" }),
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "build: swc + rspack + executable",
  fn: () =>
    buildTest({ parser: "swc", bundler: "rspack", output: "executable" }),
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "cleanup",
  fn: clean,
  sanitizeOps: false,
  sanitizeResources: false,
});
