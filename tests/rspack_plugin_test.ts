import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { UltimateRspackPlugin } from "@ultimate-js/rspack-plugin";
import {
  generateClientEntryCode,
  generateClientProxyJs,
} from "../packages/rspack-plugin/generate.ts";

Deno.test("UltimateRspackPlugin analyzes a project without generated files", async () => {
  const projectRoot = await Deno.makeTempDir({ prefix: "ultimate-rspack-" });
  const appDir = join(projectRoot, "app");
  const functionsDir = join(appDir, "functions");

  await Deno.mkdir(functionsDir, { recursive: true });
  await Deno.writeTextFile(
    join(appDir, "page.tsx"),
    `
import { getUser } from "./functions/user.ts";

export default function Page() {
  getUser();
  return null;
}
`,
  );
  await Deno.writeTextFile(
    join(functionsDir, "user.ts"),
    `
export function getUser() {
  return { ok: true };
}
`,
  );

  const plugin = new UltimateRspackPlugin({ projectRoot });
  const result = await plugin.analyze();

  assertEquals(result.serverFunctions.length, 1);
  assertEquals(result.serverFunctions[0].info.name, "getUser");

  try {
    await Deno.stat(join(projectRoot, ".ultimate", "generated"));
    throw new Error("generated directory should not exist");
  } catch (err) {
    assertEquals(err instanceof Deno.errors.NotFound, true);
  }
});

Deno.test("rspack client entry uses dynamic route loaders", () => {
  const code = generateClientEntryCode(
    [{
      id: "route_home",
      file: "/project/app/page.tsx",
      path: "/",
      segments: [],
      layoutFiles: ["/project/app/layout.tsx"],
    }],
    "/_ultimate/rpc",
  );

  assertStringIncludes(code, "load: () => import(");
  assertStringIncludes(code, "layouts: [() => import(");
  assertFalse(code.includes("import * as page"));
  assertFalse(code.includes("import * as layout"));
});

Deno.test("rspack client entry imports bundled CSS", () => {
  const code = generateClientEntryCode([], "/_ultimate/rpc", [
    "/project/.ultimate/rspack/head.css",
  ]);

  assertStringIncludes(code, `import "/project/.ultimate/rspack/head.css";`);
});

Deno.test("rspack client code imports concrete RPC runtime modules", () => {
  const entryCode = generateClientEntryCode([], "/_ultimate/rpc");
  const proxyCode = generateClientProxyJs([]);

  assertStringIncludes(
    entryCode,
    `from "ultimate-rpc-client-config"`,
  );
  assertStringIncludes(
    proxyCode,
    `from "ultimate-rpc-client-remote-call"`,
  );
});
