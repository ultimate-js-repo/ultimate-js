import { join } from "@std/path";

export async function ensureDir(dir: string): Promise<void> {
  try {
    await Deno.mkdir(dir, { recursive: true });
  } catch { /* Directory might already exist */ }
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  for await (const entry of Deno.readDir(src)) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile) {
      await Deno.copyFile(srcPath, destPath);
    }
  }
}

export async function removeDir(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch { /* Directory might not exist */ }
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  const dir = path.substring(0, path.lastIndexOf("/"));
  await ensureDir(dir);
  await Deno.writeTextFile(path, content);
}
