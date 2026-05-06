import type { RemoteFunctionCalling, RemoteFunctionResult } from "./types.ts";

export function createRemoteCall(
  args: unknown[],
  meta?: RemoteFunctionCalling["meta"],
): RemoteFunctionCalling {
  return { type: "RemoteFunctionCalling", version: 1, args, meta };
}

export function createSuccessResult(value: unknown): RemoteFunctionResult {
  return { type: "RemoteFunctionResult", version: 1, ok: true, value };
}

export function createFailureResult(
  error: {
    name: string;
    message: string;
    statusCode?: number;
    code?: string;
    stack?: string;
  },
): RemoteFunctionResult {
  return { type: "RemoteFunctionResult", version: 1, ok: false, error };
}

export function validateRemoteCall(body: unknown): RemoteFunctionCalling {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }
  const b = body as Record<string, unknown>;
  if (b.type !== "RemoteFunctionCalling") {
    throw new Error(`Expected type RemoteFunctionCalling, got ${b.type}`);
  }
  if (b.version !== 1) throw new Error(`Unsupported version: ${b.version}`);
  if (!Array.isArray(b.args)) throw new Error("Missing or invalid args");
  return body as RemoteFunctionCalling;
}
