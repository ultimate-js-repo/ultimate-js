/**
 * Module directive types that can appear at the top of a file
 */
export type ModuleDirective = "client" | "shared" | "server";

/**
 * Detects the module directive from source code.
 * Looks for "use client" or "use shared" at the top of the file.
 * Default is "server".
 */
export function getModuleDirective(code: string): ModuleDirective {
  // Remove leading comments and whitespace
  let trimmed = code.trimStart();

  // Skip single-line comments starting with //
  while (trimmed.startsWith("//")) {
    const newlineIdx = trimmed.indexOf("\n");
    if (newlineIdx === -1) {
      trimmed = "";
      break;
    }
    trimmed = trimmed.substring(newlineIdx + 1).trimStart();
  }

  // Skip multi-line comments /* */
  while (trimmed.startsWith("/*")) {
    const endIdx = trimmed.indexOf("*/");
    if (endIdx === -1) {
      trimmed = "";
      break;
    }
    trimmed = trimmed.substring(endIdx + 2).trimStart();
  }

  // Check for "use client" directive
  if (/^["']use client["']\s*;?/.test(trimmed)) {
    return "client";
  }

  // Check for "use shared" directive
  if (/^["']use shared["']\s*;?/.test(trimmed)) {
    return "shared";
  }

  // Default is server
  return "server";
}
