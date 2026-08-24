import { defineConfig, devices } from "@playwright/test";

const port = process.env.HSD_TASK_3C_PORT ?? "50101";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "**/task-3c-admin-*-real.spec.ts",
    "**/task-3c-recruitment-batches-real.spec.ts",
  ],
  timeout: 30_000,
  workers: 1,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: process.env.HSD_TASK_3C_SKIP_BUILD === "true"
      ? "node .output/server/index.mjs"
      : "corepack pnpm exec nuxt build && node .output/server/index.mjs",
    url: baseURL,
    env: {
      HOST: "127.0.0.1", PORT: port, NITRO_HOST: "127.0.0.1", NITRO_PORT: port,
      NUXT_TELEMETRY_DISABLED: "1", NUXT_IGNORE_LOCK: "1", HSD_E2E_TEST_ONLY: "true",
      NUXT_PUBLIC_USE_MOCK_API: "false", NUXT_PUBLIC_API_BASE: "",
    },
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [{ name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
});
