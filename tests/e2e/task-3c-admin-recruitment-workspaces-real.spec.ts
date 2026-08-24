import { expect, test } from "@playwright/test";

const batchId = "batch-api-open";
const ownerSession = {
  account: { id: "owner-api", adminLevel: "OWNER", adminCenterId: null, capabilities: [] },
  person: { id: "person-owner", name: "接口负责人", status: "FORMAL_MEMBER" },
  mustChangePassword: false,
};
const batch = {
  id: batchId, name: "qa-接口开放批次", startAt: "2026-08-01T00:00:00.000Z", endAt: "2026-09-30T00:00:00.000Z", timezone: "Asia/Shanghai",
  lifecycleStatus: "PUBLISHED", manualOverride: "NONE", effectiveStatus: "open", effectiveStatusReason: "within-window", version: 7,
  publishedAt: "2026-07-31T00:00:00.000Z", actualOpenedAt: "2026-08-01T00:00:00.000Z", closedAt: null, archivedAt: null,
  createdAt: "2026-07-30T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", applicationCount: 1,
  openCenters: [{ id: "center-baize", slug: "baize-development", name: "白泽开发中心", active: true }],
  responsibleAccounts: [{ id: "account-owner", username: "api-owner", status: "ENABLED", adminLevel: "OWNER", person: { id: "person-api-owner", name: "API 负责人" } }],
};
const application = {
  id: "11111111-1111-4111-8111-111111111111", batchId, contact: "仅授权联系人", baizeDirection: "HARMONYOS_DEVELOPMENT", acceptsAdjustment: true,
  status: "SUBMITTED", version: 1, batchNameSnapshot: batch.name, batchVersionAtSubmission: 7,
  applicantProfileSnapshot: { name: "QA 报名成员", studentId: "QA001", grade: "大二", className: "软件工程 1 班", contact: "仅授权联系人" },
  submittedAt: "2026-08-10T01:00:00.000Z", withdrawnAt: null,
  preferences: [{ rank: 1, center: { id: "center-baize", slug: "baize-development", name: "白泽开发中心" } }],
};

test("real batch workspace opens the API-backed application roster and detail", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ownerSession) }));
  await page.route(`**/api/v1/admin/recruitment/batches/${batchId}/lifecycle-events**`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 50, total: 0, items: [] }) }));
  await page.route(`**/api/v1/admin/recruitment/batches/${batchId}/applications**`, (route) => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(pathname.endsWith(`/${application.id}`) ? application : { page: 1, pageSize: 20, total: 1, items: [application] }) });
  });
  await page.route(`**/api/v1/admin/recruitment/batches/${batchId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(batch) }));

  await page.goto(`/admin/recruitment/batches/${batchId}/applications`);
  await expect(page.getByRole("heading", { level: 1, name: /报名人员/ })).toContainText(batch.name);
  await expect(page.getByRole("table", { name: "批次报名人员" })).toContainText("QA 报名成员");
  await page.getByRole("link", { name: "查看报名 QA 报名成员" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "QA 报名成员" })).toBeVisible();
  await expect(page.getByLabel("联系方式")).toHaveValue("仅授权联系人");
});
