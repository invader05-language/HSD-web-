import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyClientBuildAssets } from "../../scripts/verify-client-build-assets.mjs";

function createNuxtOutput(files: Record<string, string>) {
  const outputDir = mkdtempSync(join(tmpdir(), "hsd-build-assets-"));
  const nuxtDir = join(outputDir, "_nuxt");
  mkdirSync(nuxtDir, { recursive: true });

  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(nuxtDir, name), contents, "utf8");
  }

  return outputDir;
}

describe("verifyClientBuildAssets", () => {
  it("configures Rollup to use hexadecimal chunk hashes", () => {
    const nuxtConfig = readFileSync(resolve(process.cwd(), "nuxt.config.ts"), "utf8");

    expect(nuxtConfig).toMatch(/hashCharacters:\s*["']hex["']/);
  });

  it("rejects hashed JavaScript filenames outside the hexadecimal alphabet", () => {
    const outputDir = createNuxtOutput({ "OC0IVpnN.js": "export default {}" });

    expect(() => verifyClientBuildAssets(outputDir)).toThrow(/hexadecimal/i);
  });

  it("rejects longer hashed filenames outside the hexadecimal alphabet", () => {
    const outputDir = createNuxtOutput({ "abc12345g.js": "export default {}" });

    expect(() => verifyClientBuildAssets(outputDir)).toThrow(/hexadecimal/i);
  });

  it("accepts hexadecimal chunks and verifies their local imports", () => {
    const outputDir = createNuxtOutput({
      "0c01a2ff.js": 'import "./a1b2c3d4.js";',
      "a1b2c3d4.js": "export default {};"
    });

    expect(verifyClientBuildAssets(outputDir)).toEqual({
      checkedFiles: 2,
      checkedImports: 1
    });
  });

  it("rejects imports that escape the Nuxt asset directory", () => {
    const outputDir = createNuxtOutput({
      "0c01a2ff.js": 'import "./../escape.js";'
    });

    expect(() => verifyClientBuildAssets(outputDir)).toThrow(/escapes Nuxt asset directory/i);
  });
});
