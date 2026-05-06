export type { CompileResult, ProjectConfig } from "./compile.ts";
export { compileProject } from "./compile.ts";

// Re-export from analyzer and generator for convenience
export {
  analyzeModule,
  BabelParserAdapter,
  classifyFunctions,
  getModuleDirective,
  scanSourceFiles,
} from "@ultimate-js/analyzer";
export type {
  CallRecord,
  ClassificationResult,
  ClassifiedFunction,
  FunctionCallInfo,
  FunctionRecord,
  FunctionRuntime,
  ImportInfo,
  ImportRecord,
  ModuleAnalysis,
  ModuleDirective,
  ParsedModule,
  ParserAdapter,
  UserFunctionInfo,
} from "@ultimate-js/analyzer";
export {
  generateClientProxyCode,
  generateServerManifestCode,
  generateSingleProxyCode,
  getClientFiles,
  transformClientSource,
} from "@ultimate-js/generator";
