import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import { compileProject } from "@ultimate-js/compiler";
import type { CompileResult } from "@ultimate-js/compiler";
import { generateClientProxyCode } from "@ultimate-js/generator";
import { generateServerManifestCode } from "@ultimate-js/generator";
import { formatDiagnostic, resolveConfig } from "@ultimate-js/core";
import type {
  ParserType,
  ResolvedConfig,
  UltimateConfig,
} from "@ultimate-js/core";

const PLUGIN_NAME = "UltimateRspackPlugin";

type RspackAsyncHook<T> = {
  tapPromise(name: string, handler: (arg: T) => Promise<void>): void;
};

type RspackCompiler = {
  context?: string;
  hooks?: {
    beforeRun?: RspackAsyncHook<RspackCompiler>;
    watchRun?: RspackAsyncHook<RspackCompiler>;
  };
};

export type GeneratedAssetOptions = {
  /** Generate `.ultimate/generated/client-proxies.ts`. Defaults to true. */
  clientProxy?: boolean;
  /** Generate `.ultimate/generated/server-manifest.ts`. Defaults to true. */
  serverManifest?: boolean;
};

export interface UltimateRspackPluginOptions {
  /**
   * Project root. Defaults to the Rspack compiler context and then `Deno.cwd()`.
   */
  projectRoot?: string;
  /** App directory relative to the project root. Defaults to `app`. */
  appDir?: string;
  /** Parser used by `@ultimate-js/analyzer`. Defaults to Ultimate config. */
  parser?: ParserType;
  /**
   * Ultimate config. If omitted, framework defaults are used. `parser` overrides
   * this config when both are provided.
   */
  config?: UltimateConfig | ResolvedConfig;
  /** Generated output directory. Defaults to `<projectRoot>/.ultimate/generated`. */
  generatedDir?: string;
  /** Generated files to write before Rspack runs. Defaults to both files. */
  emit?: boolean | GeneratedAssetOptions;
  /** Receives the latest compile result after every analysis pass. */
  onResult?: (result: CompileResult) => void | Promise<void>;
}

/**
 * Rspack adapter for Ultimate's bundler-independent compiler/analyzer.
 *
 * The plugin runs Ultimate analysis before normal and watch builds. It can emit
 * the generated RPC manifest/proxy files that Rspack entries import, while the
 * classification semantics continue to live in `@ultimate-js/analyzer`.
 */
export class UltimateRspackPlugin {
  readonly options: UltimateRspackPluginOptions;
  #lastResult: CompileResult | undefined;

  constructor(options: UltimateRspackPluginOptions = {}) {
    this.options = options;
  }

  get result(): CompileResult | undefined {
    return this.#lastResult;
  }

  apply(compiler: RspackCompiler): void {
    const run = async (activeCompiler: RspackCompiler) => {
      await this.analyze(activeCompiler);
    };

    compiler.hooks?.beforeRun?.tapPromise(PLUGIN_NAME, run);
    compiler.hooks?.watchRun?.tapPromise(PLUGIN_NAME, run);
  }

  async analyze(compiler?: RspackCompiler): Promise<CompileResult> {
    const projectRoot = this.options.projectRoot ?? compiler?.context ??
      Deno.cwd();
    const generatedDir = this.options.generatedDir ??
      join(projectRoot, ".ultimate", "generated");
    const config = resolvePluginConfig(this.options);

    const result = await compileProject({
      projectRoot,
      appDir: this.options.appDir,
      config,
    });

    if (result.classification.diagnostics.length > 0) {
      const message = result.classification.diagnostics
        .map(formatDiagnostic)
        .join("\n");
      const hasErrors = result.classification.diagnostics.some((diagnostic) =>
        diagnostic.level === "error"
      );
      if (hasErrors) throw new Error(message);
    }

    if (shouldEmit(this.options.emit, "clientProxy")) {
      await ensureDir(generatedDir);
      await Deno.writeTextFile(
        join(generatedDir, "client-proxies.ts"),
        generateClientProxyCode(result.serverFunctions),
      );
    }

    if (shouldEmit(this.options.emit, "serverManifest")) {
      await ensureDir(generatedDir);
      await Deno.writeTextFile(
        join(generatedDir, "server-manifest.ts"),
        generateServerManifestCode(result.serverFunctions, generatedDir),
      );
    }

    this.#lastResult = result;
    await this.options.onResult?.(result);
    return result;
  }
}

export function createUltimateRspackPlugin(
  options: UltimateRspackPluginOptions = {},
): UltimateRspackPlugin {
  return new UltimateRspackPlugin(options);
}

function resolvePluginConfig(
  options: UltimateRspackPluginOptions,
): ResolvedConfig {
  const raw = isResolvedConfig(options.config)
    ? options.config
    : resolveConfig(options.config);

  if (!options.parser) return raw;
  return { ...raw, parser: options.parser };
}

function isResolvedConfig(
  config: UltimateRspackPluginOptions["config"],
): config is ResolvedConfig {
  return !!config && "server" in config && "client" in config &&
    typeof config.client === "object" && config.client !== null &&
    "rpcBase" in config.client;
}

function shouldEmit(
  emit: UltimateRspackPluginOptions["emit"],
  key: keyof GeneratedAssetOptions,
): boolean {
  if (emit === false) return false;
  if (emit === true || emit === undefined) return true;
  return emit[key] ?? true;
}
