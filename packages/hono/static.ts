import { join } from "@std/path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

export function createStaticHandler(
  rootDir: string,
): (request: Request, pathname: string) => Promise<Response | null> {
  return async (
    _request: Request,
    pathname: string,
  ): Promise<Response | null> => {
    try {
      const filePath = join(rootDir, pathname);
      if (!filePath.startsWith(rootDir)) return null;

      const file = await Deno.open(filePath, { read: true });
      const stat = await file.stat();
      if (!stat.isFile) {
        file.close();
        return null;
      }

      const ext = filePath.substring(filePath.lastIndexOf("."));
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      return new Response(file.readable, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(stat.size),
        },
      });
    } catch {
      return null;
    }
  };
}

export function serveStaticFile(
  filePath: string,
  contentType?: string,
): Response {
  const content = Deno.readTextFileSync(filePath);
  return new Response(content, {
    headers: { "Content-Type": contentType || "text/plain; charset=utf-8" },
  });
}
