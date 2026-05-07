import { join } from "@std/path";
import {
  analyzeModule,
  BabelParserAdapter,
  classifyFunctions,
  scanSourceFiles,
} from "@ultimate-js/analyzer";
import type { ModuleAnalysis, ParserAdapter } from "@ultimate-js/analyzer";
import { scanRoutes } from "@ultimate-js/router";
import { formatDiagnostic } from "@ultimate-js/core";
import type { ResolvedConfig } from "@ultimate-js/core";
import type { RspackCompileResult } from "./types.ts";

const PAGE_OR_LAYOUT_RE = /\/(page|layout)\.(tsx?|jsx?)$/;

export async function analyzeRspackProject(options: {
  projectRoot: string;
  appDir?: string;
  config?: ResolvedConfig;
}): Promise<RspackCompileResult> {
  const projectRoot = options.projectRoot;
  const appDir = join(projectRoot, options.appDir || "app");
  const parser = await createParser(options.config);
  const routes = await scanRoutes(appDir);
  const sourceFiles = await scanSourceFiles(appDir);
  const analyses: ModuleAnalysis[] = [];

  for (const file of sourceFiles) {
    const code = await Deno.readTextFile(file);
    const parsed = await parser.parseModule({ file, code });
    analyses.push(
      analyzeModule(file, parsed, PAGE_OR_LAYOUT_RE.test(file), appDir),
    );
  }

  const classification = classifyFunctions(analyses);
  if (classification.diagnostics.length > 0) {
    const message = classification.diagnostics.map(formatDiagnostic).join("\n");
    if (classification.diagnostics.some((diag) => diag.level === "error")) {
      throw new Error(message);
    }
    console.log(message);
  }

  const allFns = [...classification.functions.values()];
  const buildTimeOnly = new Set(["generateStaticParams"]);
  const serverFunctions = allFns.filter((fn) =>
    fn.runtime === "server" && !buildTimeOnly.has(fn.info.name)
  );
  const clientFunctions = allFns.filter((fn) => fn.runtime === "client");
  const sharedFunctions = allFns.filter((fn) => fn.runtime === "shared");
  const serverFunctionFiles = new Set(
    serverFunctions.map((fn) => fn.info.file),
  );

  return {
    routes,
    analyses,
    classification,
    serverFunctions,
    clientFunctions,
    sharedFunctions,
    serverFunctionFiles,
  };
}

async function createParser(config?: ResolvedConfig): Promise<ParserAdapter> {
  switch (config?.parser ?? "babel") {
    case "babel":
      return new BabelParserAdapter();
    case "swc": {
      const { SwcParserAdapter } = await import(
        "@ultimate-js/analyzer/swc-parser"
      );
      return new SwcParserAdapter();
    }
    default:
      throw new Error(`Unknown parser: ${config?.parser}`);
  }
}
