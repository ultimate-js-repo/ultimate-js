import { join, resolve } from "@std/path";
import { intro, outro, selectPrompt, step, textPrompt } from "./tui.ts";

const TEMPLATE_REPO_RAW_URL =
  "https://raw.githubusercontent.com/Jel1ySpot/ultimate-js-empty/main";

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
  lines.push(`    endpoint: "/_ultimate/rpc",`);
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

  step("");

  const opts: ProjectOptions = { name, parser, bundler, port };
  const loader = await createTemplateLoader();

  const configDst = join(dest, "ultimate.config.ts");
  await Deno.mkdir(dest, { recursive: true });
  await Deno.writeTextFile(configDst, generateConfig(opts));
  step("+ ultimate.config.ts");

  for (const [destFile, subpath] of Object.entries(TEMPLATE_FILES)) {
    const dst = join(dest, destFile);
    const parent = dst.substring(0, dst.lastIndexOf("/"));
    await Deno.mkdir(parent, { recursive: true });

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

// ── Template loader ─────────────────────────────────────

type Loader = (subpath: string) => Promise<string>;

async function createTemplateLoader(): Promise<Loader> {
  const cliDir = new URL(".", import.meta.url).pathname;
  const localDir = resolve(cliDir, "../../examples/template");
  try {
    await Deno.stat(join(localDir, "ultimate.config.ts"));
    return async (subpath: string) => {
      const file = subpath.replace(/^\.\//, "");
      return await Deno.readTextFile(join(localDir, file));
    };
  } catch { /* not in monorepo */ }

  step("Fetching template from Jel1ySpot/ultimate-js-empty");

  return async (subpath: string) => {
    const file = subpath.replace(/^\.\//, "");
    const url = `${TEMPLATE_REPO_RAW_URL}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return await res.text();
  };
}
