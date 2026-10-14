// @vitest-environment node
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { preserveReleaseAssets, preserveReleaseAssetsBeforeBuild } from "../../scripts/preserve-release-assets.mjs";

const temporaryRoots: string[] = [];
const nativeImport = (url: string) => import(/* @vite-ignore */ url);

async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "hsd-release-assets-"));
  temporaryRoots.push(root);
  for (const [name, contents] of Object.entries(files)) {
    const path = join(root, name);
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, contents);
  }
  return root;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("release asset preservation", () => {
  it("registers previous immutable assets in the built Nitro server before its manifest is generated", async () => {
    const previousPublic = await fixture({
      "_nuxt/1009fa88.js": 'export const previous = "retained";',
      "_nuxt/108f57142.css": ".retained { color: red; }",
      "_nuxt/builds/latest.json": '{"id":"previous"}',
      "_nuxt/builds/meta/abcdef12.json": '{"id":"previous"}',
      "_nuxt/builds/abcdef12.js": "previous build metadata",
      "index.html": "previous page",
      "favicon.svg": "previous favicon",
    });
    const root = await fixture({ "public/_nuxt/abcdef12.js": "export const current = true;" });
    vi.stubEnv("HSD_PREVIOUS_RELEASE_PUBLIC", previousPublic);
    vi.stubGlobal("defineNuxtConfig", (config: unknown) => config);
    const { default: config } = await import("../../nuxt.config");
    const requireFromNuxt = createRequire(createRequire(import.meta.url).resolve("nuxt/package.json"));
    const nitroPackage = dirname(requireFromNuxt.resolve("nitropack/package.json"));
    const { createNitro, prepare, copyPublicAssets, build } = await nativeImport(pathToFileURL(join(nitroPackage, "dist/core/index.mjs")).href);
    const nitro = await createNitro({
      rootDir: root,
      preset: "node-listener",
      serveStatic: true,
      logLevel: 0,
      compatibilityDate: "2026-07-28",
      hooks: config.nitro?.hooks ?? {},
      publicAssets: [{ dir: join(root, "public"), baseURL: "/" }],
    });
    let server: ReturnType<typeof createServer> | undefined;
    try {
      await prepare(nitro);
      await copyPublicAssets(nitro);
      await build(nitro);
      // Reproduce release packaging: presence on disk alone must not satisfy
      // this regression when the built server's manifest omitted the asset.
      await preserveReleaseAssets({ targetRoot: nitro.options.output.publicDir, sourceRoots: [previousPublic] });
      expect(await readFile(join(nitro.options.output.publicDir, "_nuxt/1009fa88.js"), "utf8")).toContain("retained");
      const { listener } = await nativeImport(pathToFileURL(join(nitro.options.output.serverDir, "index.mjs")).href);
      server = createServer(listener);
      await new Promise<void>((done) => server!.listen(0, "127.0.0.1", done));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");
      const base = `http://127.0.0.1:${address.port}`;
      const previous = await fetch(`${base}/_nuxt/1009fa88.js`);
      expect(previous.status).toBe(200);
      expect(await previous.text()).toBe('export const previous = "retained";');
      expect((await fetch(`${base}/_nuxt/108f57142.css`)).status).toBe(200);
      expect((await fetch(`${base}/_nuxt/abcdef12.js`)).status).toBe(200);
      expect((await fetch(`${base}/_nuxt/builds/latest.json`)).status).toBe(404);
      expect((await fetch(`${base}/_nuxt/builds/abcdef12.js`)).status).toBe(404);
      expect((await fetch(`${base}/index.html`)).status).toBe(404);
      expect((await fetch(`${base}/favicon.svg`)).status).toBe(404);
      await expect(readFile(join(root, "public/_nuxt/1009fa88.js"))).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await new Promise<void>((done, reject) => server ? server.close((error) => error ? reject(error) : done()) : done());
      await nitro.close();
    }
  }, 30_000);

  it("rejects different bytes under an existing immutable filename", async () => {
    const previousPublic = await fixture({ "_nuxt/1009fa88.js": "previous" });
    const outputPublic = await fixture({ "_nuxt/1009fa88.js": "current" });
    await expect(preserveReleaseAssets({ targetRoot: outputPublic, sourceRoots: [previousPublic] })).rejects.toThrow("Hashed asset collision");
    expect(await readFile(join(outputPublic, "_nuxt/1009fa88.js"), "utf8")).toBe("current");
  });

  it("leaves ordinary builds and development independent of previous releases", async () => {
    vi.stubEnv("HSD_PREVIOUS_RELEASE_PUBLIC", "");
    await expect(preserveReleaseAssetsBeforeBuild({ options: { dev: false } })).resolves.toBeUndefined();
    vi.stubEnv("HSD_PREVIOUS_RELEASE_PUBLIC", "not-a-real-source");
    await expect(preserveReleaseAssetsBeforeBuild({ options: { dev: true } })).resolves.toBeUndefined();
  });

  it("rejects an ambiguous relative previous-release path", async () => {
    vi.stubEnv("HSD_PREVIOUS_RELEASE_PUBLIC", "previous/.output/public");
    await expect(preserveReleaseAssetsBeforeBuild({ options: { dev: false } })).rejects.toThrow("must be an absolute");
  });

  it("rejects a missing previous release instead of silently losing compatibility", async () => {
    const root = await fixture({});
    vi.stubEnv("HSD_PREVIOUS_RELEASE_PUBLIC", join(root, "missing"));
    await expect(preserveReleaseAssetsBeforeBuild({ options: { output: { publicDir: join(root, "output") } } })).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects using the build output itself as the previous release", async () => {
    const root = await fixture({});
    vi.stubEnv("HSD_PREVIOUS_RELEASE_PUBLIC", root);
    await expect(preserveReleaseAssetsBeforeBuild({ options: { output: { publicDir: root } } })).rejects.toThrow("separate real release");
  });
});
