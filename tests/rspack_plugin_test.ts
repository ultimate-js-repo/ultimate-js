import { assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { UltimateRspackPlugin } from "@ultimate-js/rspack-plugin";

Deno.test("UltimateRspackPlugin analyzes a project and emits RPC assets", async () => {
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

  const generatedDir = join(projectRoot, ".ultimate", "generated");
  const proxy = await Deno.readTextFile(
    join(generatedDir, "client-proxies.ts"),
  );
  const manifest = await Deno.readTextFile(
    join(generatedDir, "server-manifest.ts"),
  );

  assertStringIncludes(proxy, "export function getUser");
  assertStringIncludes(manifest, "getUser");
  assertStringIncludes(manifest, "serverManifest");
  assertStringIncludes(result.serverFunctions[0].info.name, "getUser");
});
