import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("password recovery owner page", () => {
  const page = readFileSync("app/pages/admin/password-recovery.vue", "utf8");
  it("requires all three confirmations and a meaningful reason before reset", () => {
    expect(page).toContain("contactedInPerson");
    expect(page).toContain("identityMatched");
    expect(page).toContain("organizationMatched");
    expect(page).toContain("reasonLength.value >= 10");
    expect(page).toContain("重置为系统初始密码");
    expect(page).toContain("{{ reasonLength }}/10");
    expect(page).toContain("busyAction");
    expect(page).toContain("{{ rejectReasonLength }}/10");
  });
  it("does not display the initial password or allow copying it", () => {
    expect(page).not.toMatch(/passwordHash|initialPassword|复制初始密码/);
    expect(page).not.toContain("复制初始密码");
  });
  it("provides server-backed pagination for recovery requests", () => {
    expect(page).toContain("PaginationControls");
    expect(page).toContain("pageCount");
    expect(page).toContain("v-model=\"page\"");
  });
});
