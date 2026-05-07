import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { UltimateRspackPlugin } from "@ultimate-js/rspack-plugin";

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
