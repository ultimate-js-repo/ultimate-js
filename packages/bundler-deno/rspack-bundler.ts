import { join } from "@std/path";
import type { BundlerAdapter } from "./bundler-types.ts";

/** Minimal rspack compiler interface. */
interface RspackStats {
  hasErrors(): boolean;
  toJson(opts: { errors: boolean }): { errors?: { message: string }[] };
}

interface RspackCompiler {
  run(callback: (err: Error | null, stats: RspackStats | null) => void): void;
}

type RspackFn = (config: Record<string, unknown>) => RspackCompiler;

/**
 * Rspack client bundler.
 * Lazily loads @rspack/core on first use.
 */
export class RspackBundler implements BundlerAdapter {
  async bundleClient(options: {
    entry: string;
    outFile: string;
    projectRoot: string;
  }): Promise<void> {
    const mod = await import("@rspack/core") as Record<string, unknown>;
    const rspack = (mod.rspack ?? (mod.default as Record<string, unknown>)?.rspack) as RspackFn;

    const outDir = options.outFile.substring(0, options.outFile.lastIndexOf("/"));
    const outFilename = options.outFile.substring(options.outFile.lastIndexOf("/") + 1);
    const aliases = await loadAliases(options.projectRoot);

    return new Promise<void>((resolve, reject) => {
      const compiler = rspack({
        mode: "production",
        entry: options.entry,
        output: { path: outDir, filename: outFilename },
        resolve: {
          extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
          alias: aliases,
        },
        module: {
          rules: [
            {
              test: /\.(tsx?|jsx?)$/,
              exclude: /node_modules/,
              use: {
                loader: "builtin:swc-loader",
                options: {
                  jsc: {
                    parser: { syntax: "typescript", tsx: true },
                    transform: { react: { runtime: "classic" } },
                  },
                },
              },
            },
          ],
        },
      });

      compiler.run((err, stats) => {
        if (err) { reject(err); return; }
        if (stats?.hasErrors()) {
          const info = stats.toJson({ errors: true });
          const messages = (info.errors ?? []).map((e) => e.message).join("\n");
          reject(new Error(`rspack build failed:\n${messages}`));
          return;
        }
        resolve();
      });
    });
  }
}

async function loadAliases(projectRoot: string): Promise<Record<string, string>> {
  const aliases: Record<string, string> = {};

  for (const dir of [projectRoot, join(projectRoot, "../.."), join(projectRoot, "..")]) {
    try {
      const raw = await Deno.readTextFile(join(dir, "deno.json"));
      const cfg = JSON.parse(raw) as { imports?: Record<string, string> };
      if (cfg.imports) {
        for (const [key, value] of Object.entries(cfg.imports)) {
          if (value.startsWith("./") || value.startsWith("../")) {
            aliases[key] = join(dir, value);
          } else if (value.startsWith("npm:")) {
            aliases[key] = value.replace(/^npm:/, "").replace(/@[\d^~>=<.*]+$/, "");
          }
        }
      }
    } catch { /* no deno.json */ }
  }

  return aliases;
}
