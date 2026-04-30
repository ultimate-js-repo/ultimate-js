import type {
  ParserAdapter,
  ParsedModule,
  ImportRecord,
  FunctionRecord,
  CallRecord,
} from "./parser-types.ts";

// ── Minimal SWC AST interfaces ──────────────────────────

interface SwcSpan { start: number; end: number }

interface SwcNode { type: string; span?: SwcSpan; [key: string]: unknown }

interface SwcModule { body: SwcNode[] }

interface SwcIdentifier extends SwcNode { type: "Identifier"; value: string }

interface SwcParam extends SwcNode { pat: SwcNode & { span?: SwcSpan } }

interface SwcFnLike extends SwcNode {
  identifier?: SwcIdentifier;
  params?: SwcParam[];
  returnType?: SwcNode & { typeAnnotation?: SwcNode };
  body?: SwcNode;
}

interface SwcImportSpecifier extends SwcNode {
  local: SwcIdentifier;
  imported?: SwcIdentifier;
}

interface SwcImportDecl extends SwcNode {
  source: { value: string };
  specifiers: SwcImportSpecifier[];
}

interface SwcVarDeclarator extends SwcNode {
  id: SwcNode & { value?: string };
  init?: SwcFnLike;
}

// ── Lazy SWC loader ─────────────────────────────────────

let parseSync: ((code: string, opts: Record<string, unknown>) => SwcModule) | null = null;

/**
 * SWC parser adapter.
 * Lazily loads @swc/wasm on first use.
 */
export class SwcParserAdapter implements ParserAdapter {
  async parseModule(input: { file: string; code: string }): Promise<ParsedModule> {
    if (!parseSync) {
      const swc = await import("@swc/wasm") as Record<string, unknown>;
      if (typeof swc.default === "function") {
        await (swc.default as () => Promise<void>)();
      }
      const fn = (swc.parseSync ?? (swc.default as Record<string, unknown>)?.parseSync) as typeof parseSync;
      if (!fn) throw new Error("@swc/wasm does not export parseSync");
      parseSync = fn;
    }

    const { code, file } = input;
    const isTsx = /\.[jt]sx$/.test(file);
    const directives = detectDirectives(code);
    const imports: ImportRecord[] = [];
    const functions: FunctionRecord[] = [];

    let ast: SwcModule;
    try {
      ast = parseSync(code, { syntax: "typescript", tsx: isTsx });
    } catch {
      return { directives, imports, functions };
    }

    for (const item of ast.body) {
      switch (item.type) {
        case "ImportDeclaration":
          imports.push(parseImport(item as SwcImportDecl));
          break;
        case "ExportDeclaration":
          collectExportDecl((item as unknown as { declaration: SwcNode }).declaration, code, functions);
          break;
        case "ExportDefaultDeclaration":
          collectDefaultDecl((item as unknown as { decl: SwcFnLike }).decl, code, functions);
          break;
        case "ExportDefaultExpression": {
          const expr = (item as unknown as { expression: SwcNode }).expression;
          if (expr.type === "Identifier") {
            functions.push({
              name: (expr as SwcIdentifier).value,
              exportName: "default",
              isDefaultExport: true,
              signature: (expr as SwcIdentifier).value + "()",
              calls: [],
            });
          }
          break;
        }
      }
    }

    return { directives, imports, functions };
  }
}

// ── Helpers ──────────────────────────────────────────────

function detectDirectives(code: string): ("client" | "shared")[] {
  let t = code.trimStart();
  while (t.startsWith("//")) {
    const nl = t.indexOf("\n");
    if (nl === -1) { t = ""; break; }
    t = t.substring(nl + 1).trimStart();
  }
  while (t.startsWith("/*")) {
    const end = t.indexOf("*/");
    if (end === -1) { t = ""; break; }
    t = t.substring(end + 2).trimStart();
  }
  if (/^["']use client["']\s*;?/.test(t)) return ["client"];
  if (/^["']use shared["']\s*;?/.test(t)) return ["shared"];
  return [];
}

function spanText(code: string, s: SwcSpan): string {
  return code.slice(s.start, s.end);
}

function parseImport(node: SwcImportDecl): ImportRecord {
  const rec: ImportRecord = { source: node.source.value, names: [] };
  for (const spec of node.specifiers) {
    switch (spec.type) {
      case "ImportDefaultSpecifier":
        rec.defaultImport = spec.local.value;
        break;
      case "ImportNamespaceSpecifier":
        rec.namespaceImport = spec.local.value;
        break;
      case "ImportSpecifier":
        rec.names.push({
          local: spec.local.value,
          imported: spec.imported?.value ?? spec.local.value,
        });
        break;
    }
  }
  return rec;
}

function extractSignature(name: string, fn: SwcFnLike, code: string): string {
  const params = (fn.params ?? [])
    .map((p) => {
      const s = p.pat?.span ?? p.span;
      return s ? spanText(code, s) : "?";
    })
    .join(", ");

  let ret = "";
  if (fn.returnType) {
    const ta = fn.returnType.typeAnnotation ?? fn.returnType;
    if (ta.span) ret = ": " + spanText(code, ta.span);
  }

  return `${name}(${params})${ret}`;
}

function collectCalls(node: SwcNode | undefined): CallRecord[] {
  if (!node) return [];
  const calls: CallRecord[] = [];
  walk(node, (n) => {
    if (n.type === "CallExpression") {
      const callee = (n as unknown as { callee: SwcNode }).callee;
      if (callee?.type === "Identifier") {
        calls.push({ calleeName: (callee as SwcIdentifier).value });
      }
    }
  });
  return calls;
}

function walk(node: SwcNode, visit: (n: SwcNode) => void): void {
  visit(node);
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === "object" && typeof (item as SwcNode).type === "string") {
          walk(item as SwcNode, visit);
        }
      }
    } else if (v && typeof v === "object" && typeof (v as SwcNode).type === "string") {
      walk(v as SwcNode, visit);
    }
  }
}

function collectExportDecl(decl: SwcNode, code: string, out: FunctionRecord[]): void {
  if (!decl) return;
  if (decl.type === "FunctionDeclaration") {
    const fn = decl as SwcFnLike;
    const name = fn.identifier?.value;
    if (!name) return;
    out.push({
      name,
      exportName: name,
      isDefaultExport: false,
      signature: extractSignature(name, fn, code),
      calls: collectCalls(fn.body),
    });
  } else if (decl.type === "VariableDeclaration") {
    for (const d of ((decl as unknown as { declarations: SwcVarDeclarator[] }).declarations ?? [])) {
      const init = d.init;
      if (init && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression")) {
        const name = d.id.type === "Identifier" ? (d.id as SwcIdentifier).value : undefined;
        if (!name) continue;
        out.push({
          name,
          exportName: name,
          isDefaultExport: false,
          signature: extractSignature(name, init, code),
          calls: collectCalls(init.body),
        });
      }
    }
  }
}

function collectDefaultDecl(decl: SwcFnLike, code: string, out: FunctionRecord[]): void {
  if (!decl) return;
  if (decl.type === "FunctionExpression" || decl.type === "FunctionDeclaration") {
    const name = decl.identifier?.value ?? "default";
    out.push({
      name,
      exportName: "default",
      isDefaultExport: true,
      signature: extractSignature(name, decl, code),
      calls: collectCalls(decl.body),
    });
  }
}
