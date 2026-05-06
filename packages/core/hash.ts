// Simple stable hash function (djb2 variant)
export function hashId(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return hex;
}

/**
 * Generate a stable fingerprint for a function.
 * @param modulePath  Module path relative to app/, without extension
 *                    e.g. "functions/user"
 * @param signature   Full signature, e.g. "getUser(id: string)"
 *
 * Hash input: "functions/user/getUser(id: string)"
 */
export function functionFingerprint(
  modulePath: string,
  signature: string,
): string {
  return hashId(`${modulePath}/${signature}`);
}
