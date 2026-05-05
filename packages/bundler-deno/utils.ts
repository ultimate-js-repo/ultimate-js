import { copy, ensureDir as ensureStdDir } from "@std/fs";

export async function ensureDir(dir: string): Promise<void> {
  await ensureStdDir(dir);
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await copy(src, dest, { overwrite: true });
}

export async function removeDir(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch { /* Directory might not exist */ }
}

export async function writeTextFile(
  path: string,
  content: string,
): Promise<void> {
  const dir = path.substring(0, path.lastIndexOf("/"));
  await ensureDir(dir);
  await Deno.writeTextFile(path, content);
}
