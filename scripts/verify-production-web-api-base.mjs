import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const templateUrl = new URL("../infra/systemd/hsd-web-current-release.conf", import.meta.url);
const template = await readFile(templateUrl, "utf8");
const apiBaseLines = template.match(/^Environment=NITRO_PUBLIC_API_BASE=(.+)$/gm) ?? [];

assert.equal(
  apiBaseLines.length,
  1,
  "The production Web drop-in must define exactly one NITRO_PUBLIC_API_BASE",
);

const apiBase = apiBaseLines[0].slice("Environment=NITRO_PUBLIC_API_BASE=".length);
const apiUrl = new URL(apiBase);

assert.equal(apiUrl.protocol, "https:", "The production Web API base must use HTTPS");
assert.equal(apiUrl.origin, "https://114.132.236.244", "The production Web API base must use the reviewed origin");

console.log(`Production Web API base verified: ${apiUrl.origin}`);
