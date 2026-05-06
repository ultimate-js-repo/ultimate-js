export type { ModuleDirective } from "./source-kind.ts";
export { getModuleDirective } from "./source-kind.ts";
export { scanSourceFiles } from "./scan-source.ts";
export type {
  FunctionCallInfo,
  ImportInfo,
  ModuleAnalysis,
  ParsedModule,
  ParserAdapter,
  UserFunctionInfo,
} from "./analyze-module.ts";
export { analyzeModule } from "./analyze-module.ts";
export type {
  CallRecord,
  FunctionRecord,
  ImportRecord,
} from "./parser-types.ts";
export { BabelParserAdapter } from "./babel-parser.ts";
// SwcParserAdapter loaded lazily via "@ultimate-js/analyzer/swc-parser"
export type {
  ClassificationResult,
  ClassifiedFunction,
  FunctionRuntime,
} from "./classify-functions.ts";
export { classifyFunctions } from "./classify-functions.ts";
