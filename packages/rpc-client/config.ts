const REMOTE_ENDPOINT_KEY = "__ultimate_rpc_remote_endpoint__";

type RpcGlobal = typeof globalThis & {
  [REMOTE_ENDPOINT_KEY]?: string;
};

function rpcGlobal(): RpcGlobal {
  return globalThis as RpcGlobal;
}

/**
 * Set the RPC base URL.
 * Accepts paths like "/_ultimate/rpc" or full URLs like
 * "http://localhost:8001/api", "https://example.com".
 * Trailing slashes are stripped.
 */
export function setRemoteEndpoint(url: string): void {
  rpcGlobal()[REMOTE_ENDPOINT_KEY] = url.replace(/\/+$/, "");
}

export function getRemoteEndpoint(): string {
  return rpcGlobal()[REMOTE_ENDPOINT_KEY] ?? "/_ultimate/rpc";
}
