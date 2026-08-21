import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["exec", "playwright", "test"], {
  env: { ...process.env, HSD_E2E_INCLUDE_EXTENDED: "true" },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
