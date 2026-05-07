import type {
  BundlerType,
  ParserType,
  ResolvedConfig,
} from "@ultimate-js/core";

export interface CommandOptions {
  project: string;
  rest: string[];
}

export interface RuntimeOverrides {
  port?: number;
  apiPort?: number;
  host?: string;
  endpoint?: string;
}

export interface BuildOverrides extends RuntimeOverrides {
  bundler?: BundlerType;
  parser?: ParserType;
}

type FlagValue = string | true;

export function parseCommandOptions(args: string[]): CommandOptions {
  const positional: string[] = [];
  const rest: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") {
      rest.push(...args.slice(i + 1));
      break;
    }
    if (arg.startsWith("-")) {
      rest.push(arg);
      const next = args[i + 1];
      if (!arg.includes("=") && next && !next.startsWith("-")) {
        rest.push(next);
        i++;
      }
      continue;
    }
    positional.push(arg);
  }

  return {
    project: positional[0] ?? ".",
    rest,
  };
}

export function applyDevOverrides(
  config: ResolvedConfig,
  args: string[],
  env: Deno.Env = Deno.env,
): ResolvedConfig {
  const overrides = readRuntimeOverrides(args, env, {
    portEnv: ["ULTIMATE_DEV_PORT", "ULTIMATE_PORT", "PORT"],
    apiPortEnv: ["ULTIMATE_DEV_API_PORT", "ULTIMATE_API_PORT", "API_PORT"],
    hostEnv: ["ULTIMATE_DEV_HOST", "ULTIMATE_HOST", "HOST"],
    endpointEnv: [
      "ULTIMATE_DEV_RPC_ENDPOINT",
      "ULTIMATE_RPC_ENDPOINT",
      "RPC_ENDPOINT",
      "ENDPOINT",
    ],
  });

  return mergeConfig(config, overrides, { updateDev: true });
}

export function applyServerOverrides(
  config: ResolvedConfig,
  args: string[],
  env: Deno.Env = Deno.env,
): ResolvedConfig {
  const overrides = readRuntimeOverrides(args, env, {
    portEnv: ["ULTIMATE_SERVER_PORT", "ULTIMATE_PORT", "PORT"],
    hostEnv: ["ULTIMATE_SERVER_HOST", "ULTIMATE_HOST", "HOST"],
    endpointEnv: [
      "ULTIMATE_SERVER_RPC_ENDPOINT",
      "ULTIMATE_RPC_ENDPOINT",
      "RPC_ENDPOINT",
      "ENDPOINT",
    ],
  });

  return mergeConfig(config, overrides, { updateServer: true });
}

export function applyBuildOverrides(
  config: ResolvedConfig,
  args: string[],
  env: Deno.Env = Deno.env,
): ResolvedConfig {
  const flags = parseFlags(args);
  const runtimeOverrides = readRuntimeOverridesFromFlags(flags, env, {
    portEnv: ["ULTIMATE_SERVER_PORT", "ULTIMATE_PORT", "PORT"],
    hostEnv: ["ULTIMATE_SERVER_HOST", "ULTIMATE_HOST", "HOST"],
    endpointEnv: [
      "ULTIMATE_SERVER_RPC_ENDPOINT",
      "ULTIMATE_RPC_ENDPOINT",
      "RPC_ENDPOINT",
      "ENDPOINT",
    ],
  });
  const buildOverrides = readBuildOverrides(flags, env);
  const merged = mergeConfig(config, runtimeOverrides, { updateServer: true });

  return {
    ...merged,
    bundler: buildOverrides.bundler ?? merged.bundler,
    parser: buildOverrides.parser ?? merged.parser,
  };
}

function mergeConfig(
  config: ResolvedConfig,
  overrides: RuntimeOverrides,
  opts: { updateDev?: boolean; updateServer?: boolean },
): ResolvedConfig {
  const endpoint = normalizeEndpoint(
    overrides.endpoint ?? config.server.endpoint,
  );
  const rpcBase = resolveRpcBase(
    config.client.rpcBase,
    config.server.endpoint,
    endpoint,
  );

  return {
    ...config,
    server: {
      ...config.server,
      port: opts.updateServer
        ? overrides.port ?? config.server.port
        : config.server.port,
      host: overrides.host ?? config.server.host,
      endpoint,
    },
    dev: {
      ...config.dev,
      port: opts.updateDev
        ? overrides.port ?? config.dev.port
        : config.dev.port,
      apiPort: opts.updateDev
        ? overrides.apiPort ?? config.dev.apiPort
        : config.dev.apiPort,
      host: overrides.host ?? config.dev.host,
    },
    client: { rpcBase },
  };
}

function resolveRpcBase(
  currentRpcBase: string,
  oldEndpoint: string,
  newEndpoint: string,
): string {
  const oldEp = normalizeEndpoint(oldEndpoint);
  if (currentRpcBase === oldEp) return newEndpoint;
  if (currentRpcBase.endsWith(oldEp)) {
    return currentRpcBase.slice(0, -oldEp.length) + newEndpoint;
  }
  return currentRpcBase;
}

function readRuntimeOverrides(
  args: string[],
  env: Deno.Env,
  names: {
    portEnv: string[];
    apiPortEnv?: string[];
    hostEnv: string[];
    endpointEnv: string[];
  },
): RuntimeOverrides {
  return readRuntimeOverridesFromFlags(parseFlags(args), env, names);
}

function readRuntimeOverridesFromFlags(
  flags: Map<string, FlagValue>,
  env: Deno.Env,
  names: {
    portEnv: string[];
    apiPortEnv?: string[];
    hostEnv: string[];
    endpointEnv: string[];
  },
): RuntimeOverrides {
  return {
    port: readPortFlag(flags, ["port", "listen-port"]) ??
      readPortEnv(env, names.portEnv),
    apiPort: readPortFlag(flags, ["api-port", "apiPort"]) ??
      readPortEnv(env, names.apiPortEnv ?? []),
    host: readStringFlag(flags, ["host", "listen-host", "hostname"]) ??
      readStringEnv(env, names.hostEnv),
    endpoint: readStringFlag(flags, ["rpc-endpoint", "endpoint"]) ??
      readStringEnv(env, names.endpointEnv),
  };
}

function readBuildOverrides(
  flags: Map<string, FlagValue>,
  env: Deno.Env,
): Pick<BuildOverrides, "bundler" | "parser"> {
  return {
    bundler: readBundlerFlag(flags, ["bundler"]) ??
      readBundlerEnv(env, ["ULTIMATE_BUILD_BUNDLER", "ULTIMATE_BUNDLER"]),
    parser: readParserFlag(flags, ["parser"]) ??
      readParserEnv(env, ["ULTIMATE_BUILD_PARSER", "ULTIMATE_PARSER"]),
  };
}

function parseFlags(args: string[]): Map<string, FlagValue> {
  const flags = new Map<string, FlagValue>();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;

    const trimmed = arg.slice(2);
    const eq = trimmed.indexOf("=");
    if (eq >= 0) {
      flags.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
      continue;
    }

    const next = args[i + 1];
    if (next && !next.startsWith("-")) {
      flags.set(trimmed, next);
      i++;
    } else {
      flags.set(trimmed, true);
    }
  }

  return flags;
}

function readPortFlag(
  flags: Map<string, FlagValue>,
  names: string[],
): number | undefined {
  for (const name of names) {
    const value = flags.get(name);
    if (typeof value === "string") return parsePort(value, `--${name}`);
  }
}

function readStringFlag(
  flags: Map<string, FlagValue>,
  names: string[],
): string | undefined {
  for (const name of names) {
    const value = flags.get(name);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
}

function readBundlerFlag(
  flags: Map<string, FlagValue>,
  names: string[],
): BundlerType | undefined {
  for (const name of names) {
    const value = flags.get(name);
    if (typeof value === "string") return parseBundler(value, `--${name}`);
  }
}

function readParserFlag(
  flags: Map<string, FlagValue>,
  names: string[],
): ParserType | undefined {
  for (const name of names) {
    const value = flags.get(name);
    if (typeof value === "string") return parseParser(value, `--${name}`);
  }
}

function readPortEnv(env: Deno.Env, names: string[]): number | undefined {
  for (const name of names) {
    const value = env.get(name);
    if (value) return parsePort(value, name);
  }
}

function readStringEnv(env: Deno.Env, names: string[]): string | undefined {
  for (const name of names) {
    const value = env.get(name);
    if (value?.trim()) return value.trim();
  }
}

function readBundlerEnv(
  env: Deno.Env,
  names: string[],
): BundlerType | undefined {
  for (const name of names) {
    const value = env.get(name);
    if (value) return parseBundler(value, name);
  }
}

function readParserEnv(env: Deno.Env, names: string[]): ParserType | undefined {
  for (const name of names) {
    const value = env.get(name);
    if (value) return parseParser(value, name);
  }
}

function parsePort(value: string, source: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`${source} must be a valid TCP port`);
  }
  return port;
}

function parseBundler(value: string, source: string): BundlerType {
  const normalized = value.trim();
  if (
    normalized === "native" || normalized === "vite" || normalized === "rspack"
  ) {
    return normalized;
  }
  throw new Error(`${source} must be one of: native, vite, rspack`);
}

function parseParser(value: string, source: string): ParserType {
  const normalized = value.trim();
  if (normalized === "babel" || normalized === "swc") return normalized;
  throw new Error(`${source} must be one of: babel, swc`);
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed.startsWith("/")) return `/${trimmed}`.replace(/\/+$/, "");
  return trimmed.replace(/\/+$/, "") || "/";
}
