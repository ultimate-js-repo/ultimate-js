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
  outDir: string;
  rpcBase: string;
  cssImports?: string[];
}): Record<string, unknown> {
  const proxySpec = dataModule(
    generateClientProxyJs(options.result.serverFunctions),
  );
  const aliases = {
    ...options.aliases,
    "ultimate-rpc-client-config": packagePath("../rpc-client/config.ts"),
    "ultimate-rpc-client-remote-call": packagePath(
      "../rpc-client/remote-call.ts",
    ),
  };

  return baseRspackConfig({
    projectRoot: options.projectRoot,
    aliases,
    entry: {
      client: dataModule(
        generateClientEntryCode(
          options.result.routes,
          options.rpcBase,
          options.cssImports,
        ),
      ),
    },
    outDir: options.outDir,
    outFilename: "assets/[name].[contenthash:8].js",
    chunkFilename: "assets/chunks/[name].[contenthash:8].js",
    cssFilename: "assets/[name].[contenthash:8].css",
    cssChunkFilename: "assets/chunks/[name].[contenthash:8].css",
    publicPath: "/",
    optimization: {
      splitChunks: { chunks: "all" },
      runtimeChunk: "single",
    },
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
    outputLibrary: { type: "module" },
    optimization: {
      usedExports: false,
      minimize: false,
    },
  });
}

function baseRspackConfig(options: {
  projectRoot: string;
  aliases: Record<string, string>;
  entry: string | Record<string, string>;
  outDir: string;
  outFilename: string;
  chunkFilename?: string;
  cssFilename?: string;
  cssChunkFilename?: string;
  outputLibrary?: Record<string, unknown>;
  publicPath?: string;
  optimization?: Record<string, unknown>;
  extraRuleUse?: unknown[];
}): Record<string, unknown> {
  return {
    mode: "production",
    target: "web",
    context: options.projectRoot,
    entry: options.entry,
    output: {
      path: options.outDir,
      filename: options.outFilename,
      ...(options.chunkFilename
        ? { chunkFilename: options.chunkFilename }
        : {}),
      ...(options.cssFilename ? { cssFilename: options.cssFilename } : {}),
      ...(options.cssChunkFilename
        ? { cssChunkFilename: options.cssChunkFilename }
        : {}),
      ...(options.outputLibrary ? { library: options.outputLibrary } : {}),
      ...(options.publicPath ? { publicPath: options.publicPath } : {}),
    },
    ...(options.optimization ? { optimization: options.optimization } : {}),
    externals: {
      hono: "hono",
      "hono/cors": "hono/cors",
      "node:async_hooks": "node:async_hooks",
    },
    externalsType: "module",
    experiments: {
      outputModule: true,
      css: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
      alias: options.aliases,
      modules: [join(options.projectRoot, "node_modules"), "node_modules"],
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          type: "css",
        },
        {
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
        },
      ],
    },
  };
}

function dataModule(code: string): string {
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
}

function loaderPath(name: string): string {
  return fromFileUrl(new URL(`./${name}`, import.meta.url));
}

function packagePath(path: string): string {
  return fromFileUrl(new URL(path, import.meta.url));
}
