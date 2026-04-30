import type { RemoteFunctionFailure } from "./types.ts";

interface ErrorLike {
  name: string;
  message: string;
  stack?: string;
  statusCode?: number;
  code?: string;
}

export function serializeError(error: unknown, dev: boolean): RemoteFunctionFailure["error"] {
  if (error instanceof Error) {
    const e = error as Error & Partial<ErrorLike>;
    const result: RemoteFunctionFailure["error"] = {
      name: e.name,
      message: e.message,
    };
    if (typeof e.statusCode === "number") {
      result.statusCode = e.statusCode;
    }
    if (typeof e.code === "string") {
      result.code = e.code;
    }
    if (dev && e.stack) {
      result.stack = e.stack;
    }
    return result;
  }
  return {
    name: "UnknownError",
    message: String(error),
  };
}
