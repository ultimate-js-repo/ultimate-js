# Ultimate.js Showcase

A polished demo of the Ultimate.js framework featuring a dark-themed landing page with interactive components.

## Features Demonstrated

- **File-based routing** — `app/page.tsx` maps to `/`
- **Root layout** — `app/layout.tsx` provides navigation, styles, and document head
- **Server functions** — `getRandomUser()`, `incrementCounter()` run on the server
- **Client components** — `CounterButton`, `UserCard` use `"use client"` directive
- **Transparent RPC** — client imports server functions directly; the compiler handles the rest

## Run

```bash
deno task dev      # http://localhost:8000
deno task build
deno task preview
```

## Structure

```
app/
  layout.tsx              Root layout + CSS
  page.tsx                Landing page
  components/
    CounterButton.tsx     Server-side counter via RPC
    UserCard.tsx          Random user fetcher via RPC
  functions/
    counter.ts            Server: increment/decrement/get
    user.ts               Server: getRandomUser()
```
