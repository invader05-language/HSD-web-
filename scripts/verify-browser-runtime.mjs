import assert from "node:assert/strict";

const baseUrl = process.argv[2] ?? process.env.HSD_BROWSER_RUNTIME_BASE_URL ?? "http://127.0.0.1:3000";
const paths = ["/login", "/_nuxt/builds/latest.json"];

for (const path of paths) {
  const response = await fetch(new URL(path, baseUrl), { cache: "no-store" });
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  const cache = response.headers.get("cache-control") ?? "";
  if (path === "/login") assert.match(cache, /no-store/i, "login HTML must not be cached");
  if (path.endsWith("latest.json")) assert.match(cache, /no-store/i, "release metadata must not be cached");
  if (path === "/login") {
    const html = await response.text();
    assert.doesNotMatch(html, /http:\/\/114\.132\.236\.244/i, "login HTML must not publish an HTTP API origin");
  }
  console.log(`${path}: ${response.status} cache-control=${cache || "<none>"}`);
}
