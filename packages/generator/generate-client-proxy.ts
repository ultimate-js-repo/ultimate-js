import type { ClassifiedFunction } from "@ultimate-js/analyzer";

/**
 * Generate a client proxy module for a set of server functions.
 * The proxy replaces direct imports with remoteFunctionCall wrappers.
 */
export function generateClientProxyCode(
  serverFunctions: ClassifiedFunction[],
): string {
  const lines: string[] = [];

  lines.push(`// Auto-generated client proxies for server functions`);
  lines.push(`import { remoteFunctionCall } from "@ultimate-js/rpc-client";`);
  lines.push("");

  for (const fn of serverFunctions) {
    const { id, exportName, name } = fn.info;
    const publicName = exportName || name;

    lines.push(`export function ${publicName}(...args: unknown[]) {`);
    lines.push(`  return remoteFunctionCall(${JSON.stringify(id)}, args);`);
    lines.push(`}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate a single client proxy file for a specific server module.
 */
export function generateSingleProxyCode(
  fileName: string,
  serverFunctions: ClassifiedFunction[],
): string {
  return generateClientProxyCode(serverFunctions);
}
