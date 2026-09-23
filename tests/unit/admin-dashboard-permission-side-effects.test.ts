import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("admin dashboard permission side effects", () => {
  it("does not load the owner-only recovery queue for center administrators", () => {
    const page = readFileSync("app/pages/admin/index.vue", "utf8");

    expect(page).toContain("recovery.refreshPendingCount");
    expect(page).toMatch(/if\s*\(session\.canManageAdminAccounts\)[\s\S]*recovery\.refreshPendingCount\(\)/);
    expect(page).not.toContain('recovery.refresh({ status: "PENDING" })');
  });

  it("keeps recovery authorization failures local to the recovery composable", () => {
    const composable = readFileSync("app/composables/useAdminPasswordRecovery.ts", "utf8");
    expect(composable).not.toContain("navigateTo");
    expect(composable).toContain("refreshPendingCount");
    expect(composable).toContain("status");
  });

  it("avoids a duplicate recovery count request on the workbench", () => {
    const layout = readFileSync("app/layouts/admin.vue", "utf8");
    expect(layout).toContain('route.path === "/admin"');
  });
});
