# @ultimate-js/react

React runtime components for Ultimate.js.

## Exports

- `Router` — SPA router with nested layout support
- `Link` — SPA-aware `<a>` tag (uses `history.pushState`)
- `useRouteParams()` — access current route parameters
- `useRemoteQuery(fn, ...args)` — data fetching hook

## Usage

```tsx
import { Link, Router, useRouteParams } from "@ultimate-js/react";

function UserPage() {
  const { id } = useRouteParams();
  return <Link href="/">Back</Link>;
}
```
