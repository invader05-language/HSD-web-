import { cp, mkdir, readdir, readFile, lstat } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HASHED_ASSET = /^[0-9a-f]{8,64}\.(?:js|css|map|woff2?|ttf|eot|png|jpe?g|webp|svg|avif)$/i;
const LOCAL_IMPORT = /(?:from\s*["']\.\/([^"']+)["']|import\s*["']\.\/([^"']+)["']|import\s*\(\s*["']\.\/([^"']+)["']\s*\))/g;

function assertInside(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error(`Release asset path escapes root: ${candidate}`);
}

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`Release asset source may not contain symlinks: ${path}`);
    if (entry.isDirectory()) result.push(...await filesUnder(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

async function copyIfUnchanged(source, target) {
  assertInside(dirname(target), target);
  try {
    const existing = await readFile(target);
    const incoming = await readFile(source);
    if (!existing.equals(incoming)) throw new Error(`Hashed asset collision: ${target}`);
    return "existing";
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target, { errorOnExist: true });
    return "copied";
  }
}

/**
 * Preserve immutable client resources from verified releases before final
 * candidate hashes are calculated. HTML, latest.json, and build metadata are
 * deliberately excluded.
 */
export async function preserveReleaseAssets({ targetRoot, sourceRoots }) {
  const target = resolve(targetRoot);
  const candidates = new Map();
  for (const sourceRoot of sourceRoots) {
    const source = resolve(sourceRoot);
    const files = await filesUnder(source);
    for (const file of files) {
      const name = basename(file);
      if (!HASHED_ASSET.test(name) || name === "latest.json") continue;
      const rel = relative(source, file);
      if (rel.includes("builds") || rel.endsWith(".html")) continue;
      candidates.set(rel, file);
    }
  }

  let copied = 0;
  let existing = 0;
  for (const [rel, source] of candidates) {
    const destination = join(target, rel);
    assertInside(target, destination);
    const state = await copyIfUnchanged(source, destination);
    if (state === "copied") copied += 1;
    else existing += 1;
  }
  return { candidates: candidates.size, copied, existing };
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const [targetRoot, ...sourceRoots] = process.argv.slice(2);
  if (!targetRoot || sourceRoots.length === 0) {
    throw new Error("Usage: node scripts/preserve-release-assets.mjs <target-public> <verified-source-public> [...sources]");
  }
  console.log(JSON.stringify(await preserveReleaseAssets({ targetRoot, sourceRoots })));
}
