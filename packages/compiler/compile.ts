import { join } from "@std/path";
import { scanRoutes } from "@ultimate-js/router";
import type { RouteRecord } from "@ultimate-js/router";
import {
  analyzeModule,
  BabelParserAdapter,
  classifyFunctions,
  scanSourceFiles,
} from "@ultimate-js/analyzer";
import type {
  ClassificationResult,
  ClassifiedFunction,
  ModuleAnalysis,
  ParserAdapter,
} from "@ultimate-js/analyzer";
import { formatDiagnostic } from "@ultimate-js/core";
import type { ResolvedConfig } from "@ultimate-js/core";

const PAGE_OR_LAYOUT_RE = /\/(page|layout)\.(tsx?|jsx?)$/;

export interface ProjectConfig {
  projectRoot: string;
  appDir?: string;
  config?: ResolvedConfig;
}

export interface CompileResult {
  routes: RouteRecord[];
  analyses: ModuleAnalysis[];
  classification: ClassificationResult;
  serverFunctions: ClassifiedFunction[];
  clientFunctions: ClassifiedFunction[];
  sharedFunctions: ClassifiedFunction[];
  serverFunctionFiles: Set<string>;
}

async function createParser(config?: ResolvedConfig): Promise<ParserAdapter> {
  switch (config?.parser ?? "babel") {
    case "babel":
      return new BabelParserAdapter();
    case "swc": {
      // Lazy import — @swc/wasm is only loaded when parser is "swc"
      const { SwcParserAdapter } = await import(
        "@ultimate-js/analyzer/swc-parser"
      );
      return new SwcParserAdapter();
    }
    default:
      throw new Error(`Unknown parser: ${config?.parser}`);
  }
}

export async function compileProject(
  projectConfig: ProjectConfig,
): Promise<CompileResult> {
  const projectRoot = projectConfig.projectRoot;
  const appDir = join(projectRoot, projectConfig.appDir || "app");
  const parser = await createParser(projectConfig.config);

  // 1. Scan routes (page.tsx + layout.tsx)
  const routes = await scanRoutes(appDir);

  // 2. Scan and analyze source files
  const sourceFiles = await scanSourceFiles(appDir);
  const analyses: ModuleAnalysis[] = [];
  for (const file of sourceFiles) {
    const isRouteFile = PAGE_OR_LAYOUT_RE.test(file);
    const code = await Deno.readTextFile(file);
    const parsed = await parser.parseModule({ file, code });
    analyses.push(analyzeModule(file, parsed, isRouteFile, appDir));
  }

  // 3. Classify functions
  const classification = classifyFunctions(analyses);

  // 4. Report diagnostics
  if (classification.diagnostics.length > 0) {
    for (const diag of classification.diagnostics) {
      console.log(`  ${formatDiagnostic(diag)}`);
    }
    const errors = classification.diagnostics.filter((d) =>
      d.level === "error"
    );
    if (errors.length > 0) {
      throw new Error(`Compilation failed: ${errors.length} error(s)`);
    }
  }

  // 5. Categorize functions
  const allFns = [...classification.functions.values()];
  const BUILD_TIME_ONLY = new Set(["generateStaticParams"]);
  const serverFunctions = allFns.filter(
    (f) => f.runtime === "server" && !BUILD_TIME_ONLY.has(f.info.name),
  );
  const clientFunctions = allFns.filter((f) => f.runtime === "client");
  const sharedFunctions = allFns.filter((f) => f.runtime === "shared");

  const serverFunctionFiles = new Set<string>();
  for (const fn of serverFunctions) {
    serverFunctionFiles.add(fn.info.file);
  }

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
