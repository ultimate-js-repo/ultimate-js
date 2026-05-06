import { join } from "@std/path";
import { copyDir, writeTextFile } from "./utils.ts";
import type { ResolvedConfig } from "@ultimate-js/core";

/**
 * Build the server bundle by copying required files,
 * then optionally compile to a standalone executable.
 */
export async function buildServer(
  projectRoot: string,
  distDir: string,
  appDir: string,
  generatedDir: string,
  config: ResolvedConfig,
): Promise<void> {
  const serverDist = join(distDir, "server");

  await copyDir(join(distDir, "client"), join(serverDist, "client"));
  await copyDir(generatedDir, join(serverDist, ".ultimate", "generated"));
  await copyDir(
    join(appDir, "functions"),
    join(serverDist, "app", "functions"),
  );

  try {
    await copyDir(join(appDir, "shared"), join(serverDist, "app", "shared"));
  } catch { /* no shared dir */ }

  const serverMain = generateServerMainCode(config);
  await writeTextFile(join(serverDist, "main.ts"), serverMain);

  console.log(`  Server bundle: ${serverDist}`);

  if (config.server.output === "executable") {
    await compileServerExecutable(projectRoot, serverDist);
  }
}

/**
 * Compile the server into a standalone executable via `deno compile`.
 */
async function compileServerExecutable(
  projectRoot: string,
  serverDist: string,
): Promise<void> {
  const mainTs = join(serverDist, "main.ts");
  const outBin = join(serverDist, "server");

  console.log(`  Compiling executable...`);

  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "compile",
      "-A",
      "--no-check",
      "--output",
      outBin,
      mainTs,
    ],
    cwd: projectRoot,
    stdout: "piped",
    stderr: "piped",
  });

  const output = await command.output();

  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    console.error(`  Error: deno compile failed:\n${stderr.substring(0, 500)}`);
  } else {
    console.log(`  Executable: ${outBin}`);
  }
}

function generateServerMainCode(config: ResolvedConfig): string {
  const { port, host, endpoint } = config.server;
  const ep = endpoint.replace(/\/+$/, "");

  return `// Ultimate.js Server Entry
// Auto-generated - do not edit
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createStaticHandler } from "@ultimate-js/hono";
import { createRpcHandler } from "@ultimate-js/rpc-server";
import { serverManifest } from "./.ultimate/generated/server-manifest.ts";

const app = new Hono();
const dev = Deno.env.get("DENO_ENV") !== "production";
const serveClient = createStaticHandler(
  new URL("./client", import.meta.url).pathname,
);

app.use(${JSON.stringify(ep + "/*")}, cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Content-Type"],
}));

const rpcHandler = createRpcHandler({
  manifest: serverManifest,
  dev,
  createContext(request) {
    return { request, now: new Date() };
  },
});

app.post(${JSON.stringify(ep + "/:functionId")}, async (c) => {
  return await rpcHandler(c.req.raw, c.req.param("functionId"));
});

app.get("*", async (c) => {
  const pathname = new URL(c.req.raw.url).pathname;
  const staticResponse = await serveClient(c.req.raw, pathname);
  if (staticResponse) return staticResponse;

  const indexResponse = await serveClient(c.req.raw, "/index.html");
  if (indexResponse) return indexResponse;

  return c.html(\`<!doctype html>
<html>
<head><meta charset="UTF-8"/><title>Ultimate.js</title></head>
<body><div id="root"></div><script type="module" src="/assets/client.js"></script></body>
</html>\`);
});

Deno.serve({
  port: parseInt(Deno.env.get("PORT") || ${JSON.stringify(String(port))}),
  hostname: ${JSON.stringify(host)},
}, app.fetch);
`;
}
