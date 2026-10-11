import fs from "fs";
import path from "path";

const isInside = (p: string, dir: string) => p.startsWith(dir + path.sep);

/**
 * Resolve a repo-relative path taken from queue/agent data to the absolute path
 * the dashboard may write — or null when it isn't allowed: absolute paths, `..`
 * segments, anything outside `roots` or without one of `exts`, and existing
 * files whose real location (symlinks resolved) leaves those roots.
 * A path that is allowed but doesn't exist is returned; callers check existence.
 */
export function resolveProjectFile(
  rel: unknown,
  { roots, exts, root = process.cwd() }: { roots: string[]; exts: string[]; root?: string },
): string | null {
  if (typeof rel !== "string" || rel === "" || rel.length > 512 || rel.includes("\0")) return null;
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel) || /^[\\/]/.test(rel)) return null;
  if (rel.split(/[\\/]+/).includes("..")) return null;
  if (!exts.includes(path.extname(rel).toLowerCase())) return null;

  const repo = path.resolve(root);
  const abs = path.resolve(repo, rel);
  if (!roots.some((r) => isInside(abs, path.resolve(repo, r)))) return null;

  if (fs.existsSync(abs)) {
    const real = fs.realpathSync(abs);
    const realRoots = roots.flatMap((r) => {
      try {
        return [fs.realpathSync(path.resolve(repo, r))];
      } catch {
        return [];
      }
    });
    if (!realRoots.some((r) => isInside(real, r))) return null;
  }
  return abs;
}
