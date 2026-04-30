export type RouteSegment =
  | { type: "static"; value: string }
  | { type: "param"; name: string }
  | { type: "catchAll"; name: string };

export type RouteRecord = {
  id: string;
  file: string;
  path: string;
  segments: RouteSegment[];
  /** Layout files from root to leaf */
  layoutFiles: string[];
};

export type RouteMatch = {
  route: RouteRecord;
  params: Record<string, string>;
};
