import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { renderDocument } from "@ultimate-js/core";
import { analyzeRspackProject } from "./analyze.ts";
import { createClientConfig, createServerConfig } from "./configs.ts";
import { loadAliases } from "./deno-aliases.ts";
import {
  compileServerExecutable,
  loadDocumentHead,
  loadRspack,
  runRspack,
} from "./runtime.ts";
import type { BuildRspackProjectOptions, RspackBuildResult } from "./types.ts";

export async function buildRspackProject(
  options: BuildRspackProjectOptions,
): Promise<RspackBuildResult> {
  const projectRoot = options.projectRoot;
  const appDir = join(projectRoot, options.appDir || "app");
  const distDir = options.distDir ?? join(projectRoot, "dist");
  const clientDir = join(distDir, "client");
  const serverDir = join(distDir, "server");

  await ensureDir(join(clientDir, "assets"));
  await ensureDir(serverDir);

  const result = await analyzeRspackProject(options);
  const html = renderDocument(await loadDocumentHead(projectRoot));
  await Deno.writeTextFile(join(clientDir, "index.html"), html);

  const aliases = await loadAliases(projectRoot, result);
  const rspack = await loadRspack();
  const clientBundle = join(clientDir, "assets", "client.js");
  await runRspack(
    rspack,
    createClientConfig({
      projectRoot,
      appDir,
      result,
      aliases,
      outFile: clientBundle,
      rpcBase: options.config.client.rpcBase,
    }),
  );
  console.log(`  Client bundle: ${clientBundle}`);

  const serverBundle = join(serverDir, "main.ts");
  await runRspack(
    rspack,
    createServerConfig({
      projectRoot,
      result,
      aliases,
      outFile: serverBundle,
      config: options.config,
    }),
  );
  console.log(`  Server bundle: ${serverDir}`);

  if (options.config.server.output === "executable") {
    await compileServerExecutable(projectRoot, serverDir);
  }

  return { ...result, clientBundle, serverBundle };
}
