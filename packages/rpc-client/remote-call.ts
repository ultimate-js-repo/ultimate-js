import type {
  RemoteFunctionCallbackRef,
  RemoteFunctionCalling,
  RemoteFunctionError,
  RemoteFunctionResult,
  RemoteFunctionSseEvent,
} from "@ultimate-js/protocol";
import { getRemoteEndpoint } from "./config.ts";

export interface RemoteFunctionCallOptions {
  retries?: number;
  retryBaseDelayMs?: number;
  fetch?: typeof fetch;
}

type CallbackFn = (...args: unknown[]) => unknown | Promise<unknown>;

const SESSION_CURSOR_HEADER = "Ultimate-Session-Cursor";
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 100;

class NonRetryableRpcError extends Error {
  override cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "NonRetryableRpcError";
    this.cause = options?.cause;
  }
}

export async function remoteFunctionCall<T>(
  functionId: string,
  args: unknown[],
  options: RemoteFunctionCallOptions = {},
): Promise<T> {
  const callbacks = new Map<string, CallbackFn>();
  const call: RemoteFunctionCalling = {
    type: "RemoteFunctionCalling",
    version: 1,
    args: encodeCallbackArgs(args, callbacks),
  };

  const base = getRemoteEndpoint();
  const url = `${base}/${functionId}`;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const fetchImpl = options.fetch ?? fetch;
  let latestCursor: string | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fetchSseResult(
        url,
        call,
        fetchImpl,
        latestCursor,
        callbacks,
        (cursor) => {
          latestCursor = cursor;
        },
      );
      return unwrapResult<T>(result);
    } catch (err) {
      if (err instanceof NonRetryableRpcError || attempt >= retries) {
        throw err instanceof NonRetryableRpcError && err.cause
          ? err.cause
          : err;
      }
      await delay(retryDelay(attempt, options.retryBaseDelayMs));
    }
  }

  throw new Error("RPC request failed");
}

export async function* remoteFunctionStream<T>(
  functionId: string,
  args: unknown[],
  options: RemoteFunctionCallOptions = {},
): AsyncGenerator<T> {
  const callbacks = new Map<string, CallbackFn>();
  const call: RemoteFunctionCalling = {
    type: "RemoteFunctionCalling",
    version: 1,
    args: encodeCallbackArgs(args, callbacks),
  };

  const base = getRemoteEndpoint();
  const url = `${base}/${functionId}`;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const fetchImpl = options.fetch ?? fetch;
  let latestCursor: string | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      for await (
        const event of fetchSseEvents(url, call, fetchImpl, latestCursor)
      ) {
        if (event.type === "message") {
          latestCursor = event.cursor;
          yield unwrapResult<T>(event.result);
          continue;
        }

        if (event.type === "callback") {
          latestCursor = event.cursor;
          await invokeCallback(callbacks, event.callbackId, event.args);
          continue;
        }

        if (event.type === "error") {
          const err = reviveError(event.error);
          throw new NonRetryableRpcError(err.message, { cause: err });
        }

        if (event.type === "end") return;
      }
    } catch (err) {
      if (err instanceof NonRetryableRpcError || attempt >= retries) {
        throw err instanceof NonRetryableRpcError && err.cause
          ? err.cause
          : err;
      }
      await delay(retryDelay(attempt, options.retryBaseDelayMs));
    }
  }
}

async function fetchSseResult(
  url: string,
  call: RemoteFunctionCalling,
  fetchImpl: typeof fetch,
  cursor: string | undefined,
  callbacks: Map<string, CallbackFn>,
  onCursor: (cursor: string) => void,
): Promise<RemoteFunctionResult> {
  for await (const event of fetchSseEvents(url, call, fetchImpl, cursor)) {
    if (event.type === "message") {
      onCursor(event.cursor);
      return event.result;
    }

    if (event.type === "callback") {
      onCursor(event.cursor);
      await invokeCallback(callbacks, event.callbackId, event.args);
      continue;
    }

    if (event.type === "error") {
      const err = reviveError(event.error);
      throw new NonRetryableRpcError(err.message, { cause: err });
    }

    if (event.type === "end") {
      throw new NonRetryableRpcError(
        "RPC SSE stream ended before a result message was received",
      );
    }
  }

  throw new Error("RPC SSE stream closed before a result message was received");
}

async function* fetchSseEvents(
  url: string,
  call: RemoteFunctionCalling,
  fetchImpl: typeof fetch,
  cursor: string | undefined,
): AsyncGenerator<RemoteFunctionSseEvent> {
  const headers = new Headers({
    "Accept": "text/event-stream",
    "Content-Type": "application/json",
  });
  if (cursor) headers.set(SESSION_CURSOR_HEADER, cursor);

  const response = await fetchImpl(url, {
    method: "POST",
    headers,
    body: JSON.stringify(call),
  });

  if (!response.ok) {
    throw new NonRetryableRpcError(
      `RPC request failed with status ${response.status}: ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error("RPC SSE response did not include a body");
  }

  yield* readSseEvents(response.body);
}

async function* readSseEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<RemoteFunctionSseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseSseEvent(rawEvent);
        if (event) yield event;
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }

  buffer += decoder.decode();
  const event = parseSseEvent(buffer);
  if (event) yield event;
}

function parseSseEvent(raw: string): RemoteFunctionSseEvent | undefined {
  const lines = raw.split(/\r?\n/);
  const data: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon >= 0 ? line.slice(0, colon) : line;
    const value = colon >= 0 ? line.slice(colon + 1).trimStart() : "";
    if (field === "data") data.push(value);
  }

  if (data.length === 0) return undefined;

  try {
    return JSON.parse(data.join("\n")) as RemoteFunctionSseEvent;
  } catch (err) {
    throw new NonRetryableRpcError("Invalid RPC SSE event data", {
      cause: err,
    });
  }
}

function unwrapResult<T>(result: RemoteFunctionResult): T {
  if (result.ok) {
    return result.value as T;
  }

  const err = reviveError(result.error);
  throw new NonRetryableRpcError(err.message, { cause: err });
}

function reviveError(error: RemoteFunctionError): Error {
  const err = new Error(error.message);
  err.name = error.name;
  if (error.stack) err.stack = error.stack;
  return err;
}

function encodeCallbackArgs(
  args: unknown[],
  callbacks: Map<string, CallbackFn>,
): unknown[] {
  return args.map((arg) => encodeCallbackValue(arg, callbacks));
}

function encodeCallbackValue(
  value: unknown,
  callbacks: Map<string, CallbackFn>,
): unknown {
  if (typeof value === "function") {
    const id = crypto.randomUUID();
    callbacks.set(id, value as CallbackFn);
    const ref: RemoteFunctionCallbackRef = {
      __ultimate_rpc_callback: true,
      id,
    };
    return ref;
  }

  if (Array.isArray(value)) {
    return value.map((item) => encodeCallbackValue(item, callbacks));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = encodeCallbackValue(item, callbacks);
    }
    return result;
  }

  return value;
}

async function invokeCallback(
  callbacks: Map<string, CallbackFn>,
  callbackId: string,
  args: unknown[],
): Promise<void> {
  const callback = callbacks.get(callbackId);
  if (!callback) {
    throw new NonRetryableRpcError(`Unknown RPC callback: ${callbackId}`);
  }
  await callback(...args);
}

function retryDelay(
  attempt: number,
  baseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
) {
  const exponential = baseDelayMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * baseDelayMs);
  return exponential + jitter;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
