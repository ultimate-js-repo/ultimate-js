let remoteEndpoint = "/_ultimate/rpc";

/**
 * Set the RPC base URL.
 * Accepts paths like "/_ultimate/rpc" or full URLs like
 * "http://localhost:8001/api", "https://example.com".
 * Trailing slashes are stripped.
 */
export function setRemoteEndpoint(url: string): void {
  remoteEndpoint = url.replace(/\/+$/, "");
}

export function getRemoteEndpoint(): string {
  return remoteEndpoint;
}
