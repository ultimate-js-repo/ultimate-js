export type { ModuleDirective } from "./source-kind.ts";
export { getModuleDirective } from "./source-kind.ts";
export { scanSourceFiles } from "./scan-source.ts";
export type {
  UserFunctionInfo, FunctionCallInfo, ImportInfo, ModuleAnalysis,
  ParsedModule, ParserAdapter,
} from "./analyze-module.ts";
export { analyzeModule } from "./analyze-module.ts";
export type { ImportRecord, CallRecord, FunctionRecord } from "./parser-types.ts";
export { BabelParserAdapter } from "./babel-parser.ts";
// SwcParserAdapter loaded lazily via "@ultimate-js/analyzer/swc-parser"
export type { FunctionRuntime, ClassifiedFunction, ClassificationResult } from "./classify-functions.ts";
export { classifyFunctions } from "./classify-functions.ts";
