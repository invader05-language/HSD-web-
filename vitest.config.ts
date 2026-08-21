import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { "~": fileURLToPath(new URL("./app", import.meta.url)) } },
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts"],
    // The SSR hydration suites create an in-process Vite server. Serializing
    // files keeps that server isolated from other Vue transforms and avoids
    // nondeterministic timeouts under the default parallel pool.
    maxWorkers: 1,
  }
});
