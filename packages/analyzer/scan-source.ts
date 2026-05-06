import { join } from "@std/path";
import { expandGlob } from "@std/fs";

/**
 * Scans the app directory for all TypeScript/TSX source files.
 * Excludes node_modules, dist, .ultimate, packages.
 */
export async function scanSourceFiles(appDir: string): Promise<string[]> {
  const files: string[] = [];
  const patterns = [
    join(appDir, "**", "*.ts"),
    join(appDir, "**", "*.tsx"),
  ];

  for (const pattern of patterns) {
    for await (
      const entry of expandGlob(pattern, {
        exclude: [
          "**/node_modules/**",
          "**/dist/**",
          "**/.ultimate/**",
          "**/client-entry.*",
          "**/server-entry.*",
        ],
      })
    ) {
      files.push(entry.path);
    }
  }

  return [...new Set(files)];
}
