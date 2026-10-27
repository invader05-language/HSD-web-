import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const certificatePath = process.argv[2];
const keyPath = process.argv[3];
if (!certificatePath || !keyPath) throw new Error("Usage: node scripts/run-https-isolated-e2e.mjs <cert.pem> <key.pem>");

const WEB_PORT = 50102;
const HTTPS_PORT = 54443;
const candidate = spawn(process.execPath, [".output/server/index.mjs"], {
  env: { ...process.env, NITRO_HOST: "127.0.0.1", NITRO_PORT: String(WEB_PORT), NITRO_PUBLIC_API_BASE: "http://127.0.0.1", NITRO_PUBLIC_USE_MOCK_API: "false" },
  stdio: "ignore",
});

const sessionBody = JSON.stringify({
  account: { id: "isolated-owner", adminLevel: "OWNER", adminCenterId: null, adminCenter: null, capabilities: ["recruitment.assessment.edit"] },
  person: { id: "isolated-person", name: "隔离测试账号", status: "FORMAL_MEMBER" },
  mustChangePassword: false,
});
const loginBody = JSON.stringify({ mustChangePassword: false, csrfToken: "cookie-managed", expiresAt: "2026-12-31T00:00:00.000Z" });

function respond(response, status, body, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json", ...headers });
  response.end(body);
}

function proxyToCandidate(request, response) {
  const upstream = httpRequest({ hostname: "127.0.0.1", port: WEB_PORT, path: request.url, method: request.method, headers: request.headers }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on("error", () => respond(response, 502, JSON.stringify({ code: "ISOLATED_PROXY_FAILED", message: "proxy failed", requestId: "isolated-proxy" })));
  request.pipe(upstream);
}

const server = createHttpsServer({ key: await readFile(keyPath), cert: await readFile(certificatePath) }, (request, response) => {
  const path = new URL(request.url ?? "/", "https://127.0.0.1").pathname;
  if (path === "/api/v1/auth/login" && request.method === "POST") {
    respond(response, 201, loginBody, {
      "Set-Cookie": ["hsd_session=isolated-session; Path=/; HttpOnly; Secure; SameSite=Lax", "hsd_csrf=isolated-csrf; Path=/; Secure; SameSite=Lax"],
    });
    request.resume();
    return;
  }
  if (path === "/api/v1/auth/session" && request.method === "GET") {
    if ((request.headers.cookie ?? "").includes("hsd_session=isolated-session")) respond(response, 200, sessionBody);
    else respond(response, 401, JSON.stringify({ code: "UNAUTHENTICATED", message: "Authentication required", requestId: "isolated-session-401" }));
    return;
  }
  if (path.startsWith("/api/")) {
    respond(response, 401, JSON.stringify({ code: "UNAUTHENTICATED", message: "Authentication required", requestId: "isolated-api-401" }));
    return;
  }
  proxyToCandidate(request, response);
});

await new Promise((resolve) => server.listen(HTTPS_PORT, "127.0.0.1", resolve));
try {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const authRequests = [];
  const pageErrors = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/auth/")) authRequests.push({ url: request.url(), method: request.method() });
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`https://127.0.0.1:${HTTPS_PORT}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="account"]').fill("isolated-owner");
  await page.locator('input[name="password"]').fill("isolated-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await page.waitForURL(/\/member/, { timeout: 10_000 });
  assert.equal(pageErrors.length, 0, `isolated HTTPS page errors: ${pageErrors.join("; ")}`);
  assert.ok(authRequests.length >= 2, "expected login and session requests");
  assert.ok(authRequests.every(({ url }) => new URL(url).protocol === "https:"), "authentication requests must remain HTTPS");
  const postIndex = authRequests.findIndex(({ method }) => method === "POST");
  assert.ok(postIndex >= 0, "expected a login POST");
  assert.equal(authRequests.slice(postIndex + 1).find(({ method }) => method === "GET")?.method, "GET");
  console.log(JSON.stringify({ protocol: "https:", postAndSession: "passed", pageErrors: 0 }));
  await browser.close();
} finally {
  await new Promise((resolve) => server.close(resolve));
  candidate.kill();
}
