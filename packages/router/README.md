# @ultimate-js/router

File-based routing engine for Ultimate.js. Next.js App Router convention.

## Convention

```
app/page.tsx             → /
app/about/page.tsx       → /about
app/users/[id]/page.tsx  → /users/:id
app/docs/[...path]/page.tsx → /docs/*

app/layout.tsx           → root layout
app/users/layout.tsx     → nested layout for /users/*
```

## Exports

- `scanRoutes(appDir)` — scan for `page.tsx` and `layout.tsx` files
- `matchRoute(routes, pathname)` — match a URL to a route
- `generateRouteManifestCode(routes, outDir)` — generate route manifest
- **Types** — `RouteRecord`, `RouteSegment`, `RouteMatch`
