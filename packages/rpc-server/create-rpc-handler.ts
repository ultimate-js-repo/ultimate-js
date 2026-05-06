import { serialize } from "@ultimate-js/core";
import {
  createFailureResult,
  createSuccessResult,
  serializeError,
  validateRemoteCall,
} from "@ultimate-js/protocol";
import type {
  RemoteFunctionCallbackRef,
  RemoteFunctionResult,
  RemoteFunctionSseCallback,
  RemoteFunctionSseEnd,
  RemoteFunctionSseError,
  RemoteFunctionSseMessage,
} from "@ultimate-js/protocol";
import { runWithContext } from "./context.ts";

export type ServerFunction = (...args: unknown[]) => unknown | Promise<unknown>;
export type ServerManifest = Record<string, ServerFunction>;

const SESSION_CURSOR_HEADER = "Ultimate-Session-Cursor";
const QUEUE_TTL_MS = 60_000;
const MAX_QUEUE_MESSAGES = 100;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    `Content-Type, Accept, ${SESSION_CURSOR_HEADER}`,
};

type QueueMessage = RemoteFunctionSseMessage | RemoteFunctionSseCallback;

type MessageQueue = {
  id: string;
  messages: QueueMessage[];
  complete: boolean;
  expiresAt: number;
  waiters: Array<() => void>;
};

const queues = new Map<string, MessageQueue>();
const cursorToQueue = new Map<string, string>();

function withCors(body: BodyInit | null, init?: ResponseInit): Response {
  return new Response(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...init?.headers },
  });
}

function refreshQueue(queue: MessageQueue): void {
  queue.expiresAt = Date.now() + QUEUE_TTL_MS;
}

function cleanupQueues(): void {
  const now = Date.now();
  for (const [id, queue] of queues) {
    if (queue.expiresAt > now) continue;
    queues.delete(id);
    for (const message of queue.messages) {
      cursorToQueue.delete(message.cursor);
    }
  }
}

function createQueue(): MessageQueue {
  const queue: MessageQueue = {
    id: crypto.randomUUID(),
    messages: [],
    complete: false,
    expiresAt: Date.now() + QUEUE_TTL_MS,
    waiters: [],
  };
  queues.set(queue.id, queue);
  return queue;
}

function pushQueueMessage(
  queue: MessageQueue,
  result: RemoteFunctionResult,
): QueueMessage {
  const message: QueueMessage = {
    type: "message",
    cursor: crypto.randomUUID(),
    result,
  };
  queue.messages.push(message);
  cursorToQueue.set(message.cursor, queue.id);

  while (queue.messages.length > MAX_QUEUE_MESSAGES) {
    const removed = queue.messages.shift();
    if (removed) cursorToQueue.delete(removed.cursor);
  }

  refreshQueue(queue);
  notifyQueue(queue);
  return message;
}

function pushQueueCallback(
  queue: MessageQueue,
  callbackId: string,
  args: unknown[],
): QueueMessage {
  const message: QueueMessage = {
    type: "callback",
    cursor: crypto.randomUUID(),
    callbackId,
    args,
  };
  queue.messages.push(message);
  cursorToQueue.set(message.cursor, queue.id);

  while (queue.messages.length > MAX_QUEUE_MESSAGES) {
    const removed = queue.messages.shift();
    if (removed) cursorToQueue.delete(removed.cursor);
  }

  refreshQueue(queue);
  notifyQueue(queue);
  return message;
}

function completeQueue(queue: MessageQueue): void {
  queue.complete = true;
  refreshQueue(queue);
  notifyQueue(queue);
}

function notifyQueue(queue: MessageQueue): void {
  const waiters = queue.waiters.splice(0);
  for (const waiter of waiters) waiter();
}

function waitForQueue(queue: MessageQueue): Promise<void> {
  if (queue.complete) return Promise.resolve();
  return new Promise((resolve) => queue.waiters.push(resolve));
}

function createSseResponse(
  queue: MessageQueue,
  startIndex = 0,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let index = startIndex;

      while (true) {
        while (index < queue.messages.length) {
          const message = queue.messages[index];
          controller.enqueue(encoder.encode(formatSseEvent(message)));
          index += 1;
        }

        if (queue.complete) {
          const latestCursor = queue.messages.at(-1)?.cursor;
          const end: RemoteFunctionSseEnd = latestCursor
            ? { type: "end", cursor: latestCursor }
            : { type: "end" };
          controller.enqueue(encoder.encode(formatSseEvent(end)));
          controller.close();
          return;
        }

        await waitForQueue(queue);
      }
    },
  });

  return withCors(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

function createSseErrorResponse(
  error: RemoteFunctionSseError["error"],
  cursor?: string,
): Response {
  return createSseEventResponse([{ type: "error", cursor, error }]);
}

function createSseEventResponse(
  events: Array<
    | RemoteFunctionSseMessage
    | RemoteFunctionSseCallback
    | RemoteFunctionSseEnd
    | RemoteFunctionSseError
  >,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(formatSseEvent(event)));
      }
      controller.close();
    },
  });

  return withCors(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

function formatSseEvent(
  event:
    | RemoteFunctionSseMessage
    | RemoteFunctionSseCallback
    | RemoteFunctionSseEnd
    | RemoteFunctionSseError,
): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function isSseRequest(request: Request): boolean {
  return request.headers.get("Accept")?.includes("text/event-stream") ?? false;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return value !== null && typeof value === "object" &&
    Symbol.asyncIterator in value;
}

function isCallbackRef(value: unknown): value is RemoteFunctionCallbackRef {
  return value !== null && typeof value === "object" &&
    (value as Record<string, unknown>).__ultimate_rpc_callback === true &&
    typeof (value as Record<string, unknown>).id === "string";
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
    cleanupQueues();

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

    const sessionCursor = request.headers.get(SESSION_CURSOR_HEADER)?.trim();
    if (isSseRequest(request) && sessionCursor) {
      const queueId = cursorToQueue.get(sessionCursor);
      const queue = queueId ? queues.get(queueId) : undefined;
      if (!queue) {
        return createSseErrorResponse({
          name: "InvalidCursorError",
          message: `Unknown ${SESSION_CURSOR_HEADER}: ${sessionCursor}`,
          statusCode: 409,
          code: "UNKNOWN_SESSION_CURSOR",
        }, sessionCursor);
      }

      refreshQueue(queue);
      const cursorIndex = queue.messages.findIndex((message) =>
        message.cursor === sessionCursor
      );
      if (cursorIndex < 0) {
        return createSseErrorResponse({
          name: "InvalidCursorError",
          message: `Unknown ${SESSION_CURSOR_HEADER}: ${sessionCursor}`,
          statusCode: 409,
          code: "UNKNOWN_SESSION_CURSOR",
        }, sessionCursor);
      }

      return createSseResponse(queue, cursorIndex + 1);
    }

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

    if (isSseRequest(request)) {
      const queue = createQueue();
      const ctx = createContext ? await createContext(request) : { request };
      void produceSseMessages(queue, ctx, fn, args, dev);
      return createSseResponse(queue);
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

async function produceSseMessages(
  queue: MessageQueue,
  ctx: unknown,
  fn: ServerFunction,
  args: unknown[],
  dev: boolean,
): Promise<void> {
  try {
    await runWithContext(ctx, async () => {
      const value = await fn(...reviveCallbackArgs(args, queue));
      if (isAsyncIterable(value)) {
        for await (const chunk of value) {
          pushQueueMessage(queue, createSuccessResult(serialize(chunk)));
        }
        return;
      }

      pushQueueMessage(queue, createSuccessResult(serialize(value)));
    });
  } catch (err) {
    pushQueueMessage(queue, createFailureResult(serializeError(err, dev)));
  } finally {
    completeQueue(queue);
  }
}

function reviveCallbackArgs(args: unknown[], queue: MessageQueue): unknown[] {
  return args.map((arg) => reviveCallbackValue(arg, queue));
}

function reviveCallbackValue(value: unknown, queue: MessageQueue): unknown {
  if (isCallbackRef(value)) {
    return (...args: unknown[]) => {
      pushQueueCallback(queue, value.id, args.map(serialize));
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => reviveCallbackValue(item, queue));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = reviveCallbackValue(item, queue);
    }
    return result;
  }

  return value;
}
