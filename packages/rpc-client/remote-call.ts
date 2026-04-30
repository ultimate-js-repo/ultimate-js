import type { RemoteFunctionCalling, RemoteFunctionResult } from "@ultimate-js/protocol";
import { getRemoteEndpoint } from "./config.ts";

export async function remoteFunctionCall<T>(
  functionId: string,
  args: unknown[],
): Promise<T> {
  const call: RemoteFunctionCalling = {
    type: "RemoteFunctionCalling",
    version: 1,
    args,
  };

  const base = getRemoteEndpoint();
  const url = `${base}/${functionId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(call),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed with status ${response.status}: ${response.statusText}`);
  }

  const result: RemoteFunctionResult = await response.json();

  if (result.ok) {
    return result.value as T;
  }

  const err = new Error(result.error.message);
  err.name = result.error.name;
  if (result.error.stack) {
    err.stack = result.error.stack;
  }
  throw err;
}
