export type DiagnosticLevel = "error" | "warning";

export type Diagnostic = {
  level: DiagnosticLevel;
  message: string;
  file?: string;
  line?: number;
  column?: number;
};

const diagnostics: Diagnostic[] = [];

export function addDiagnostic(diag: Diagnostic): void {
  diagnostics.push(diag);
}

export function flushDiagnostics(): Diagnostic[] {
  const result = [...diagnostics];
  diagnostics.length = 0;
  return result;
}

export function hasErrors(): boolean {
  return diagnostics.some((d) => d.level === "error");
}

export function formatDiagnostic(diag: Diagnostic): string {
  const prefix = diag.level === "error" ? "ERROR" : "WARNING";
  let loc = "";
  if (diag.file) {
    loc += diag.file;
    if (diag.line) {
      loc += `:${diag.line}`;
      if (diag.column) loc += `:${diag.column}`;
    }
  }
  return `${prefix}: ${diag.message}${loc ? ` (${loc})` : ""}`;
}
