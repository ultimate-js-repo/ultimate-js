import { parse } from "@babel/parser";
import type { File } from "@babel/types";
// @ts-expect-error CJS default export mismatch
import babelTraverse from "@babel/traverse";
// @ts-expect-error CJS default export mismatch
import babelGenerate from "@babel/generator";
import type {
  CallRecord,
  FunctionRecord,
  ImportRecord,
  ParsedModule,
  ParserAdapter,
} from "./parser-types.ts";

// Babel CJS default-export shim
const traverse =
  ((babelTraverse as Record<string, unknown>).default ?? babelTraverse) as (
    ast: File,
    visitors: Record<string, (path: BabelPath) => void>,
    scope?: unknown,
    state?: unknown,
    parentPath?: unknown,
  ) => void;

const generate =
  ((babelGenerate as Record<string, unknown>).default ?? babelGenerate) as (
    node: BabelNode,
    options?: { compact?: boolean },
  ) => { code: string };

// ── Minimal Babel AST interfaces ────────────────────────

interface BabelNode {
  type: string;
  [key: string]: unknown;
}

interface BabelPath {
  node: BabelNode & Record<string, unknown>;
}

interface BabelLoc {
  start: { line: number; column: number };
}

function nodeParams(fn: BabelNode): BabelNode[] {
  return (fn as { params?: BabelNode[] }).params ?? [];
}

function nodeReturnType(fn: BabelNode): BabelNode | undefined {
  const rt = (fn as { returnType?: { typeAnnotation?: BabelNode } }).returnType;
  return rt?.typeAnnotation ?? (rt as BabelNode | undefined);
}

// ── Signature & call extraction ─────────────────────────

function extractSignature(name: string, fnNode: BabelNode): string {
  const params = nodeParams(fnNode)
    .map((p) => generate(p, { compact: true }).code)
    .join(", ");

  let ret = "";
  const retAnnotation = nodeReturnType(fnNode);
  if (retAnnotation) {
    ret = ": " + generate(retAnnotation, { compact: true }).code;
  }

  return `${name}(${params})${ret}`;
}

function collectCalls(fnNode: BabelNode): CallRecord[] {
  const calls: CallRecord[] = [];
  try {
    traverse(
      fnNode as unknown as File,
      {
        CallExpression(callPath: BabelPath) {
          const callee = callPath.node.callee as BabelNode;
          if (callee.type === "Identifier") {
            const loc = (callee as unknown as { loc?: BabelLoc }).loc;
            calls.push({
              calleeName: (callee as unknown as { name: string }).name,
              loc: loc
                ? { line: loc.start.line, column: loc.start.column }
                : undefined,
            });
          }
        },
      },
      undefined,
      undefined,
      fnNode,
    );
  } catch {
    // Ignore traversal errors
  }
  return calls;
}

function detectDirectives(code: string): ("client" | "shared")[] {
  let t = code.trimStart();
  while (t.startsWith("//")) {
    const nl = t.indexOf("\n");
    if (nl === -1) {
      t = "";
      break;
    }
    t = t.substring(nl + 1).trimStart();
  }
  while (t.startsWith("/*")) {
    const end = t.indexOf("*/");
    if (end === -1) {
      t = "";
      break;
    }
    t = t.substring(end + 2).trimStart();
  }
  if (/^["']use client["']\s*;?/.test(t)) return ["client"];
  if (/^["']use shared["']\s*;?/.test(t)) return ["shared"];
  return [];
}

// ── Adapter ─────────────────────────────────────────────

export class BabelParserAdapter implements ParserAdapter {
  parseModule(input: { file: string; code: string }): ParsedModule {
    const directives = detectDirectives(input.code);
    const imports: ImportRecord[] = [];
    const functions: FunctionRecord[] = [];

    let ast: File;
    try {
      ast = parse(input.code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        sourceFilename: input.file,
      });
    } catch {
      return { directives, imports, functions };
    }

    traverse(ast, {
      ImportDeclaration(path: BabelPath) {
        const source = (path.node.source as { value: string }).value;
        const rec: ImportRecord = { source, names: [] };
        const specifiers = (path.node.specifiers as BabelNode[]) ?? [];
        for (const spec of specifiers) {
          const local =
            (spec as unknown as { local: { name: string } }).local.name;
          if (spec.type === "ImportDefaultSpecifier") {
            rec.defaultImport = local;
          } else if (spec.type === "ImportNamespaceSpecifier") {
            rec.namespaceImport = local;
          } else if (spec.type === "ImportSpecifier") {
            const imported =
              ((spec as unknown as { imported?: { name: string } }).imported
                ?.name) ?? local;
            rec.names.push({ local, imported });
          }
        }
        imports.push(rec);
      },

      ExportDefaultDeclaration(path: BabelPath) {
        const decl = path.node.declaration as BabelNode;
        if (
          decl.type === "FunctionDeclaration" ||
          decl.type === "ArrowFunctionExpression"
        ) {
          const name =
            ((decl as unknown as { id?: { name: string } }).id?.name) ??
              "default";
          functions.push({
            name,
            exportName: "default",
            isDefaultExport: true,
            signature: extractSignature(name, decl),
            calls: collectCalls(decl),
          });
        } else if (decl.type === "Identifier") {
          const name = (decl as unknown as { name: string }).name;
          functions.push({
            name,
            exportName: "default",
            isDefaultExport: true,
            signature: name + "()",
            calls: [],
          });
        }
      },

      ExportNamedDeclaration(path: BabelPath) {
        const decl = path.node.declaration as BabelNode | null;
        if (!decl) return;

        if (decl.type === "FunctionDeclaration") {
          const name = (decl as unknown as { id?: { name: string } }).id?.name;
          if (!name) return;
          functions.push({
            name,
            exportName: name,
            isDefaultExport: false,
            signature: extractSignature(name, decl),
            calls: collectCalls(decl),
          });
        } else if (decl.type === "VariableDeclaration") {
          const declarations =
            (decl as unknown as { declarations: BabelNode[] }).declarations;
          for (const v of declarations) {
            const init = (v as unknown as { init?: BabelNode }).init;
            if (
              init &&
              (init.type === "ArrowFunctionExpression" ||
                init.type === "FunctionExpression")
            ) {
              const id = (v as unknown as { id: BabelNode }).id;
              const name = id.type === "Identifier"
                ? (id as unknown as { value?: string; name?: string }).name
                : undefined;
              if (!name) continue;
              functions.push({
                name,
                exportName: name,
                isDefaultExport: false,
                signature: extractSignature(name, init),
                calls: collectCalls(init),
              });
            }
          }
        }
      },
    });

    return { directives, imports, functions };
  }
}
