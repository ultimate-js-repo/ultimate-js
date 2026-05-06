/**
 * Parser adapter interface.
 * Implement this to add support for a new AST parser (Babel, SWC, etc.).
 */
export interface ParserAdapter {
  parseModule(
    input: { file: string; code: string },
  ): ParsedModule | Promise<ParsedModule>;
}

export type ImportRecord = {
  source: string;
  names: Array<{ local: string; imported: string }>;
  defaultImport?: string;
  namespaceImport?: string;
};

export type CallRecord = {
  calleeName: string;
  loc?: { line: number; column: number };
};

export type FunctionRecord = {
  /** Function name as declared */
  name: string;
  /** Exported name (may differ from name) */
  exportName?: string;
  /** Whether this is a default export */
  isDefaultExport: boolean;
  /**
   * Full signature including params and return type.
   * e.g. "getUser(id: string): Promise<User>"
   */
  signature: string;
  /** Function calls made within this function body */
  calls: CallRecord[];
};

export type ParsedModule = {
  /** Directives found at the top of the file ("use client" / "use shared") */
  directives: ("client" | "shared")[];
  /** Module-level import statements */
  imports: ImportRecord[];
  /** Exported function declarations */
  functions: FunctionRecord[];
};
