import type {
  ClassificationResult,
  ClassifiedFunction,
  ModuleAnalysis,
} from "@ultimate-js/analyzer";
import type { RouteRecord } from "@ultimate-js/router";
import type {
  ParserType,
  ResolvedConfig,
  UltimateConfig,
} from "@ultimate-js/core";

export type RspackStats = {
  hasErrors(): boolean;
  toJson(opts: { errors: boolean }): { errors?: { message: string }[] };
};

export type RspackAsyncHook<T> = {
  tapPromise(name: string, handler: (arg: T) => Promise<void>): void;
};

export type RspackCompiler = {
  context?: string;
  run(callback: (err: Error | null, stats: RspackStats | null) => void): void;
  hooks?: {
    beforeRun?: RspackAsyncHook<RspackCompiler>;
    watchRun?: RspackAsyncHook<RspackCompiler>;
  };
};

export type RspackFn = (config: Record<string, unknown>) => RspackCompiler;

export interface RspackCompileResult {
  routes: RouteRecord[];
  analyses: ModuleAnalysis[];
  classification: ClassificationResult;
  serverFunctions: ClassifiedFunction[];
  clientFunctions: ClassifiedFunction[];
  sharedFunctions: ClassifiedFunction[];
  serverFunctionFiles: Set<string>;
}

export interface RspackBuildResult extends RspackCompileResult {
  clientBundle: string;
  serverBundle: string;
}

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
  /** Receives the latest analysis result after every analysis pass. */
  onResult?: (result: RspackCompileResult) => void | Promise<void>;
}

export interface BuildRspackProjectOptions extends UltimateRspackPluginOptions {
  projectRoot: string;
  config: ResolvedConfig;
  distDir?: string;
}
