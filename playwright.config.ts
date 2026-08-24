import { defineConfig, devices } from "@playwright/test";

const port = process.env.HSD_E2E_PORT ?? "50100";
const baseURL = `http://127.0.0.1:${port}`;
const localChromiumPath = process.env.HSD_E2E_CHROMIUM_PATH;
const includeExtendedFixtures = process.env.HSD_E2E_INCLUDE_EXTENDED === "true";
const webServerCommand = process.env.CI
  ? "node .output/server/index.mjs"
  : "corepack pnpm exec nuxt build && node .output/server/index.mjs";

// These scenarios assert the pre-API-migration static fixture set (legacy
// gallery labels/counts, old center rosters and published-media routes). Keep
// them available for an explicit extended run, but do not make the supported
// CI Mock contract depend on fixtures that are intentionally no longer the
// production source of truth.
const extendedFixtureTestNames = [
  "owner can publish a gallery",
  "a newly qualified account can start an admin session",
  "overview renders live alliance owners",
  "center details use the live roster",
  "gallery page count follows the filtered result count",
  "gallery album uses full media frames",
  "gallery loads twelve more assets",
  "published media layout regression",
  "project category filters show the projects assigned",
];

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: [
    "**/real-stack-smoke.spec.ts",
    "**/baize-project-real-data.spec.ts",
    // The task-3c suites boot a non-Mock runtime and are run explicitly with
    // playwright.config.task-3c-real.ts. Keeping them out of the Mock suite
    // prevents the real-mode API assertions from being evaluated against the
    // fixture runtime.
    "**/task-3c-*-real.spec.ts",
  ],
  ...(includeExtendedFixtures
    ? {}
    : { grepInvert: new RegExp(extendedFixtureTestNames.join("|")) }),
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
      NUXT_IGNORE_LOCK: "1",
      HSD_E2E_TEST_ONLY: "true",
      NUXT_PUBLIC_USE_MOCK_API: "true"
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
