import { resolve } from "@std/path";
import { existsSync } from "@std/fs";

/**
 * Resolve the project root directory from the example name.
 */
export function resolveProjectRoot(exampleName: string): string {
  if (exampleName.startsWith("/")) {
    return exampleName;
  }

  const cwd = Deno.cwd();
  const fromExamples = resolve(cwd, "examples", exampleName);

  if (existsSync(fromExamples, { isDirectory: true })) return fromExamples;

  return resolve(cwd, exampleName);
}
