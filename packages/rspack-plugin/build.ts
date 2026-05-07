import { ensureDir } from "@std/fs";
import { dirname, join } from "@std/path";
import { renderDocument } from "@ultimate-js/core";
import type { DocumentHead } from "@ultimate-js/core";
import { analyzeRspackProject } from "./analyze.ts";
import { createClientConfig, createServerConfig } from "./configs.ts";
import { loadAliases } from "./deno-aliases.ts";
import { htmlFileForRoute, prerenderRoutes } from "./prerender.ts";
import {
  closeRspackCompiler,
  compileServerExecutable,
  createRspackCompiler,
  loadDocumentHead,
  loadRspack,
  runRspack,
  runRspackCompiler,
} from "./runtime.ts";
import type {
  BuildRspackProjectOptions,
  RspackBuildResult,
  RspackCompiler,
  RspackDevBuilder,
  RspackFn,
  RspackStats,
} from "./types.ts";

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
  const head = await loadDocumentHead(projectRoot);
  const cssImports = await writeHeadStylesheet(projectRoot, head);
  const documentHead = withoutBundledStyles(head);

  const aliases = await loadAliases(projectRoot, result);
  const rspack = await loadRspack();
  const clientStats = await runRspack(
    rspack,
    createClientConfig({
      projectRoot,
      appDir,
      result,
      aliases,
      outDir: clientDir,
      rpcBase: options.config.client.rpcBase,
      cssImports,
    }),
  );
  const {
    scripts: clientScripts,
    stylesheets: clientStylesheets,
    modulePreloads: clientModulePreloads,
  } = extractEntrypointAssets(clientStats);
  if (clientScripts.length === 0) {
    throw new Error("rspack client build did not emit any entry scripts");
  }
  for (const script of clientScripts) {
    console.log(`  Client script: ${script}`);
  }
  for (const stylesheet of clientStylesheets) {
    console.log(`  Client stylesheet: ${stylesheet}`);
  }

  const pages = await prerenderRoutes(projectRoot, result.routes);
  if (pages.length === 0) {
    await Deno.writeTextFile(
      join(clientDir, "index.html"),
      renderDocument(documentHead, {
        scripts: clientScripts,
        stylesheets: clientStylesheets,
        modulePreloads: clientModulePreloads,
      }),
    );
  } else {
    for (const page of pages) {
      const htmlFile = htmlFileForRoute(clientDir, page.path);
      await ensureDir(dirname(htmlFile));
      await Deno.writeTextFile(
        htmlFile,
        renderDocument(documentHead, {
          bodyHtml: page.html,
          scripts: clientScripts,
          stylesheets: clientStylesheets,
          modulePreloads: clientModulePreloads,
        }),
      );
    }
  }
  console.log(`  Prerendered pages: ${Math.max(pages.length, 1)}`);

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

  return {
    ...result,
    clientScripts,
    clientStylesheets,
    clientModulePreloads,
    serverBundle,
  };
}

export function createRspackDevBuilder(
  options: BuildRspackProjectOptions,
): RspackDevBuilder {
  let rspack: RspackFn | undefined;
  let clientCompiler: RspackCompiler | undefined;
  let clientConfigKey = "";

  return {
    async build(changedFiles: string[] = []): Promise<RspackBuildResult> {
      const projectRoot = options.projectRoot;
      const appDir = join(projectRoot, options.appDir || "app");
      const distDir = options.distDir ?? join(projectRoot, "dist");
      const clientDir = join(distDir, "client");
      const serverDir = join(distDir, "server");

      await ensureDir(join(clientDir, "assets"));
      await ensureDir(serverDir);

      const result = await analyzeRspackProject(options);
      const head = await loadDocumentHead(projectRoot);
      const cssImports = await writeHeadStylesheet(projectRoot, head);
      const documentHead = withoutBundledStyles(head);
      const aliases = await loadAliases(projectRoot, result);
      rspack ??= await loadRspack();

      const clientConfig = createClientConfig({
        projectRoot,
        appDir,
        result,
        aliases,
        outDir: clientDir,
        rpcBase: options.config.client.rpcBase,
        cssImports,
      });
      const nextConfigKey = JSON.stringify(clientConfig);
      if (!clientCompiler || nextConfigKey !== clientConfigKey) {
        await closeRspackCompiler(clientCompiler);
        clientCompiler = createRspackCompiler(rspack, clientConfig);
        clientConfigKey = nextConfigKey;
      }

      const clientStats = await runRspackCompiler(
        clientCompiler,
        [...changedFiles, ...cssImports],
      );
      const {
        scripts: clientScripts,
        stylesheets: clientStylesheets,
        modulePreloads: clientModulePreloads,
      } = extractEntrypointAssets(clientStats);
      if (clientScripts.length === 0) {
        throw new Error("rspack client build did not emit any entry scripts");
      }

      const pages = await prerenderRoutes(projectRoot, result.routes);
      await writePrerenderedDocuments({
        clientDir,
        documentHead,
        pages,
        clientScripts,
        clientStylesheets,
        clientModulePreloads,
      });

      return {
        ...result,
        clientScripts,
        clientStylesheets,
        clientModulePreloads,
        serverBundle: join(serverDir, "main.ts"),
      };
    },
    async close(): Promise<void> {
      await closeRspackCompiler(clientCompiler);
      clientCompiler = undefined;
      clientConfigKey = "";
    },
  };
}

async function writeHeadStylesheet(
  projectRoot: string,
  head: DocumentHead,
): Promise<string[]> {
  if (!head.styles?.length) return [];

  const cssFile = join(projectRoot, ".ultimate", "rspack", "head.css");
  await ensureDir(dirname(cssFile));
  await Deno.writeTextFile(cssFile, head.styles.join("\n\n"));
  return [cssFile];
}

function withoutBundledStyles(head: DocumentHead): DocumentHead {
  const { styles: _styles, ...rest } = head;
  return rest;
}

async function writePrerenderedDocuments(options: {
  clientDir: string;
  documentHead: DocumentHead;
  pages: Array<{ path: string; html: string }>;
  clientScripts: string[];
  clientStylesheets: string[];
  clientModulePreloads: string[];
}): Promise<void> {
  if (options.pages.length === 0) {
    await Deno.writeTextFile(
      join(options.clientDir, "index.html"),
      renderDocument(options.documentHead, {
        scripts: options.clientScripts,
        stylesheets: options.clientStylesheets,
        modulePreloads: options.clientModulePreloads,
      }),
    );
    return;
  }

  for (const page of options.pages) {
    const htmlFile = htmlFileForRoute(options.clientDir, page.path);
    await ensureDir(dirname(htmlFile));
    await Deno.writeTextFile(
      htmlFile,
      renderDocument(options.documentHead, {
        bodyHtml: page.html,
        scripts: options.clientScripts,
        stylesheets: options.clientStylesheets,
        modulePreloads: options.clientModulePreloads,
      }),
    );
  }
}

function extractEntrypointAssets(
  stats: RspackStats,
): { scripts: string[]; stylesheets: string[]; modulePreloads: string[] } {
  const json = stats.toJson({
    all: false,
    assets: true,
    entrypoints: true,
  });
  const jsAssets: string[] = [];
  const stylesheets: string[] = [];

  for (const entrypoint of Object.values(json.entrypoints ?? {})) {
    for (const asset of entrypoint.assets ?? []) {
      const name = typeof asset === "string" ? asset : asset.name;
      if (name?.endsWith(".js")) jsAssets.push(toPublicAsset(name));
      if (name?.endsWith(".css")) stylesheets.push(toPublicAsset(name));
    }
  }

  if (jsAssets.length === 0) {
    for (const asset of json.assets ?? []) {
      const name = asset.name;
      if (name?.endsWith(".js") && !name.includes("/chunks/")) {
        jsAssets.push(toPublicAsset(name));
      }
    }
  }

  if (stylesheets.length === 0) {
    for (const asset of json.assets ?? []) {
      const name = asset.name;
      if (name?.endsWith(".css") && !name.includes("/chunks/")) {
        stylesheets.push(toPublicAsset(name));
      }
    }
  }

  const uniqueJsAssets = [...new Set(jsAssets)];
  const entryScript = uniqueJsAssets.find(isClientEntryScript) ??
    uniqueJsAssets.at(-1);
  const scripts = entryScript ? [entryScript] : [];
  const modulePreloads = uniqueJsAssets.filter((asset) =>
    asset !== entryScript
  );

  return {
    scripts,
    stylesheets: [...new Set(stylesheets)],
    modulePreloads,
  };
}

function toPublicAsset(name: string): string {
  return name.startsWith("/") ? name : `/${name}`;
}

function isClientEntryScript(asset: string): boolean {
  return /(?:^|\/)client(?:\.[a-f0-9]{8})?\.js$/.test(asset);
}
