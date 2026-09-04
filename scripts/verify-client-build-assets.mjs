import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HASH_LIKE_JS = /^[A-Za-z0-9_-]{8,64}\.js$/;
const HEX_HASHED_JS = /^[0-9a-f]{8,64}\.js$/;
const LOCAL_IMPORT = /(?:from\s*["']\.\/([^"']+\.js)["']|import\s*["']\.\/([^"']+\.js)["']|import\s*\(\s*["']\.\/([^"']+\.js)["']\s*\))/g;

function walkJavaScriptFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJavaScriptFiles(entryPath));
    } else if (entry.isFile() && extname(entry.name) === ".js") {
      files.push(entryPath);
    }
  }

  return files;
}

function assertInside(directory, candidate) {
  const relativePath = relative(resolve(directory), resolve(candidate));
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Local import escapes Nuxt asset directory: ${candidate}`);
  }
}

export function verifyClientBuildAssets(outputDir = ".output/public") {
  const nuxtDir = join(outputDir, "_nuxt");
  if (!existsSync(nuxtDir)) {
    throw new Error(`Nuxt client asset directory does not exist: ${nuxtDir}`);
  }

  const files = walkJavaScriptFiles(nuxtDir);
  if (files.length === 0) {
    throw new Error(`No JavaScript assets found in ${nuxtDir}`);
  }

  let checkedImports = 0;
  for (const file of files) {
    const fileName = basename(file);
    if (HASH_LIKE_JS.test(fileName) && !HEX_HASHED_JS.test(fileName)) {
      throw new Error(`Hashed JavaScript filename is not hexadecimal: ${fileName}`);
    }

    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(LOCAL_IMPORT)) {
      const importName = match[1] ?? match[2] ?? match[3];
      const importPath = normalize(join(dirname(file), importName));
      assertInside(nuxtDir, importPath);
      if (!existsSync(importPath)) {
        throw new Error(`Missing local JavaScript import: ${importName} referenced by ${file}`);
      }
      checkedImports += 1;
    }
  }

  return { checkedFiles: files.length, checkedImports };
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedFile === fileURLToPath(import.meta.url)) {
  const result = verifyClientBuildAssets(process.argv[2] ?? ".output/public");
  console.log(`Client build assets verified: ${result.checkedFiles} JS files, ${result.checkedImports} local imports.`);
}
