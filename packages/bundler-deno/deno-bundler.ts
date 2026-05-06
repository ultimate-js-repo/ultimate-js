import type { BundlerAdapter } from "./bundler-types.ts";

export class DenoBundler implements BundlerAdapter {
  async bundleClient(options: {
    entry: string;
    outFile: string;
    projectRoot: string;
  }): Promise<void> {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "bundle",
        options.entry,
        "--platform=browser",
        "--no-check",
        "--config",
        "deno.json",
        "-o",
        options.outFile,
      ],
      cwd: options.projectRoot,
    });

    const output = await command.output();
    if (!output.success) {
      const stderr = new TextDecoder().decode(output.stderr);
      throw new Error(`deno bundle failed:\n${stderr.substring(0, 500)}`);
    }
  }
}
