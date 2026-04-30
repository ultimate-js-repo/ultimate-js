export type { ProjectConfig, CompileResult } from "./compile.ts";
export { compileProject } from "./compile.ts";

// Re-export from analyzer and generator for convenience
export {
  getModuleDirective,
  scanSourceFiles,
  analyzeModule,
  classifyFunctions,
  BabelParserAdapter,
} from "@ultimate-js/analyzer";
export type {
  ModuleDirective,
  UserFunctionInfo,
  FunctionCallInfo,
  ImportInfo,
  ModuleAnalysis,
  FunctionRuntime,
  ClassifiedFunction,
  ClassificationResult,
  ParserAdapter,
  ParsedModule,
  ImportRecord,
  CallRecord,
  FunctionRecord,
} from "@ultimate-js/analyzer";
export {
  generateClientProxyCode,
  generateSingleProxyCode,
  generateServerManifestCode,
  transformClientSource,
  getClientFiles,
} from "@ultimate-js/generator";
