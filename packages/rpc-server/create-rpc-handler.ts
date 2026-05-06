import { serialize } from "@ultimate-js/core";
import {
  createFailureResult,
  createSuccessResult,
  serializeError,
  validateRemoteCall,
} from "@ultimate-js/protocol";
import { runWithContext } from "./context.ts";

export type ServerFunction = (...args: unknown[]) => unknown | Promise<unknown>;
export type ServerManifest = Record<string, ServerFunction>;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(body: BodyInit | null, init?: ResponseInit): Response {
  return new Response(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init?.headers },
  });
}

/**
 * Create an RPC handler.
 *
 * The functionId is extracted from the last segment of the request URL path,
 * e.g. POST /api/rpc/cb9ceb43 → functionId = "cb9ceb43".
 *
 * The request body contains only { type, version, args } — no functionId.
 */
export function createRpcHandler(options: {
  manifest: ServerManifest;
  dev?: boolean;
  createContext?: (request: Request) => unknown | Promise<unknown>;
}): (request: Request, functionId?: string) => Promise<Response> {
  const { manifest, dev = false, createContext } = options;

  return async (
    request: Request,
    explicitFunctionId?: string,
  ): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return withCors(null, { status: 204 });
    }

    if (request.method !== "POST") {
      return withCors(
        JSON.stringify(createFailureResult({
          name: "MethodNotAllowedError",
          message: "Only POST requests are accepted",
          statusCode: 405,
          code: "METHOD_NOT_ALLOWED",
        })),
        { status: 405, headers: { "Content-Type": "application/json" } },
      );
    }

    // Resolve functionId: explicit param > URL last segment
    const functionId = explicitFunctionId ??
      new URL(request.url).pathname.split("/").filter(Boolean).pop();

    if (!functionId) {
      return withCors(
        JSON.stringify(createFailureResult({
          name: "BadRequestError",
          message: "Missing function ID in URL",
          statusCode: 400,
          code: "MISSING_FUNCTION_ID",
        })),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    let args: unknown[];
    try {
      const body = await request.json();
      const call = validateRemoteCall(body);
      args = call.args;
    } catch (err) {
      const failure = createFailureResult(serializeError(err, dev));
      return withCors(JSON.stringify(failure), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fn = manifest[functionId];
    if (!fn) {
      const failure = createFailureResult({
        name: "NotFoundError",
        message: `Server function not found: ${functionId}`,
        statusCode: 404,
        code: "FUNCTION_NOT_FOUND",
      });
      return withCors(JSON.stringify(failure), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const ctx = createContext ? await createContext(request) : { request };
      const value = await runWithContext(ctx, () => fn(...args));
      const serialized = serialize(value);
      const result = createSuccessResult(serialized);
      return withCors(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      const failure = createFailureResult(serializeError(err, dev));
      const statusCode = (err instanceof Error && "statusCode" in err &&
          typeof (err as Error & { statusCode: number }).statusCode ===
            "number")
        ? (err as Error & { statusCode: number }).statusCode
        : 500;
      return withCors(JSON.stringify(failure), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

// Backward compatibility alias
export const createTelefuncHandler = createRpcHandler;
