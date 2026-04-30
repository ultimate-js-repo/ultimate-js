import { resolve } from "@std/path";

/**
 * Resolve the project root directory from the example name.
 */
export function resolveProjectRoot(exampleName: string): string {
  if (exampleName.startsWith("/")) {
    return exampleName;
  }

  const cwd = Deno.cwd();
  const fromExamples = resolve(cwd, "examples", exampleName);

  try {
    const stat = Deno.statSync(fromExamples);
    if (stat.isDirectory) return fromExamples;
  } catch { /* Not found */ }

  return resolve(cwd, exampleName);
}
