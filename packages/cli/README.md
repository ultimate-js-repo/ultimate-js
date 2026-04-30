# @ultimate-js/cli

Command-line interface for Ultimate.js.

## Commands

```bash
ultimate create <name>     # Scaffold a new project (interactive)
ultimate dev   [project]   # Start development server
ultimate build [project]   # Production build
ultimate preview [project] # Preview production build
```

## Interactive Create

`ultimate create` prompts for:
- **Parser** — babel / swc
- **Bundler** — native / vite / rspack
- **Server port**

Supports arrow keys, Tab, and Enter. Falls back to defaults in non-TTY environments.
