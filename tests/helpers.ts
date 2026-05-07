import { assertEquals } from "@std/assert";
import { join } from "@std/path";

export const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
export const SHOWCASE = join(ROOT, "examples/showcase");
export const CLI = join(ROOT, "packages/cli/mod.ts");

export async function writeConfig(opts: {
  parser?: string;
  bundler?: string;
  output?: string;
  port?: number;
}): Promise<void> {
  const lines: string[] = [];
  lines.push(`import { defineConfig } from "@ultimate-js/core";`);
  lines.push(`import type { UltimateConfig } from "@ultimate-js/core";`);
  lines.push(``);
  lines.push(`const config: UltimateConfig = defineConfig({`);
  if (opts.parser) lines.push(`  parser: "${opts.parser}",`);
  if (opts.bundler) lines.push(`  bundler: "${opts.bundler}",`);
  lines.push(`  server: {`);
  lines.push(`    port: ${opts.port ?? 9000},`);
  lines.push(`    endpoint: "/_ultimate/rpc",`);
  if (opts.output) lines.push(`    output: "${opts.output}",`);
  lines.push(`  },`);
  lines.push(
    `  dev: { port: ${opts.port ?? 9000}, apiPort: ${
      (opts.port ?? 9000) + 1
    } },`,
  );
  lines.push(`});`);
  lines.push(`export default config;`);
  lines.push(``);
  await Deno.writeTextFile(
    join(SHOWCASE, "ultimate.config.ts"),
    lines.join("\n"),
  );
}

export async function clean(): Promise<void> {
  for (const dir of [".ultimate", "dist"]) {
    try {
      await Deno.remove(join(SHOWCASE, dir), { recursive: true });
    } catch { /* ok */ }
  }
  // Restore original config
  await Deno.writeTextFile(
    join(SHOWCASE, "ultimate.config.ts"),
    `import { defineConfig } from "@ultimate-js/core";\n\nexport default defineConfig({\n  server: {\n    port: 8000,\n    endpoint: "/_ultimate/rpc",\n  },\n  dev: {\n    port: 8000,\n    apiPort: 8001,\n  },\n});\n`,
  );
}

export async function buildTest(opts: {
  parser: string;
  bundler: string;
  output: string;
}): Promise<void> {
  await clean();
  await writeConfig({
    parser: opts.parser,
    bundler: opts.bundler,
    output: opts.output,
    port: 9100,
  });

  const result = await new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", CLI, "build", SHOWCASE],
    cwd: ROOT,
    stdout: "piped",
    stderr: "piped",
  }).output();

  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  assertEquals(result.code, 0, `Build failed:\n${stdout}\n${stderr}`);

  const clientJs = join(SHOWCASE, "dist/client/assets/client.js");
  const clientHtml = join(SHOWCASE, "dist/client/index.html");
  const serverMain = join(SHOWCASE, "dist/server/main.ts");
  const serverClientDir = join(SHOWCASE, "dist/server/client");

  assertEquals((await Deno.stat(clientJs)).isFile, true, "client.js missing");
  assertEquals(
    (await Deno.stat(clientHtml)).isFile,
    true,
    "index.html missing",
  );
  assertEquals((await Deno.stat(serverMain)).isFile, true, "main.ts missing");
  try {
    await Deno.stat(serverClientDir);
    throw new Error("dist/server/client should not exist");
  } catch (err) {
    assertEquals(err instanceof Deno.errors.NotFound, true);
  }

  if (opts.bundler === "rspack") {
    try {
      await Deno.stat(join(SHOWCASE, ".ultimate", "generated"));
      throw new Error(".ultimate/generated should not exist for rspack builds");
    } catch (err) {
      assertEquals(err instanceof Deno.errors.NotFound, true);
    }
  }

  if (opts.output === "executable") {
    const bin = join(SHOWCASE, "dist/server/server");
    assertEquals((await Deno.stat(bin)).isFile, true, "executable missing");
  }

  await clean();
}

export async function rpcCall(
  port: number,
  functionId: string,
  args: unknown[] = [],
): Promise<{ ok: boolean; value?: unknown }> {
  const res = await fetch(
    `http://localhost:${port}/_ultimate/rpc/${functionId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "RemoteFunctionCalling", version: 1, args }),
    },
  );
  return await res.json();
}

export async function waitForServer(
  port: number,
  retries = 20,
): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      await res.body?.cancel();
      if (res.ok) return true;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export function killPort(port: number): void {
  try {
    new Deno.Command("fuser", { args: ["-k", `${port}/tcp`] }).outputSync();
  } catch { /* ok */ }
}

export async function readFirstHash(
  manifestRelPath: string,
): Promise<string | null> {
  try {
    const content = await Deno.readTextFile(join(SHOWCASE, manifestRelPath));
    const m = content.match(/"([a-f0-9]{8})"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
