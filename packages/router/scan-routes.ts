import { join, relative } from "@std/path";
import { expandGlob } from "@std/fs";
import type { RouteSegment, RouteRecord } from "./route-types.ts";
import { routeIdFromFile } from "./route-id.ts";

const PAGE_RE = /^page\.(tsx?|jsx?)$/;
const LAYOUT_RE = /^layout\.(tsx?|jsx?)$/;

function parseSegments(relDir: string): RouteSegment[] {
  if (!relDir || relDir === ".") return [];
  return relDir.split("/").filter(Boolean).map((part): RouteSegment => {
    if (part.startsWith("[...") && part.endsWith("]")) {
      return { type: "catchAll", name: part.slice(4, -1) };
    }
    if (part.startsWith("[") && part.endsWith("]")) {
      return { type: "param", name: part.slice(1, -1) };
    }
    return { type: "static", value: part };
  });
}

function segmentsToPath(segments: RouteSegment[]): string {
  if (segments.length === 0) return "/";
  const parts = segments.map((s) => {
    if (s.type === "static") return s.value;
    if (s.type === "param") return `:${s.name}`;
    return `*${s.name}`;
  });
  return "/" + parts.join("/");
}

/**
 * Scan appDir for page.tsx files (Next.js App Router convention).
 *
 *   app/page.tsx             → /
 *   app/about/page.tsx       → /about
 *   app/users/[id]/page.tsx  → /users/:id
 *
 * Also collects the layout.tsx chain for each route.
 */
export async function scanRoutes(appDir: string): Promise<RouteRecord[]> {
  const routes: RouteRecord[] = [];
  const layouts = new Map<string, string>();

  // 1. Collect layout files
  for await (const entry of expandGlob(join(appDir, "**", "layout.*"), {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.ultimate/**"],
  })) {
    const basename = entry.path.split("/").pop() || "";
    if (LAYOUT_RE.test(basename)) {
      const dir = entry.path.substring(0, entry.path.lastIndexOf("/"));
      layouts.set(dir, entry.path);
    }
  }

  // 2. Collect page files
  for await (const entry of expandGlob(join(appDir, "**", "page.*"), {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.ultimate/**"],
  })) {
    const basename = entry.path.split("/").pop() || "";
    if (!PAGE_RE.test(basename)) continue;

    const pageDir = entry.path.substring(0, entry.path.lastIndexOf("/"));
    const relDir = relative(appDir, pageDir);
    const segments = parseSegments(relDir);
    const routePath = segmentsToPath(segments);

    // Build layout chain from root to current dir
    const layoutFiles: string[] = [];
    if (layouts.has(appDir)) {
      layoutFiles.push(layouts.get(appDir)!);
    }
    if (relDir && relDir !== ".") {
      let cur = appDir;
      for (const part of relDir.split("/")) {
        cur = join(cur, part);
        if (layouts.has(cur)) {
          layoutFiles.push(layouts.get(cur)!);
        }
      }
    }

    routes.push({
      id: routeIdFromFile(appDir, entry.path),
      file: entry.path,
      path: routePath,
      segments,
      layoutFiles,
    });
  }

  return routes;
}
