import { defineConfig, devices } from "@playwright/test";

const port = process.env.HSD_E2E_PORT ?? "49852";
const baseURL = `http://127.0.0.1:${port}`;
const localChromiumPath = process.env.HSD_E2E_CHROMIUM_PATH;
const webServerCommand = process.env.CI
  ? "node .output/server/index.mjs"
  : "corepack pnpm exec nuxt build && node .output/server/index.mjs";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    env: {
      HOST: "127.0.0.1",
      PORT: port,
      NITRO_HOST: "127.0.0.1",
      NITRO_PORT: port,
      NUXT_TELEMETRY_DISABLED: "1",
      NUXT_IGNORE_LOCK: "1"
    },
    reuseExistingServer: false,
    timeout: 240_000
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(localChromiumPath
          ? {
              headless: false,
              launchOptions: { executablePath: localChromiumPath }
            }
          : {}),
        viewport: { width: 1440, height: 1000 }
      }
    }
  ]
});
