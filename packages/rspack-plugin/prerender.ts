import { join, toFileUrl } from "@std/path";
import type { RouteRecord, RouteSegment } from "@ultimate-js/router";

export interface PrerenderedRoute {
  path: string;
  html: string;
}

type SerializableRoute = {
  file: string;
  path: string;
  segments: RouteSegment[];
  layoutFiles: string[];
};

export async function prerenderRoutes(
  projectRoot: string,
  routes: RouteRecord[],
): Promise<PrerenderedRoute[]> {
  const serializableRoutes: SerializableRoute[] = routes.map((route) => ({
    file: toFileUrl(route.file).href,
    path: route.path,
    segments: route.segments,
    layoutFiles: route.layoutFiles.map((file) => toFileUrl(file).href),
  }));

  const code = `
try {
const routes = ${JSON.stringify(serializableRoutes)};
const React = await import("react");
const { renderToString } = await import("npm:react-dom@19/server");
const { RouteParamsProvider } = await import("@ultimate-js/react");

function concretePath(routePath, params) {
  let path = routePath;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(":" + key, String(value));
    path = path.replace("*" + key, String(value));
  }
  return path.replace(/\\/+$/, "") || "/";
}

function routeParamSets(route, pageModule) {
  const hasDynamic = route.segments.some((segment) =>
    segment.type === "param" || segment.type === "catchAll"
  );
  if (!hasDynamic) return [{}];
  if (typeof pageModule.generateStaticParams !== "function") return [];
  return pageModule.generateStaticParams();
}

const pages = [];
for (const route of routes) {
  try {
    const pageModule = await import(route.file);
    const paramSets = await routeParamSets(route, pageModule);
    const layoutModules = [];
    for (const layoutFile of route.layoutFiles) {
      layoutModules.push(await import(layoutFile));
    }

    for (const params of paramSets) {
      let element = React.createElement(pageModule.default, { params });
      for (let i = layoutModules.length - 1; i >= 0; i--) {
        element = React.createElement(layoutModules[i].default, null, element);
      }
      element = React.createElement(RouteParamsProvider, { params }, element);
      pages.push({
        path: concretePath(route.path, params),
        html: renderToString(element),
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    throw new Error("failed to prerender " + route.path + ":\\n" + message);
  }
}

console.log(JSON.stringify(pages));
Deno.exit(0);
} catch (err) {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(message);
  Deno.exit(1);
}
`;
  const command = new Deno.Command(Deno.execPath(), {
    args: ["eval", "--no-check", "--config", "deno.json", code],
    cwd: projectRoot,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    const stdout = new TextDecoder().decode(output.stdout);
    throw new Error(
      `failed to prerender routes:\n${stderr}${stdout}`.substring(0, 4000),
    );
  }

  const stdout = new TextDecoder().decode(output.stdout).trim();
  return stdout ? JSON.parse(stdout) as PrerenderedRoute[] : [];
}

export function htmlFileForRoute(clientDir: string, path: string): string {
  const cleanPath = path.replace(/\/+$/, "") || "/";
  if (cleanPath === "/") return join(clientDir, "index.html");
  const parts = cleanPath.split("/").filter(Boolean);
  return join(clientDir, ...parts, "index.html");
}
