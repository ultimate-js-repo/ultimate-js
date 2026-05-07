import type { ClassifiedFunction } from "@ultimate-js/analyzer";
import type { RouteRecord } from "@ultimate-js/router";
import type { ResolvedConfig } from "@ultimate-js/core";

export function generateClientEntryCode(
  routes: RouteRecord[],
  rpcBase: string,
): string {
  const imports: string[] = [
    `import React from "react";`,
    `import { createRoot } from "react-dom/client";`,
    `import { Router } from "@ultimate-js/react";`,
    `import { setRemoteEndpoint } from "@ultimate-js/rpc-client";`,
  ];
  const layoutAlias = new Map<string, string>();
  let idx = 0;

  for (const route of routes) {
    for (const layout of route.layoutFiles) {
      if (!layoutAlias.has(layout)) {
        const alias = `layout${idx++}`;
        layoutAlias.set(layout, alias);
        imports.push(`import * as ${alias} from ${JSON.stringify(layout)};`);
      }
    }
  }

  const entries: string[] = [];
  for (const route of routes) {
    const alias = `page${idx++}`;
    imports.push(`import * as ${alias} from ${JSON.stringify(route.file)};`);
    const layouts = route.layoutFiles
      .map((layout) => `${layoutAlias.get(layout)!}.default`)
      .join(", ");
    entries.push(`  {
    id: ${JSON.stringify(route.id)},
    path: ${JSON.stringify(route.path)},
    component: ${alias}.default,
    layouts: [${layouts}],
  }`);
  }

  return `${imports.join("\n")}

const routes = [
${entries.join(",\n")}
];

setRemoteEndpoint(${JSON.stringify(rpcBase)});

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    React.createElement(Router, { routes }),
  );
}
`;
}

export function generateClientProxyJs(
  serverFunctions: ClassifiedFunction[],
): string {
  const lines = [
    `import { remoteFunctionCall } from "@ultimate-js/rpc-client";`,
    ``,
  ];
  for (const fn of serverFunctions) {
    const name = fn.info.exportName || fn.info.name;
    lines.push(`export function ${name}(...args) {`);
    lines.push(
      `  return remoteFunctionCall(${JSON.stringify(fn.info.id)}, args);`,
    );
    lines.push(`}`);
    lines.push(``);
  }
  return lines.join("\n");
}

export function generateServerEntryCode(
  serverFunctions: ClassifiedFunction[],
  config: ResolvedConfig,
): string {
  const imports = [
    `import { Hono } from "hono";`,
    `import { cors } from "hono/cors";`,
    `import { createRpcHandler } from "@ultimate-js/rpc-server";`,
  ];
  const byFile = new Map<string, ClassifiedFunction[]>();
  for (const fn of serverFunctions) {
    const existing = byFile.get(fn.info.file) ?? [];
    existing.push(fn);
    byFile.set(fn.info.file, existing);
  }

  let idx = 0;
  const manifestEntries: string[] = [];
  for (const [file, fns] of byFile) {
    const names = [
      ...new Set(fns.map((fn) => fn.info.exportName || fn.info.name)),
    ];
    const alias = `serverMod${idx++}`;
    if (names.length === 1 && names[0] === "default") {
      imports.push(`import ${alias} from ${JSON.stringify(file)};`);
      manifestEntries.push(`  ${JSON.stringify(fns[0].info.id)}: ${alias},`);
    } else {
      imports.push(
        `import { ${names.join(", ")} } from ${JSON.stringify(file)};`,
      );
      for (const fn of fns) {
        const name = fn.info.exportName || fn.info.name;
        manifestEntries.push(`  ${JSON.stringify(fn.info.id)}: ${name},`);
      }
    }
  }

  const { port, host, endpoint } = config.server;
  const ep = endpoint.replace(/\/+$/, "");

  return `${imports.join("\n")}

const serverManifest = {
${manifestEntries.join("\n")}
};

const defaultRuntimeOptions = {
  port: ${JSON.stringify(port)},
  host: ${JSON.stringify(host)},
  endpoint: ${JSON.stringify(ep)},
};

function parseRuntimeOptions() {
  const flags = new Map();
  for (let i = 0; i < Deno.args.length; i++) {
    const arg = Deno.args[i];
    if (!arg.startsWith("--")) continue;
    const raw = arg.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      flags.set(raw.slice(0, eq), raw.slice(eq + 1));
      continue;
    }
    const next = Deno.args[i + 1];
    if (next && !next.startsWith("-")) {
      flags.set(raw, next);
      i++;
    }
  }

  return {
    port: parsePort(flag(flags, ["port", "listen-port"]) ?? env(["ULTIMATE_SERVER_PORT", "ULTIMATE_PORT", "PORT"]) ?? String(defaultRuntimeOptions.port), "port"),
    host: flag(flags, ["host", "listen-host", "hostname"]) ?? env(["ULTIMATE_SERVER_HOST", "ULTIMATE_HOST", "HOST"]) ?? defaultRuntimeOptions.host,
    endpoint: normalizeEndpoint(flag(flags, ["rpc-endpoint", "endpoint"]) ?? env(["ULTIMATE_SERVER_RPC_ENDPOINT", "ULTIMATE_RPC_ENDPOINT", "RPC_ENDPOINT", "ENDPOINT"]) ?? defaultRuntimeOptions.endpoint),
  };
}

function flag(flags, names) {
  for (const name of names) {
    const value = flags.get(name);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
}

function env(names) {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value?.trim()) return value.trim();
  }
}

function parsePort(value, source) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(source + " must be a valid TCP port");
  }
  return port;
}

function normalizeEndpoint(endpoint) {
  const trimmed = endpoint.trim();
  if (!trimmed.startsWith("/")) return ("/" + trimmed).replace(/\\/+$/, "");
  return trimmed.replace(/\\/+$/, "") || "/";
}

const runtimeOptions = parseRuntimeOptions();
const app = new Hono();
const dev = Deno.env.get("DENO_ENV") !== "production";

app.use(runtimeOptions.endpoint + "/*", cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Accept", "Ultimate-Session-Cursor"],
}));

const rpcHandler = createRpcHandler({
  manifest: serverManifest,
  dev,
  createContext(request) {
    return { request };
  },
});

app.post(runtimeOptions.endpoint + "/:functionId", async (c) => {
  return await rpcHandler(c.req.raw, c.req.param("functionId"));
});

app.options(runtimeOptions.endpoint + "/:functionId", async (c) => {
  return await rpcHandler(c.req.raw, c.req.param("functionId"));
});

app.all("*", (c) => {
  return c.text("Not found", 404);
});

const displayHost = runtimeOptions.host === "0.0.0.0"
  ? "localhost"
  : runtimeOptions.host;
console.log("Listening on http://" + runtimeOptions.host + ":" + runtimeOptions.port + "/ (http://" + displayHost + ":" + runtimeOptions.port + "/)");
Deno.serve({ port: runtimeOptions.port, hostname: runtimeOptions.host, onListen() {} }, app.fetch);
`;
}
