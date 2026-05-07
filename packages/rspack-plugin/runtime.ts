import { exists } from "@std/fs";
import { join, toFileUrl } from "@std/path";
import type { DocumentHead } from "@ultimate-js/core";
import type { RspackFn } from "./types.ts";

export async function loadDocumentHead(
  projectRoot: string,
): Promise<DocumentHead> {
  const layoutPath = join(projectRoot, "app", "layout.tsx");
  if (!(await exists(layoutPath, { isFile: true }))) return {};

  const code = `
const mod = await import(${JSON.stringify(toFileUrl(layoutPath).href)});
console.log(JSON.stringify(mod.head ?? {}));
`;
  const command = new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-check", "--config", "deno.json", code],
    cwd: projectRoot,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(
      `failed to load document head:\n${stderr.substring(0, 500)}`,
    );
  }

  const stdout = new TextDecoder().decode(output.stdout).trim();
  return stdout ? JSON.parse(stdout) as DocumentHead : {};
}

export async function loadRspack(): Promise<RspackFn> {
  const mod = await import("@rspack/core") as Record<string, unknown>;
  return (mod.rspack ??
    (mod.default as Record<string, unknown>)?.rspack) as RspackFn;
}

export async function runRspack(
  rspack: RspackFn,
  config: Record<string, unknown>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const compiler = rspack(config);
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats?.hasErrors()) {
        const info = stats.toJson({ errors: true });
        const messages = (info.errors ?? []).map((e) => e.message).join("\n");
        reject(new Error(`rspack build failed:\n${messages}`));
        return;
      }
      resolve();
    });
  });
}

export async function compileServerExecutable(
  projectRoot: string,
  serverDist: string,
): Promise<void> {
  const mainTs = join(serverDist, "main.ts");
  const outBin = join(serverDist, "server");
  console.log(`  Compiling executable...`);

  const output = await new Deno.Command(Deno.execPath(), {
    args: ["compile", "-A", "--no-check", "--output", outBin, mainTs],
    cwd: projectRoot,
    stdout: "piped",
    stderr: "piped",
  }).output();

  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(`deno compile failed:\n${stderr.substring(0, 500)}`);
  }
  console.log(`  Executable: ${outBin}`);
}
