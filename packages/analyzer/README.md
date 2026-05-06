# @ultimate-js/analyzer

Source code analysis for Ultimate.js. Parses TypeScript/TSX, extracts function
signatures, classifies client/server/shared boundaries.

## Parser Adapters

| Adapter              | Backend         | Config                      |
| -------------------- | --------------- | --------------------------- |
| `BabelParserAdapter` | `@babel/parser` | `parser: "babel"` (default) |
| `SwcParserAdapter`   | `@swc/wasm`     | `parser: "swc"`             |

## Exports

- `analyzeModule(file, parsed, isRouteFile, appDir)` — convert parsed AST to
  `ModuleAnalysis`
- `classifyFunctions(analyses)` — classify each function as client/server/shared
- `scanSourceFiles(appDir)` — find all `.ts`/`.tsx` source files
- `BabelParserAdapter` — Babel-based parser (default)
- **Types** — `ParserAdapter`, `ParsedModule`, `FunctionRecord`, `CallRecord`,
  `ImportRecord`, `ModuleAnalysis`, `ClassifiedFunction`

## Parser Adapter Interface

```ts
interface ParserAdapter {
  parseModule(
    input: { file: string; code: string },
  ): ParsedModule | Promise<ParsedModule>;
}
```

Implement this to add a new parser backend.
