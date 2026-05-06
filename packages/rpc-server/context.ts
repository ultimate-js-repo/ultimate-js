import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<unknown>();

export function runWithContext<T>(
  ctx: unknown,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return storage.run(ctx, fn);
}

export function getContext<T = unknown>(): T {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "No context available. Ensure runWithContext is wrapping the current execution.",
    );
  }
  return ctx as T;
}
