/**
 * Dynamic import wrapper for runtime-determined module paths.
 *
 * Hides `import(variable)` from `deno publish` static analysis
 * while keeping the same runtime semantics.
 */

const _import = new Function("s", "return import(s)") as (
  specifier: string,
) => Promise<Record<string, unknown>>;

/**
 * Import a module by a runtime-determined path.
 * Use this instead of bare `import(variable)` to avoid publish warnings.
 */
export async function runtimeImport(
  specifier: string,
): Promise<Record<string, unknown>> {
  return await _import(specifier);
}
