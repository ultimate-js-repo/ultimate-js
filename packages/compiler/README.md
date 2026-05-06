# @ultimate-js/compiler

Compilation orchestrator for Ultimate.js. Ties together route scanning, source
analysis, function classification, and code generation.

## Exports

- `compileProject(config)` — run the full compilation pipeline
- Re-exports from `@ultimate-js/analyzer` and `@ultimate-js/generator`

## Pipeline

```
scanRoutes → scanSourceFiles → parseModule → analyzeModule → classifyFunctions
```

Returns a `CompileResult` with routes, analyses, classified functions, and
server function file set.
