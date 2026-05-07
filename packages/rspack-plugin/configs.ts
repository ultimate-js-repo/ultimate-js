import { dirname, fromFileUrl, join } from "@std/path";
import type { ResolvedConfig } from "@ultimate-js/core";
import type { RspackCompileResult } from "./types.ts";
import {
  generateClientEntryCode,
  generateClientProxyJs,
  generateServerEntryCode,
} from "./generate.ts";

export function createClientConfig(options: {
  projectRoot: string;
  appDir: string;
  result: RspackCompileResult;
  aliases: Record<string, string>;
  outFile: string;
  rpcBase: string;
}): Record<string, unknown> {
  const outDir = dirname(options.outFile);
  const outFilename = options.outFile.substring(
    options.outFile.lastIndexOf("/") + 1,
  );
  const proxySpec = dataModule(
    generateClientProxyJs(options.result.serverFunctions),
  );

  return baseRspackConfig({
    projectRoot: options.projectRoot,
    aliases: options.aliases,
    entry: dataModule(
      generateClientEntryCode(options.result.routes, options.rpcBase),
    ),
    outDir,
    outFilename,
    extraRuleUse: [{
      loader: loaderPath("client-transform-loader.cjs"),
      options: {
        appDir: options.appDir,
        proxySpec,
        serverFunctionFiles: [...options.result.serverFunctionFiles],
      },
    }],
  });
}

export function createServerConfig(options: {
  projectRoot: string;
  result: RspackCompileResult;
  aliases: Record<string, string>;
  outFile: string;
  config: ResolvedConfig;
}): Record<string, unknown> {
  const outDir = dirname(options.outFile);
  const outFilename = options.outFile.substring(
    options.outFile.lastIndexOf("/") + 1,
  );

  return baseRspackConfig({
    projectRoot: options.projectRoot,
    aliases: options.aliases,
    entry: dataModule(
      generateServerEntryCode(
        options.result.serverFunctions,
        options.config,
      ),
    ),
    outDir,
    outFilename,
  });
}

function baseRspackConfig(options: {
  projectRoot: string;
  aliases: Record<string, string>;
  entry: string;
  outDir: string;
  outFilename: string;
  extraRuleUse?: unknown[];
}): Record<string, unknown> {
  return {
    mode: "production",
    target: "web",
    context: options.projectRoot,
    entry: options.entry,
    output: { path: options.outDir, filename: options.outFilename },
    externals: {
      hono: "hono",
      "hono/cors": "hono/cors",
      "node:async_hooks": "node:async_hooks",
    },
    externalsType: "module",
    experiments: {
      outputModule: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
      alias: options.aliases,
      modules: [join(options.projectRoot, "node_modules"), "node_modules"],
    },
    module: {
      rules: [{
        test: /\.(tsx?|jsx?)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "builtin:swc-loader",
            options: {
              jsc: {
                parser: { syntax: "typescript", tsx: true },
                transform: { react: { runtime: "classic" } },
              },
            },
          },
          ...(options.extraRuleUse ?? []),
        ],
      }],
    },
  };
}

function dataModule(code: string): string {
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
}

function loaderPath(name: string): string {
  return fromFileUrl(new URL(`./${name}`, import.meta.url));
}
