import { exists } from "@std/fs";

export type ServerOutput = "standalone" | "executable";
export type BundlerType = "native" | "vite" | "rspack";
export type ParserType = "babel" | "swc";
export type FrameworkType = "react";

export interface UltimateConfig {
  /** Client bundler (default: "native" — Deno bundle) */
  bundler?: BundlerType;
  /** AST parser for source analysis (default: "babel") */
  parser?: ParserType;
  /** UI framework (default: "react") */
  framework?: FrameworkType;

  server?: {
    port?: number;
    host?: string;
    endpoint?: string;
    output?: ServerOutput;
  };
  dev?: {
    port?: number;
    apiPort?: number;
  };
  client?: {
    apiUrl?: string;
  };
}

export interface ResolvedConfig {
  bundler: BundlerType;
  parser: ParserType;
  framework: FrameworkType;
  server: {
    port: number;
    host: string;
    endpoint: string;
    output: ServerOutput;
  };
  dev: { port: number; apiPort: number };
  client: { rpcBase: string };
}

export function defineConfig(config: UltimateConfig): UltimateConfig {
  return config;
}

export function resolveConfig(config: UltimateConfig = {}): ResolvedConfig {
  const endpoint = config.server?.endpoint ?? "/_ultimate/rpc";
  const ep = endpoint.replace(/\/+$/, "");

  let rpcBase: string;
  if (config.client?.apiUrl) {
    const base = config.client.apiUrl.replace(/\/+$/, "");
    rpcBase = base + ep;
  } else {
    rpcBase = ep;
  }

  return {
    bundler: config.bundler ?? "native",
    parser: config.parser ?? "babel",
    framework: config.framework ?? "react",
    server: {
      port: config.server?.port ?? 8000,
      host: config.server?.host ?? "0.0.0.0",
      endpoint,
      output: config.server?.output ?? "standalone",
    },
    dev: {
      port: config.dev?.port ?? 8000,
      apiPort: config.dev?.apiPort ?? 8001,
    },
    client: { rpcBase },
  };
}

export async function loadConfig(projectRoot: string): Promise<ResolvedConfig> {
  const { runtimeImport } = await import("./runtime-import.ts");
  for (const name of ["ultimate.config.ts", "ultimate.config.js"]) {
    const path = `${projectRoot}/${name}`;
    if (!(await exists(path, { isFile: true }))) continue;
    const mod = await runtimeImport(path);
    return resolveConfig(mod.default as UltimateConfig | undefined);
  }
  return resolveConfig();
}
