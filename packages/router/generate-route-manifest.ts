import { relative } from "@std/path";
import type { RouteRecord } from "./route-types.ts";

/**
 * Generate route manifest code with nested layout support.
 */
export function generateRouteManifestCode(
  routes: RouteRecord[],
  generatedDir: string,
): string {
  const imports: string[] = [];
  const entries: string[] = [];
  let idx = 0;

  // Deduplicate layout imports
  const layoutAlias = new Map<string, string>();

  for (const route of routes) {
    for (const lf of route.layoutFiles) {
      if (!layoutAlias.has(lf)) {
        const alias = `layout${idx++}`;
        layoutAlias.set(lf, alias);
        const relPath = relative(generatedDir, lf);
        const cleanPath = relPath.startsWith(".") ? relPath : "./" + relPath;
        imports.push(`import * as ${alias} from ${JSON.stringify(cleanPath)}`);
      }
    }
  }

  for (const route of routes) {
    const pageAlias = `page${idx++}`;
    const relPath = relative(generatedDir, route.file);
    const cleanPath = relPath.startsWith(".") ? relPath : "./" + relPath;
    imports.push(`import * as ${pageAlias} from ${JSON.stringify(cleanPath)}`);

    const layoutRefs = route.layoutFiles
      .map((lf) => `${layoutAlias.get(lf)!}.default`)
      .join(", ");

    entries.push(`  {
    id: ${JSON.stringify(route.id)},
    path: ${JSON.stringify(route.path)},
    component: ${pageAlias}.default,
    layouts: [${layoutRefs}],
  }`);
  }

  return `${imports.join("\n")}

export const routes = [
${entries.join(",\n")}
];
`;
}
