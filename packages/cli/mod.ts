import { resolveProjectRoot } from "./utils.ts";
import { loadConfig } from "@ultimate-js/core";
import {
  applyBuildOverrides,
  applyDevOverrides,
  applyPreviewOverrides,
  parseCommandOptions,
} from "./options.ts";

const args = Deno.args;
const command = args[0];
const commandArgs = args.slice(1);

if (!command) {
  console.log("Ultimate.js CLI");
  console.log("");
  console.log("Usage:");
  console.log("  ultimate create <name>       Create a new project");
  console.log("  ultimate dev    [project]    Start development server");
  console.log("  ultimate build  [project]    Build for production");
  console.log("  ultimate preview [project]   Preview production build");
  Deno.exit(0);
}

async function main() {
  if (command === "create") {
    const projectName = commandArgs[0];
    if (!projectName) {
      console.error("Usage: ultimate create <project-name>");
      Deno.exit(1);
    }
    const { create } = await import("./create.ts");
    await create(projectName);
    return;
  }

  const options = parseCommandOptions(commandArgs);
  const projectRoot = resolveProjectRoot(options.project);
  console.log(`Project root: ${projectRoot}`);

  const baseConfig = await loadConfig(projectRoot);

  switch (command) {
    case "dev": {
      const { dev } = await import("./dev.ts");
      await dev(projectRoot, applyDevOverrides(baseConfig, options.rest));
      break;
    }
    case "build": {
      const { build } = await import("./build.ts");
      await build(projectRoot, applyBuildOverrides(baseConfig, options.rest));
      break;
    }
    case "preview": {
      const { preview } = await import("./preview.ts");
      await preview(
        projectRoot,
        applyPreviewOverrides(baseConfig, options.rest),
      );
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      Deno.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  Deno.exit(1);
});
