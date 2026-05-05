import { join, resolve } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import { intro, outro, selectPrompt, step, textPrompt } from "./tui.ts";

const TEMPLATE_REPO_RAW_URL =
  "https://raw.githubusercontent.com/ultimate-js-repo/ultimate-js-empty/main";

const TEMPLATE_FILES: Record<string, string> = {
  "deno.json": "./deno.json.tmpl",
  "app/layout.tsx": "./app/layout.tsx",
  "app/page.tsx": "./app/page.tsx",
  "app/about/page.tsx": "./app/about/page.tsx",
  "app/components/CounterButton.tsx": "./app/components/CounterButton.tsx",
  "app/components/UserCard.tsx": "./app/components/UserCard.tsx",
  "app/functions/counter.ts": "./app/functions/counter.ts",
  "app/functions/user.ts": "./app/functions/user.ts",
};

// ── Config generation ───────────────────────────────────

interface ProjectOptions {
  name: string;
  parser: string;
  bundler: string;
  port: number;
  endpoint: string;
}

function generateConfig(opts: ProjectOptions): string {
  const lines: string[] = [];
  lines.push(`import { defineConfig } from "@ultimate-js/core";`);
  lines.push(``);
  lines.push(`export default defineConfig({`);

  if (opts.parser !== "babel") {
    lines.push(`  parser: "${opts.parser}",`);
  }
  if (opts.bundler !== "native") {
    lines.push(`  bundler: "${opts.bundler}",`);
  }

  lines.push(`  server: {`);
  lines.push(`    port: ${opts.port},`);
  lines.push(`    endpoint: ${JSON.stringify(opts.endpoint)},`);
  lines.push(`  },`);
  lines.push(`  dev: {`);
  lines.push(`    port: ${opts.port},`);
  lines.push(`    apiPort: ${opts.port + 1},`);
  lines.push(`  },`);
  lines.push(`});`);
  lines.push(``);
  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────

export async function create(name: string): Promise<void> {
  const dest = resolve(Deno.cwd(), name);

  try {
    const entries = [];
    for await (const e of Deno.readDir(dest)) entries.push(e);
    if (entries.length > 0) {
      console.error(
        `Error: directory "${name}" already exists and is not empty.`,
      );
      Deno.exit(1);
    }
  } catch { /* doesn't exist */ }

  intro(`Ultimate.js \u2014 create ${name}`);

  const parser = await selectPrompt("Parser", ["babel", "swc"] as const);
  const bundler = await selectPrompt(
    "Bundler",
    ["native", "vite", "rspack"] as const,
  );
  const portStr = await textPrompt("Server port", "8000");
  const port = parseInt(portStr, 10) || 8000;
  const endpoint = normalizeEndpoint(
    await textPrompt("RPC endpoint", "/_ultimate/rpc"),
  );

  step("");

  const opts: ProjectOptions = { name, parser, bundler, port, endpoint };
  const loader = await createTemplateLoader();

  const configDst = join(dest, "ultimate.config.ts");
  await ensureDir(dest);
  await Deno.writeTextFile(configDst, generateConfig(opts));
  step("+ ultimate.config.ts");

  for (const [destFile, subpath] of Object.entries(TEMPLATE_FILES)) {
    const dst = join(dest, destFile);
    const parent = dst.substring(0, dst.lastIndexOf("/"));
    await ensureDir(parent);

    let content = await loader(subpath);

    if (destFile === "app/layout.tsx") {
      content = content.replace("My Ultimate.js App", name);
      content = content.replace("My App", name);
    }

    await Deno.writeTextFile(dst, content);
    step(`+ ${destFile}`);
  }

  outro(`Done! Run:  cd ${name} && deno task dev`);
}

function normalizeEndpoint(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "/_ultimate/rpc";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

// ── Template loader ─────────────────────────────────────

type Loader = (subpath: string) => Promise<string>;

async function createTemplateLoader(): Promise<Loader> {
  const cliDir = new URL(".", import.meta.url).pathname;
  const localDir = resolve(cliDir, "../../examples/template");
  if (await exists(join(localDir, "ultimate.config.ts"), { isFile: true })) {
    return async (subpath: string) => {
      const file = subpath.replace(/^\.\//, "");
      return await Deno.readTextFile(join(localDir, file));
    };
  }

  step("Fetching template from ultimate-js-repo/ultimate-js-empty");

  return async (subpath: string) => {
    const file = subpath.replace(/^\.\//, "");
    const url = `${TEMPLATE_REPO_RAW_URL}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return await res.text();
  };
}
