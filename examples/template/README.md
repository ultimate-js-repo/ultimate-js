# @ultimate-js/template

Project template for `ultimate create`. Mirrored to the GitHub template
repository and fetched at project creation time.

## Contents

| File                               | Purpose                                         |
| ---------------------------------- | ----------------------------------------------- |
| `ultimate.config.ts`               | Server/dev/client configuration                 |
| `deno.json.tmpl`                   | Dependencies and tasks (written as `deno.json`) |
| `app/layout.tsx`                   | Root layout with dark theme CSS                 |
| `app/page.tsx`                     | Home page with demo components                  |
| `app/about/page.tsx`               | About page (routing demo)                       |
| `app/components/CounterButton.tsx` | Client counter component                        |
| `app/components/UserCard.tsx`      | Client user-fetcher component                   |
| `app/functions/counter.ts`         | Server counter state                            |
| `app/functions/user.ts`            | Server random user data                         |

## How it works

When a user runs `ultimate create my-app`:

1. CLI fetches the GitHub template repository (or uses local copy in monorepo)
2. Copies each file into the new project directory
3. Generates `ultimate.config.ts` from interactive prompts
4. Writes `deno.json` with JSR specifiers for standalone use
