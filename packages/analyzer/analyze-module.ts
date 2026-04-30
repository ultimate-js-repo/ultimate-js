import { relative } from "@std/path";
import { functionFingerprint } from "@ultimate-js/core";
import type { ModuleDirective } from "./source-kind.ts";
import type { ParsedModule, ParserAdapter } from "./parser-types.ts";

/**
 * Information about a user-defined function found in source code.
 */
export type UserFunctionInfo = {
  id: string;
  name: string;
  exportName?: string;
  file: string;
  isDefaultExport: boolean;
  isRouteDefaultExport: boolean;
  moduleDirective: ModuleDirective;
  calls: FunctionCallInfo[];
};

export type FunctionCallInfo = {
  calleeName: string;
  source: "local" | "imported" | "external" | "unknown";
  importSource?: string;
  loc?: { line: number; column: number };
};

export type ImportInfo = {
  source: string;
  names: Array<{ local: string; imported: string }>;
  namespaceImport?: string;
  defaultImport?: string;
};

export type ModuleAnalysis = {
  file: string;
  directive: ModuleDirective;
  functions: UserFunctionInfo[];
  imports: ImportInfo[];
  isRouteFile: boolean;
};

/**
 * Analyze a module using a ParsedModule from any parser adapter.
 */
export function analyzeModule(
  filePath: string,
  parsed: ParsedModule,
  isRouteFile: boolean,
  appDir?: string,
): ModuleAnalysis {
  // Derive directive
  const directive: ModuleDirective =
    parsed.directives.includes("client")
      ? "client"
      : parsed.directives.includes("shared")
        ? "shared"
        : "server";

  // Module path relative to appDir, without extension
  const modulePath = appDir
    ? relative(appDir, filePath).replace(/\.(tsx?|jsx?)$/, "")
    : filePath.replace(/\.(tsx?|jsx?)$/, "");

  // Convert imports
  const imports: ImportInfo[] = parsed.imports.map((imp) => ({
    source: imp.source,
    names: imp.names,
    defaultImport: imp.defaultImport,
    namespaceImport: imp.namespaceImport,
  }));

  // Convert functions
  const functions: UserFunctionInfo[] = parsed.functions.map((fn) => {
    const id = functionFingerprint(modulePath, fn.signature);
    return {
      id,
      name: fn.name,
      exportName: fn.exportName,
      file: filePath,
      isDefaultExport: fn.isDefaultExport,
      isRouteDefaultExport: fn.isDefaultExport && isRouteFile,
      moduleDirective: fn.isDefaultExport && isRouteFile ? "client" as const : directive,
      calls: fn.calls.map((c) => ({
        calleeName: c.calleeName,
        source: "unknown" as const,
        loc: c.loc,
      })),
    };
  });

  return { file: filePath, directive, functions, imports, isRouteFile };
}

// Re-export adapter types for convenience
export type { ParsedModule, ParserAdapter } from "./parser-types.ts";
