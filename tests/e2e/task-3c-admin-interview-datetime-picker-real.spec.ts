import { expect, test } from "@playwright/test";

const batchId = "11111111-1111-4111-8111-111111111111";
const centerId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const personId = "44444444-4444-4444-8444-444444444444";
const slotId = "55555555-5555-4555-8555-555555555555";
const batch = {
  id: batchId,
  name: "qa-时间选择器批次",
  startAt: "2026-09-01T00:00:00.000Z",
  endAt: "2026-10-20T00:00:00.000Z",
  timezone: "Asia/Shanghai",
  lifecycleStatus: "PUBLISHED",
  manualOverride: "NONE",
  effectiveStatus: "open",
  effectiveStatusReason: "within-window",
  version: 7,
  publishedAt: "2026-08-31T00:00:00.000Z",
  actualOpenedAt: "2026-09-01T00:00:00.000Z",
  closedAt: null,
  archivedAt: null,
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  applicationCount: 0,
  openCenters: [{ id: centerId, slug: "baize-development", name: "白泽开发中心", active: true }],
  responsibleAccounts: [{ id: accountId, username: "picker-owner", status: "ENABLED", adminLevel: "OWNER", person: { id: personId, name: "选择器负责人" } }],
  interviewSlots: [{
    id: slotId,
    startAt: "2026-09-20T01:00:12.345Z",
    endAt: "2026-09-20T01:30:12.345Z",
    capacity: null,
    confirmedCount: 0,
    status: "ACTIVE",
    version: 1,
  }],
};

const ownerSession = {
  account: { id: accountId, adminLevel: "OWNER", adminCenterId: null, capabilities: [] },
  person: { id: personId, name: "选择器负责人", status: "FORMAL_MEMBER" },
  mustChangePassword: false,
};

test("real batch editor uses one CST picker for both slot times", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ownerSession) }));
  await page.route(`**/api/v1/admin/recruitment/batches/${batchId}/lifecycle-events**`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 50, total: 0, items: [] }) }));
  await page.route("**/api/v1/admin/organization/centers", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ currentPermission: { accountId, personId, adminLevel: "OWNER", adminCenterId: null, version: 1 }, items: [{ id: centerId, slug: "baize-development", name: "白泽开发中心", active: true, positions: [] }] }) }));
  await page.route(`**/api/v1/admin/recruitment/batches/${batchId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(batch) }));

  await page.goto(`/admin/recruitment/batches/${batchId}`);
  await page.getByRole("button", { name: "调整面试时段" }).click();

  const dialog = page.getByRole("dialog", { name: "编辑招新批次" });
  const start = dialog.getByRole("combobox", { name: "开始时间" });
  const end = dialog.getByRole("combobox", { name: "结束时间" });
  await expect(start).toHaveAttribute("readonly", "");
  await expect(end).toHaveAttribute("readonly", "");
  await expect(start).toHaveValue("2026-09-20 09:00");
  await expect(end).toHaveValue("2026-09-20 09:30");

  await start.click();
  await expect(page.locator(".dp--menu")).toBeVisible();
  await expect(page.locator(".dp--menu")).toContainText("2026");
  await expect(page.locator(".dp--menu")).toContainText("确定");
  await expect(page.locator(".dp--menu")).not.toContainText("09/20/2026");
  await page.screenshot({ path: "artifacts/interview-datetime-picker-desktop.png", fullPage: true });
});
