import type { ClassifiedFunction } from "@ultimate-js/analyzer";
import { relative } from "@std/path";

/**
 * Generate server manifest code.
 * Maps functionId -> actual imported server function.
 */
export function generateServerManifestCode(
  serverFunctions: ClassifiedFunction[],
  generatedDir: string,
): string {
  const lines: string[] = [];

  lines.push(`// Auto-generated server manifest`);
  lines.push(`// Maps function IDs to actual server function implementations`);
  lines.push("");

  // Group functions by file
  const byFile = new Map<string, ClassifiedFunction[]>();
  for (const fn of serverFunctions) {
    const existing = byFile.get(fn.info.file) || [];
    existing.push(fn);
    byFile.set(fn.info.file, existing);
  }

  // Generate imports per file
  const importMap = new Map<
    string,
    { type: "default" | "named"; name?: string }
  >();
  let importIndex = 0;

  for (const [file, fns] of byFile) {
    const relPath = relative(generatedDir, file);
    const cleanPath = relPath.startsWith(".") ? relPath : "./" + relPath;
    const modName = `mod${importIndex}`;

    const exportNames = fns.map((f) => f.info.exportName || f.info.name);
    const uniqueNames = [...new Set(exportNames)];

    if (uniqueNames.length === 1 && uniqueNames[0] === "default") {
      lines.push(`import ${modName} from ${JSON.stringify(cleanPath)}`);
      importMap.set(file, { type: "default", name: modName });
    } else {
      lines.push(
        `import { ${uniqueNames.join(", ")} } from ${
          JSON.stringify(cleanPath)
        }`,
      );
      importMap.set(file, { type: "named" });
    }
    importIndex++;
  }

  lines.push("");
  lines.push(
    "export const serverManifest: Record<string, (...args: unknown[]) => unknown | Promise<unknown>> = {",
  );

  for (const [file, fns] of byFile) {
    const impInfo = importMap.get(file)!;
    for (const fn of fns) {
      const exportName = fn.info.exportName || fn.info.name;
      let ref: string;
      if (impInfo.type === "default") {
        ref = impInfo.name!;
      } else {
        ref = exportName;
      }
      lines.push(`  ${JSON.stringify(fn.info.id)}: ${ref},`);
    }
  }

  lines.push("};");

  return lines.join("\n");
}
