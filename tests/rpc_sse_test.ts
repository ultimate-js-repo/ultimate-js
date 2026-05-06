import { assert, assertEquals, assertMatch, assertRejects } from "@std/assert";
import { createRpcHandler } from "@ultimate-js/rpc-server";
import { remoteFunctionCall, setRemoteEndpoint } from "@ultimate-js/rpc-client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.test("rpc: JSON mode still works", async () => {
  const handler = createRpcHandler({
    manifest: {
      hello: (name: unknown) => `hello ${name}`,
    },
  });

  const response = await handler(
    rpcRequest("http://localhost/_ultimate/rpc/hello", ["Ada"]),
  );
  const result = await response.json();

  assertEquals(result, {
    type: "RemoteFunctionResult",
    version: 1,
    ok: true,
    value: "hello Ada",
  });
});

Deno.test("rpc: client retries network failures", async () => {
  const handler = createRpcHandler({
    manifest: {
      ok: () => "retried",
    },
  });
  let calls = 0;
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls += 1;
    if (calls === 1) throw new TypeError("network down");
    return await handler(new Request(input, init), "ok");
  }) as typeof fetch;

  setRemoteEndpoint("http://localhost/_ultimate/rpc");
  const result = await remoteFunctionCall<string>("ok", [], {
    fetch: fetchImpl,
    retries: 1,
    retryBaseDelayMs: 0,
  });

  assertEquals(result, "retried");
  assertEquals(calls, 2);
});

Deno.test("rpc: client does not retry application failures", async () => {
  const handler = createRpcHandler({
    manifest: {
      fail: () => {
        throw new Error("boom");
      },
    },
    dev: true,
  });
  let calls = 0;
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls += 1;
    return await handler(new Request(input, init), "fail");
  }) as typeof fetch;

  setRemoteEndpoint("http://localhost/_ultimate/rpc");
  await assertRejects(
    () =>
      remoteFunctionCall("fail", [], {
        fetch: fetchImpl,
        retries: 2,
        retryBaseDelayMs: 0,
      }),
    Error,
    "boom",
  );
  assertEquals(calls, 1);
});

Deno.test("rpc: client callback args are invoked from SSE events", async () => {
  const handler = createRpcHandler({
    manifest: {
      stream: async (callback: unknown) => {
        assertEquals(typeof callback, "function");
        await (callback as (chunk: string) => Promise<void>)("one");
        await (callback as (chunk: string) => Promise<void>)("two");
        return "done";
      },
    },
  });
  const chunks: string[] = [];
  const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    return await handler(new Request(input, init), "stream");
  }) as typeof fetch;

  setRemoteEndpoint("http://localhost/_ultimate/rpc");
  const result = await remoteFunctionCall<string>(
    "stream",
    [(chunk: string) => chunks.push(chunk)],
    { fetch: fetchImpl, retries: 0 },
  );

  assertEquals(result, "done");
  assertEquals(chunks, ["one", "two"]);
});

Deno.test("rpc: SSE messages include UUID cursors and end", async () => {
  const handler = createRpcHandler({
    manifest: {
      hello: () => "world",
    },
  });

  const response = await handler(
    sseRequest("http://localhost/_ultimate/rpc/hello"),
  );
  const events = parseSse(await response.text());

  assertEquals(events.length, 2);
  assertEquals(events[0].event, "message");
  assertEquals(events[0].data.type, "message");
  assertMatch(String(events[0].data.cursor), UUID_RE);
  assertEquals(record(events[0].data.result).value, "world");
  assertEquals(events[1].event, "end");
  assertEquals(events[1].data.cursor, events[0].data.cursor);
});

Deno.test("rpc: SSE callback events include UUID cursors", async () => {
  const callbackId = crypto.randomUUID();
  const handler = createRpcHandler({
    manifest: {
      stream: async (callback: unknown) => {
        await (callback as (chunk: string) => Promise<void>)("hello");
        return "done";
      },
    },
  });

  const response = await handler(
    sseRequest("http://localhost/_ultimate/rpc/stream", {}, [{
      __ultimate_rpc_callback: true,
      id: callbackId,
    }]),
  );
  const events = parseSse(await response.text());

  assertEquals(events[0].event, "callback");
  assertEquals(events[0].data.type, "callback");
  assertEquals(events[0].data.callbackId, callbackId);
  assertEquals(events[0].data.args, ["hello"]);
  assertMatch(String(events[0].data.cursor), UUID_RE);
  assertEquals(events[1].event, "message");
  assertEquals(events[2].event, "end");
});

Deno.test("rpc: reconnect after latest cursor receives end", async () => {
  const handler = createRpcHandler({
    manifest: {
      hello: () => "world",
    },
  });

  const first = await handler(
    sseRequest("http://localhost/_ultimate/rpc/hello"),
  );
  const firstEvents = parseSse(await first.text());
  const cursor = String(firstEvents[0].data.cursor);

  const resumed = await handler(
    sseRequest("http://localhost/_ultimate/rpc/hello", {
      "Ultimate-Session-Cursor": cursor,
    }),
  );
  const resumedEvents = parseSse(await resumed.text());

  assertEquals(resumedEvents.length, 1);
  assertEquals(resumedEvents[0].event, "end");
  assertEquals(resumedEvents[0].data.type, "end");
});

Deno.test("rpc: unknown cursor receives protocol error event", async () => {
  const handler = createRpcHandler({
    manifest: {
      hello: () => "world",
    },
  });

  const response = await handler(
    sseRequest("http://localhost/_ultimate/rpc/hello", {
      "Ultimate-Session-Cursor": crypto.randomUUID(),
    }),
  );
  const events = parseSse(await response.text());

  assertEquals(events.length, 1);
  assertEquals(events[0].event, "error");
  assertEquals(record(events[0].data.error).code, "UNKNOWN_SESSION_CURSOR");
});

Deno.test("rpc: CORS preflight allows session cursor header", async () => {
  const handler = createRpcHandler({ manifest: {} });

  const response = await handler(
    new Request("http://localhost/_ultimate/rpc/hello", {
      method: "OPTIONS",
    }),
  );

  assertEquals(response.status, 204);
  const allowed = response.headers.get("Access-Control-Allow-Headers") ?? "";
  assert(allowed.includes("Content-Type"));
  assert(allowed.includes("Accept"));
  assert(allowed.includes("Ultimate-Session-Cursor"));
});

function rpcRequest(url: string, args: unknown[] = []): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "RemoteFunctionCalling", version: 1, args }),
  });
}

function sseRequest(
  url: string,
  headers: Record<string, string> = {},
  args: unknown[] = [],
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Accept": "text/event-stream",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      type: "RemoteFunctionCalling",
      version: 1,
      args,
    }),
  });
}

function parseSse(
  text: string,
): Array<{ event: string; data: Record<string, unknown> }> {
  return text.trim().split("\n\n").map((raw) => {
    let event = "message";
    const data: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
    return { event, data: record(JSON.parse(data.join("\n"))) };
  });
}

function record(value: unknown): Record<string, unknown> {
  assert(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
