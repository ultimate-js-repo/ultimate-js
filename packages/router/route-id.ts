import { hashId } from "@ultimate-js/core";
import { relative } from "@std/path";

export function routeIdFromFile(appDir: string, filePath: string): string {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  const rel = relative(appDir, dir) || ".";
  return "route_" + hashId(rel);
}
