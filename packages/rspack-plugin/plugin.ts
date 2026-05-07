import { resolveConfig } from "@ultimate-js/core";
import type { ResolvedConfig } from "@ultimate-js/core";
import { analyzeRspackProject } from "./analyze.ts";
import type {
  RspackCompiler,
  RspackCompileResult,
  UltimateRspackPluginOptions,
} from "./types.ts";

const PLUGIN_NAME = "UltimateRspackPlugin";

/**
 * Rspack adapter for Ultimate's analyzer semantics.
 *
 * Rspack builds use this package as their orchestration entry point instead of
 * calling `compileProject()`. Native builds still use the compiler package.
 */
export class UltimateRspackPlugin {
  readonly options: UltimateRspackPluginOptions;
  #lastResult: RspackCompileResult | undefined;

  constructor(options: UltimateRspackPluginOptions = {}) {
    this.options = options;
  }

  get result(): RspackCompileResult | undefined {
    return this.#lastResult;
  }

  apply(compiler: RspackCompiler): void {
    const run = async (activeCompiler: RspackCompiler) => {
      await this.analyze(activeCompiler);
    };

    compiler.hooks?.beforeRun?.tapPromise(PLUGIN_NAME, run);
    compiler.hooks?.watchRun?.tapPromise(PLUGIN_NAME, run);
  }

  async analyze(compiler?: RspackCompiler): Promise<RspackCompileResult> {
    const projectRoot = this.options.projectRoot ?? compiler?.context ??
      Deno.cwd();
    const config = resolvePluginConfig(this.options);
    const result = await analyzeRspackProject({
      projectRoot,
      appDir: this.options.appDir,
      config,
    });
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
