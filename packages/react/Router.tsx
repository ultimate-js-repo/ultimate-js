import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { RouteRecord, RouteSegment } from "@ultimate-js/router";
import { matchRoute } from "@ultimate-js/router";

type PageComponent = React.ComponentType<{ params?: Record<string, string> }>;
type LayoutComponent = React.ComponentType<{ children: React.ReactNode }>;

interface RouteEntry {
  id: string;
  path: string;
  component: PageComponent;
  layouts?: LayoutComponent[];
}

interface MatchState {
  component: PageComponent;
  params: Record<string, string>;
  layouts: LayoutComponent[];
}

const RouteParamsContext = createContext<Record<string, string>>({});

export function useRouteParams(): Record<string, string> {
  return useContext(RouteParamsContext);
}

export function Router(
  { routes }: { routes: RouteEntry[] },
): React.ReactElement {
  const [pathname, setPathname] = useState(() => globalThis.location.pathname);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveRoute = useCallback((path: string) => {
    setLoading(true);
    const records: RouteRecord[] = routes.map((r) => ({
      id: r.id,
      file: "",
      path: r.path,
      segments: parsePathToSegments(r.path),
      layoutFiles: [],
    }));

    const result = matchRoute(records, path);

    if (result) {
      const entry = routes.find((r) => r.id === result.route.id);
      if (entry) {
        setMatch({
          component: entry.component,
          params: result.params,
          layouts: entry.layouts || [],
        });
      } else {
        setMatch(null);
      }
    } else {
      setMatch(null);
    }
    setLoading(false);
  }, [routes]);

  useEffect(() => {
    resolveRoute(pathname);

    const handlePopState = (): void => {
      setPathname(globalThis.location.pathname);
      resolveRoute(globalThis.location.pathname);
    };

    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, [pathname, resolveRoute]);

  if (loading) {
    return React.createElement("div", null, "Loading...");
  }

  if (!match) {
    return React.createElement(
      "div",
      null,
      React.createElement("h1", null, "404"),
      React.createElement("p", null, "Page not found"),
    );
  }

  const { component: Component, params, layouts } = match;

  let element: React.ReactElement = React.createElement(Component, { params });
  for (let i = layouts.length - 1; i >= 0; i--) {
    element = React.createElement(layouts[i], null, element);
  }

  return React.createElement(
    RouteParamsContext.Provider,
    { value: params },
    element,
  );
}

function parsePathToSegments(path: string): RouteSegment[] {
  if (path === "/") return [];
  const parts = path.split("/").filter(Boolean);
  return parts.map((part): RouteSegment => {
    if (part.startsWith(":")) return { type: "param", name: part.slice(1) };
    if (part.startsWith("*")) return { type: "catchAll", name: part.slice(1) };
    return { type: "static", value: part };
  });
}
