import { expect, test } from "@playwright/test";

const ownerSession = {
  account: { id: "owner-api", adminLevel: "OWNER", adminCenterId: null, capabilities: [] },
  person: { id: "person-owner", name: "接口负责人", status: "FORMAL_MEMBER" },
  mustChangePassword: false,
};

const currentPermission = {
  accountId: "owner-api",
  personId: "person-owner",
  adminLevel: "OWNER",
  adminCenterId: null,
  version: 1,
};

const apiBatch = {
  id: "batch-api-open",
  name: "qa-接口开放批次",
  startAt: "2026-08-01T00:00:00.000Z",
  endAt: "2026-09-30T00:00:00.000Z",
  timezone: "Asia/Shanghai",
  lifecycleStatus: "PUBLISHED",
  manualOverride: "NONE",
  effectiveStatus: "open",
  effectiveStatusReason: "within-window",
  version: 7,
  publishedAt: "2026-07-31T00:00:00.000Z",
  actualOpenedAt: "2026-08-01T00:00:00.000Z",
  closedAt: null,
  archivedAt: null,
  createdAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  applicationCount: 23,
  openCenters: [
    { id: "center-baize", slug: "baize-development", name: "白泽开发中心", active: true },
    { id: "center-media", slug: "new-media", name: "新媒体中心", active: true },
  ],
  responsibleAccounts: [{
    id: "account-owner",
    username: "api-owner",
    status: "ENABLED",
    adminLevel: "OWNER",
    person: { id: "person-api-owner", name: "API 负责人" },
  }],
};

const apiCenters = {
  currentPermission,
  items: [
    { id: "center-baize", slug: "baize-development", name: "白泽开发中心", active: true, positions: [] },
    { id: "center-media", slug: "new-media", name: "新媒体中心", active: true, positions: [] },
  ],
};

async function installAuthenticatedRoutes(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(ownerSession),
  }));
}

test("real OWNER batch list renders only canonical API rows, status, counts, owners and centers", async ({ page }) => {
  const requests: string[] = [];
  await page.addInitScript(() => localStorage.setItem("baiyun-hsd-recruitment-batches", JSON.stringify({
    version: 1,
    batches: [{ id: "fixture-batch", name: "本地 fixture 批次", startAt: "2026-01-01T00:00:00.000Z", endAt: "2026-01-02T00:00:00.000Z", timezone: "Asia/Shanghai", openCenterIds: [], responsibleAccountIds: [], lifecycleStatus: "draft", manualOverride: "none", version: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
  })));
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches", (route) => {
    requests.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 2, items: [apiBatch, { ...apiBatch, id: "batch-api-unassigned", name: "qa-无负责人批次", effectiveStatus: "draft", effectiveStatusReason: "draft", lifecycleStatus: "DRAFT", manualOverride: "NONE", applicationCount: 0, openCenters: [], responsibleAccounts: [] }] }) });
  });
  await page.route("**/api/v1/admin/organization/centers", (route) => {
    requests.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(apiCenters) });
  });

  await page.goto("/admin/recruitment/batches");

  const apiRow = page.getByRole("article").filter({ hasText: "qa-接口开放批次" });
  await expect(apiRow).toContainText("报名中");
  await expect(apiRow).toContainText("23 人");
  await expect(apiRow).toContainText("2 个");
  await expect(apiRow).toContainText("API 负责人");
  await expect(page.getByRole("article").filter({ hasText: "qa-无负责人批次" })).toContainText("未分配");
  await expect(page.getByText("本地 fixture 批次", { exact: true })).toHaveCount(0);
  await expect(page.getByText("联盟总负责人", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("01");
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("23");
  await expect(page.getByRole("region", { name: "批次概览" })).not.toContainText("全站同一时间最多一个");
  expect(requests).toEqual(["/api/v1/admin/recruitment/batches", "/api/v1/admin/organization/centers"]);
});

test("real batch list renders the server empty state and zero summary without fixture rows", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("baiyun-hsd-recruitment-batches", JSON.stringify({ version: 1, batches: [{ id: "fixture-batch", name: "本地 fixture 批次", startAt: "2026-01-01T00:00:00.000Z", endAt: "2026-01-02T00:00:00.000Z", timezone: "Asia/Shanghai", openCenterIds: [], responsibleAccountIds: [], lifecycleStatus: "draft", manualOverride: "none", version: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] })));
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 0, items: [] }) }));
  await page.route("**/api/v1/admin/organization/centers", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...apiCenters, items: [] }) }));

  await page.goto("/admin/recruitment/batches");

  await expect(page.getByText("当前生产数据库暂无招新批次。", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("00");
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("0");
  await expect(page.getByText("本地 fixture 批次", { exact: true })).toHaveCount(0);
});

test("real batch list clears prior API rows and exposes a 403 instead of a fixture fallback", async ({ page }) => {
  let forbidden = false;
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches", (route) => route.fulfill(forbidden
    ? { status: 403, contentType: "application/json", body: JSON.stringify({ code: "RECRUITMENT_BATCH_FORBIDDEN", message: "Owner scope denied", requestId: "batch-403" }) }
    : { status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [apiBatch] }) }));
  await page.route("**/api/v1/admin/organization/centers", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(apiCenters) }));

  await page.goto("/admin/recruitment/batches");
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toBeVisible();
  forbidden = true;
  await page.reload();

  await expect(page.getByRole("alert")).toContainText("暂时无法读取生产招新批次");
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toHaveCount(0);
  await expect(page.getByText("2026 秋季招新", { exact: true })).toHaveCount(0);
});

test("a center-read failure clears batch rows and reports the real-mode error state", async ({ page }) => {
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [apiBatch] }) }));
  await page.route("**/api/v1/admin/organization/centers", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "CENTERS_UNAVAILABLE", message: "Centers unavailable", requestId: "centers-503" }) }));

  await page.goto("/admin/recruitment/batches");

  await expect(page.getByRole("alert")).toContainText("暂时无法读取生产招新批次");
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toHaveCount(0);
  await expect(page.getByText("2026 秋季招新", { exact: true })).toHaveCount(0);
});
