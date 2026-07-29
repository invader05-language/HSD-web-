import { cp, lstat, readFile, readdir, realpath, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const functionsRoot = path.resolve(".vercel/output/functions");
const fallbackRoot = path.join(functionsRoot, "__fallback.func");
const outputConfigPath = path.resolve(".vercel/output/config.json");
const junctions = [];

async function collectJunctions(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    const stats = await lstat(entryPath);

    if (stats.isSymbolicLink()) {
      junctions.push(entryPath);
      continue;
    }

    if (stats.isDirectory()) {
      await collectJunctions(entryPath);
    }
  }
}

await collectJunctions(fallbackRoot);

for (const junction of junctions) {
  const normalizedPath = path.resolve(junction);
  const target = await realpath(junction);

  if (!normalizedPath.startsWith(`${functionsRoot}${path.sep}`)) {
    throw new Error(`Refusing to replace path outside Vercel output: ${normalizedPath}`);
  }

  if (!target.startsWith(`${functionsRoot}${path.sep}`) && target !== functionsRoot) {
    throw new Error(`Refusing to copy junction target outside Vercel output: ${target}`);
  }
}

// Vercel's Windows uploader does not preserve Nitro's junction-based dependencies.
junctions.sort((left, right) => right.split(path.sep).length - left.split(path.sep).length);

for (const junction of junctions) {
  const target = await realpath(junction);
  await unlink(junction);
  await cp(target, junction, { recursive: true, dereference: true });
}

// Nitro emits route-specific function junctions. They are all aliases of the
// fallback handler, but Vercel counts materialized copies against Hobby's
// 12-function limit. Route every dynamic request through one real function.
for (const entry of await readdir(functionsRoot, { withFileTypes: true })) {
  if (entry.name === "__fallback.func") continue;
  await rm(path.join(functionsRoot, entry.name), { recursive: true, force: true });
}

const outputConfig = JSON.parse(await readFile(outputConfigPath, "utf8"));
outputConfig.routes = outputConfig.routes.map((route) => {
  if (!route.dest || route.dest.endsWith(".html") || route.dest.startsWith("/_nuxt")) {
    return route;
  }

  return { ...route, dest: "/__fallback" };
});
await writeFile(outputConfigPath, `${JSON.stringify(outputConfig, null, 2)}\n`);

console.log(
  `Materialized ${junctions.length} dependency junctions and consolidated routes into one Vercel function.`
);
