import { dirname, relative, resolve } from "@std/path";

/**
 * Transform a client-side source file by replacing imports of server function
 * files with imports from the client proxy barrel.
 */
export function transformClientSource(
  source: string,
  originalFilePath: string,
  destFilePath: string,
  serverFunctionFiles: Set<string>,
  proxyFilePath: string,
): string {
  let result = source;
  let match: RegExpExecArray | null;

  const re =
    /(import\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?|import\s+["']([^"']+)["']\s*;?|export\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?)/g;

  while ((match = re.exec(source)) !== null) {
    const specifier = match[2] || match[3] || match[4];
    if (!specifier) continue;

    if (!specifier.startsWith(".")) continue;

    const originalDir = dirname(originalFilePath);
    const resolved = resolve(originalDir, specifier);

    let foundResolved: string | null = null;
    for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
      const candidate = resolved + ext;
      if (serverFunctionFiles.has(candidate)) {
        foundResolved = candidate;
        break;
      }
    }

    if (!foundResolved && serverFunctionFiles.has(resolved)) {
      foundResolved = resolved;
    }

    if (foundResolved) {
      const destDir = dirname(destFilePath);
      let proxyRelPath = relative(destDir, proxyFilePath);

      if (!proxyRelPath.startsWith(".")) {
        proxyRelPath = "./" + proxyRelPath;
      }

      const fullMatch = match[0];
      const newImport = fullMatch.replace(
        new RegExp(`(["'])${escapeRegExp(specifier)}\\1`),
        `$1${proxyRelPath}$1`,
      );

      result = result.replace(fullMatch, newImport);
    }
  }

  return result;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Determine which source files need to be copied for the client build.
 */
export function getClientFiles(
  allAnalyses: { file: string; directive: string; isRouteFile: boolean }[],
): Set<string> {
  const clientFiles = new Set<string>();

  for (const analysis of allAnalyses) {
    if (
      analysis.isRouteFile ||
      analysis.directive === "client" ||
      analysis.directive === "shared"
    ) {
      clientFiles.add(analysis.file);
    }
  }

  return clientFiles;
}
