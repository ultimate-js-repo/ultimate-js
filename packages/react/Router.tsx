import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RouteRecord, RouteSegment } from "@ultimate-js/router";
import { matchRoute } from "@ultimate-js/router";

export type PageComponent = React.ComponentType<{
  params?: Record<string, string>;
}>;
export type LayoutComponent = React.ComponentType<{
  children: React.ReactNode;
}>;
export type PageModule = { default: PageComponent };
export type LayoutModule = { default: LayoutComponent };

export interface RouteEntry {
  id: string;
  path: string;
  segments?: RouteSegment[];
  load: () => Promise<PageModule>;
  layouts?: Array<() => Promise<LayoutModule>>;
}

export interface RouteMatchState {
  component: PageComponent;
  params: Record<string, string>;
  layouts: LayoutComponent[];
}

const RouteParamsContext = createContext<Record<string, string>>({});

export function RouteParamsProvider(
  { params, children }: {
    params: Record<string, string>;
    children: React.ReactNode;
  },
): React.ReactElement {
  return React.createElement(
    RouteParamsContext.Provider,
    { value: params },
    children,
  );
}

export function useRouteParams(): Record<string, string> {
  return useContext(RouteParamsContext);
}

export function Router(
  { routes, initialMatch }: {
    routes: RouteEntry[];
    initialMatch?: RouteMatchState | null;
  },
): React.ReactElement {
  const [pathname, setPathname] = useState(() => globalThis.location.pathname);
  const [match, setMatch] = useState<RouteMatchState | null>(
    initialMatch ?? null,
  );
  const [loading, setLoading] = useState(!initialMatch);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const requestId = useRef(0);
  const skipInitialResolve = useRef(!!initialMatch);

  const resolveRoute = useCallback(async (path: string) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const nextMatch = await loadRouteMatch(routes, path);
      if (currentRequest !== requestId.current) return;
      setMatch(nextMatch);
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setLoadError(err instanceof Error ? err : new Error(String(err)));
      setMatch(null);
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [routes]);

  useEffect(() => {
    if (skipInitialResolve.current) {
      skipInitialResolve.current = false;
    } else {
      void resolveRoute(pathname);
    }

    const handlePopState = (): void => {
      setPathname(globalThis.location.pathname);
    };

    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, [pathname, resolveRoute]);

  if (loading) {
    return React.createElement("div", null, "Loading...");
  }

  if (loadError) {
    return React.createElement(
      "div",
      null,
      React.createElement("h1", null, "Route load failed"),
      React.createElement("p", null, loadError.message),
    );
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
    RouteParamsProvider,
    { params },
    element,
  );
}

export async function loadRouteMatch(
  routes: RouteEntry[],
  path: string,
): Promise<RouteMatchState | null> {
  const records: RouteRecord[] = routes.map((route) => ({
    id: route.id,
    file: "",
    path: route.path,
    segments: route.segments ?? parsePathToSegments(route.path),
    layoutFiles: [],
  }));
  const result = matchRoute(records, path);
  if (!result) return null;

  const entry = routes.find((route) => route.id === result.route.id);
  if (!entry) return null;

  const [pageModule, layoutModules] = await Promise.all([
    entry.load(),
    Promise.all((entry.layouts ?? []).map((load) => load())),
  ]);

  return {
    component: pageModule.default,
    params: result.params,
    layouts: layoutModules.map((mod) => mod.default),
  };
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
