import { join, relative } from "@std/path";
import type { ResolvedConfig } from "@ultimate-js/core";
import { compileProject } from "@ultimate-js/compiler";
import { buildRspackProject } from "@ultimate-js/rspack-plugin";
import {
  generateClientProxyCode,
  generateServerManifestCode,
} from "@ultimate-js/generator";
import {
  buildServer,
  bundleClient,
  ensureDir,
  generateClientEntryCode,
  generateRouteManifestCodeFromTransformed,
  generateStaticPaths,
  removeDir,
  transformAndCopyAppSources,
  writeTextFile,
} from "@ultimate-js/bundler-deno";

export async function build(
  projectRoot: string,
  config: ResolvedConfig,
): Promise<void> {
  const appDir = join(projectRoot, "app");
  const generatedDir = join(projectRoot, ".ultimate", "generated");
  const transformedDir = join(projectRoot, ".ultimate", "transformed-app");
  const distDir = join(projectRoot, "dist");

  console.log("Building Ultimate.js project...");
  console.log(`  Project: ${projectRoot}`);

  // 1. Clean
  console.log("\n[1/6] Cleaning output directories...");
  await removeDir(join(projectRoot, ".ultimate"));
  await removeDir(distDir);
  await ensureDir(join(distDir, "client", "assets"));
  await ensureDir(join(distDir, "server"));

  if (config.bundler === "rspack") {
    console.log("[2/6] Building with Rspack orchestration...");
    const result = await buildRspackProject({ projectRoot, config, distDir });
    console.log(`  Found ${result.routes.length} route(s)`);
    console.log(`  Analyzed ${result.analyses.length} source file(s)`);
    console.log(`  Server functions: ${result.serverFunctions.length}`);
    console.log(`  Client functions: ${result.clientFunctions.length}`);
    console.log(`  Shared functions: ${result.sharedFunctions.length}`);
    console.log("\nBuild complete!");
    console.log(`  Client: ${join(distDir, "client")}`);
    console.log(`  Server: ${join(distDir, "server")}`);
    return;
  }

  await ensureDir(generatedDir);
  await ensureDir(transformedDir);

  // 2-4. Compile project
  console.log("[2/6] Scanning routes...");
  const result = await compileProject({ projectRoot, config });

  console.log(`  Found ${result.routes.length} route(s)`);
  for (const route of result.routes) {
    console.log(`    ${route.path} -> ${relative(projectRoot, route.file)}`);
  }

  console.log("\n[3/6] Analyzing source files...");
  console.log(`  Found ${result.analyses.length} source file(s)`);
  for (const a of result.analyses) {
    if (a.functions.length > 0) {
      console.log(
        `  ${
          relative(projectRoot, a.file)
        }: ${a.functions.length} function(s), directive=${a.directive}`,
      );
    }
  }

  console.log("\n[4/6] Classifying functions...");
  console.log(`  Server functions: ${result.serverFunctions.length}`);
  console.log(`  Client functions: ${result.clientFunctions.length}`);
  console.log(`  Shared functions: ${result.sharedFunctions.length}`);

  // 5. Generate outputs
  console.log("\n[5/6] Generating build outputs...");

  const serverManifest = generateServerManifestCode(
    result.serverFunctions,
    generatedDir,
  );
  await writeTextFile(join(generatedDir, "server-manifest.ts"), serverManifest);
  console.log(`  Generated: server-manifest.ts`);

  const proxyFilePath = join(generatedDir, "client-proxies.ts");
  const clientProxy = generateClientProxyCode(result.serverFunctions);
  await writeTextFile(proxyFilePath, clientProxy);
  console.log(`  Generated: client-proxies.ts`);

  console.log("  Transforming client-side source files...");
  await transformAndCopyAppSources(
    appDir,
    transformedDir,
    result.analyses,
    result.serverFunctionFiles,
    proxyFilePath,
  );

  // Map route files and layout files to transformed paths
  const transformedRoutes = result.routes.map((r) => ({
    ...r,
    file: join(transformedDir, relative(appDir, r.file)),
    layoutFiles: r.layoutFiles.map((lf) =>
      join(transformedDir, relative(appDir, lf))
    ),
  }));
  const routeManifest = generateRouteManifestCodeFromTransformed(
    transformedRoutes,
    generatedDir,
  );
  await writeTextFile(join(generatedDir, "route-manifest.ts"), routeManifest);
  console.log(`  Generated: route-manifest.ts`);

  const clientEntry = generateClientEntryCode(config.client.rpcBase);
  await writeTextFile(
    join(projectRoot, ".ultimate", "client-entry.tsx"),
    clientEntry,
  );
  console.log(`  Generated: client-entry.tsx`);

  // 6. Build bundles
  console.log("\n[6/6] Building bundles...");
  await bundleClient(projectRoot, distDir, config);
  await buildServer(projectRoot, distDir, appDir, generatedDir, config);

  // 7. generateStaticParams — pre-render HTML for dynamic routes
  const staticCount = await generateStaticPaths(result.routes, distDir);
  if (staticCount > 0) {
    console.log(`  Static paths: ${staticCount} page(s) pre-generated`);
  }

  console.log("\nBuild complete!");
  console.log(`  Client: ${join(distDir, "client")}`);
  console.log(`  Server: ${join(distDir, "server")}`);
}
