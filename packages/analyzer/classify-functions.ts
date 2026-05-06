import type { ModuleAnalysis, UserFunctionInfo } from "./analyze-module.ts";
import type { Diagnostic } from "@ultimate-js/core";

/**
 * Classification of where a function runs.
 */
export type FunctionRuntime = "client" | "server" | "shared" | "external";

/**
 * Full classification result for a function.
 */
export type ClassifiedFunction = {
  info: UserFunctionInfo;
  runtime: FunctionRuntime;
};

/**
 * Full classification result.
 */
export type ClassificationResult = {
  functions: Map<string, ClassifiedFunction>; // keyed by functionId
  fileDirectives: Map<string, FunctionRuntime>; // keyed by file path
  diagnostics: Diagnostic[];
};

/**
 * Classify all functions from module analyses.
 */
export function classifyFunctions(
  analyses: ModuleAnalysis[],
): ClassificationResult {
  const functions = new Map<string, ClassifiedFunction>();
  const fileDirectives = new Map<string, FunctionRuntime>();
  const diagnostics: Diagnostic[] = [];

  // First pass: classify each function individually
  for (const analysis of analyses) {
    let defaultRuntime: FunctionRuntime;

    if (analysis.isRouteFile) {
      defaultRuntime = "client";
    } else if (analysis.directive === "client") {
      defaultRuntime = "client";
    } else if (analysis.directive === "shared") {
      defaultRuntime = "shared";
    } else {
      defaultRuntime = "server";
    }

    fileDirectives.set(analysis.file, defaultRuntime);

    for (const fn of analysis.functions) {
      let runtime: FunctionRuntime;

      if (fn.isRouteDefaultExport) {
        runtime = "client";
      } else if (fn.moduleDirective === "client") {
        runtime = "client";
      } else if (fn.moduleDirective === "shared") {
        runtime = "shared";
      } else if (fn.moduleDirective === "server") {
        runtime = "server";
      } else {
        runtime = defaultRuntime;
      }

      functions.set(fn.id, { info: fn, runtime });
    }
  }

  // Second pass: check for illegal calls
  const localNameToId = new Map<string, Map<string, string>>();
  for (const analysis of analyses) {
    const nameMap = new Map<string, string>();
    for (const fn of analysis.functions) {
      nameMap.set(fn.name, fn.id);
    }
    localNameToId.set(analysis.file, nameMap);
  }

  const importMap = new Map<
    string,
    Map<string, { source: string; importedName: string }>
  >();
  for (const analysis of analyses) {
    const fileImportMap = new Map<
      string,
      { source: string; importedName: string }
    >();
    for (const imp of analysis.imports) {
      for (const name of imp.names) {
        fileImportMap.set(name.local, {
          source: imp.source,
          importedName: name.imported,
        });
      }
      if (imp.defaultImport) {
        fileImportMap.set(imp.defaultImport, {
          source: imp.source,
          importedName: "default",
        });
      }
      if (imp.namespaceImport) {
        fileImportMap.set(imp.namespaceImport, {
          source: imp.source,
          importedName: "*",
        });
      }
    }
    importMap.set(analysis.file, fileImportMap);
  }

  const fileAnalysisMap = new Map<string, ModuleAnalysis>();
  for (const a of analyses) {
    fileAnalysisMap.set(a.file, a);
  }

  // Check each function's calls
  for (const [_fnId, classified] of functions) {
    for (const call of classified.info.calls) {
      const fileImportMap = importMap.get(classified.info.file);

      if (fileImportMap?.has(call.calleeName)) {
        const importEntry = fileImportMap.get(call.calleeName)!;

        if (isUserModule(importEntry.source)) {
          const calleeFile = resolveImportPath(
            classified.info.file,
            importEntry.source,
          );
          const calleeAnalysis = calleeFile
            ? fileAnalysisMap.get(calleeFile)
            : undefined;

          if (calleeAnalysis) {
            const calleeName = importEntry.importedName;
            const calleeFn = calleeAnalysis.functions.find(
              (f) => f.exportName === calleeName || f.name === calleeName,
            );

            if (calleeFn) {
              const calleeClassified = functions.get(calleeFn.id);
              if (calleeClassified) {
                if (
                  (classified.runtime === "server" ||
                    classified.runtime === "shared") &&
                  calleeClassified.runtime === "client"
                ) {
                  diagnostics.push({
                    level: "error",
                    message:
                      `Server Function cannot call Client Function "${call.calleeName}". Move the caller to "use client", remove "use client" from callee, or move shared logic into "use shared".`,
                    file: classified.info.file,
                    line: call.loc?.line,
                    column: call.loc?.column,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return { functions, fileDirectives, diagnostics };
}

/**
 * Check if an import source is a user module (not third-party).
 */
function isUserModule(source: string): boolean {
  if (source.startsWith("npm:")) return false;
  if (source.startsWith("jsr:")) return false;
  if (source.startsWith("http://") || source.startsWith("https://")) {
    return false;
  }
  if (source.startsWith("node:")) return false;
  if (source.startsWith("@ultimate-js/")) return false;

  if (source.startsWith(".")) return true;

  return false;
}

/**
 * Resolve a relative import path to an absolute file path.
 */
function resolveImportPath(
  fromFile: string,
  importSource: string,
): string | null {
  if (!importSource.startsWith(".")) return null;

  const fromDir = fromFile.substring(0, fromFile.lastIndexOf("/"));
  const resolved = `${fromDir}/${importSource}`.replace(/\/+/g, "/");

  return resolved;
}
