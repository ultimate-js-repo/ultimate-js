/**
 * Bundler adapter interface.
 * Implement this to add support for a new client bundler.
 */
export interface BundlerAdapter {
  bundleClient(options: {
    entry: string;
    outFile: string;
    projectRoot: string;
  }): Promise<void>;
}
