import type { ResolvedConfig } from "@ultimate-js/core";
import { startDevServer } from "@ultimate-js/dev-server";

export async function dev(projectRoot: string, config: ResolvedConfig): Promise<void> {
  await startDevServer(projectRoot, config);
}
