const path = require("node:path");

module.exports = function ultimateClientTransformLoader(source) {
  const options = this.getOptions ? this.getOptions() : {};
  const appDir = normalize(options.appDir || "");
  const proxySpec = options.proxySpec || "ultimate:client-proxies";
  const serverFiles = new Set(
    (options.serverFunctionFiles || []).map(normalize),
  );
  const resourcePath = normalize(this.resourcePath || "");

  if (appDir && !resourcePath.startsWith(appDir + path.sep)) {
    return source;
  }

  return transformClientSource(source, resourcePath, serverFiles, proxySpec);
};

function transformClientSource(
  source,
  originalFilePath,
  serverFunctionFiles,
  proxySpec,
) {
  let result = source;
  let match;
  const re =
    /(import\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?|import\s+["']([^"']+)["']\s*;?|export\s+(?:[\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?)/g;

  while ((match = re.exec(source)) !== null) {
    const specifier = match[2] || match[3] || match[4];
    if (!specifier || !specifier.startsWith(".")) continue;

    const resolved = normalize(
      path.resolve(path.dirname(originalFilePath), specifier),
    );
    let found = false;
    for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
      if (serverFunctionFiles.has(normalize(resolved + ext))) {
        found = true;
        break;
      }
    }
    if (!found && serverFunctionFiles.has(resolved)) found = true;
    if (!found) continue;

    const fullMatch = match[0];
    const newImport = fullMatch.replace(
      new RegExp(`(["'])${escapeRegExp(specifier)}\\1`),
      `$1${proxySpec}$1`,
    );
    result = result.replace(fullMatch, newImport);
  }

  return result;
}

function normalize(filePath) {
  return path.normalize(filePath);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
