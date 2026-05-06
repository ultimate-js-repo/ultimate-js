import type { RouteMatch, RouteRecord } from "./route-types.ts";

export function matchRoute(
  routes: RouteRecord[],
  pathname: string,
): RouteMatch | null {
  // Normalize pathname
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  const parts = normalized === "/"
    ? [""]
    : normalized.split("/").filter(Boolean);

  for (const route of routes) {
    const match = matchSegments(route.segments, parts);
    if (match !== null) {
      return { route, params: match };
    }
  }

  return null;
}

function matchSegments(
  segments: RouteRecord["segments"],
  parts: string[],
): Record<string, string> | null {
  const params: Record<string, string> = {};

  // Handle root route with no segments (index file)
  if (segments.length === 0 && (parts.length === 1 && parts[0] === "")) {
    return params;
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.type === "catchAll") {
      // Catch-all matches remaining parts
      params[seg.name] = parts.slice(i).join("/");
      return params;
    }

    if (i >= parts.length) {
      return null; // Not enough URL parts
    }

    const part = parts[i];

    if (seg.type === "static") {
      if (seg.value !== part) return null;
    } else if (seg.type === "param") {
      params[seg.name] = part;
    }
  }

  // Must consume exactly all parts
  if (segments.length !== parts.length) {
    // Unless last segment is catchAll (already handled above)
    return null;
  }

  return params;
}
