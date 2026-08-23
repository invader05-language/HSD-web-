import { expect, test } from "@playwright/test";

type RequestShape = { method: string; pathname: string; search: string };

const fixtureBatchStorage = {
  version: 1,
  batches: [{ id: "fixture-batch", name: "本地 fixture 批次", startAt: "2026-01-01T00:00:00.000Z", endAt: "2026-01-02T00:00:00.000Z", timezone: "Asia/Shanghai", openCenterIds: [], responsibleAccountIds: [], lifecycleStatus: "draft", manualOverride: "none", version: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
};

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

async function seedFixtureBatchStorage(page: import("@playwright/test").Page) {
  await page.addInitScript((storage) => localStorage.setItem("baiyun-hsd-recruitment-batches", JSON.stringify(storage)), fixtureBatchStorage);
}

function recordRequest(requests: RequestShape[], route: import("@playwright/test").Route) {
  const url = new URL(route.request().url());
  requests.push({ method: route.request().method(), pathname: url.pathname, search: url.search });
}

function expectCanonicalReads(requests: RequestShape[], count = 1) {
  expect(requests).toHaveLength(count * 2);
  for (const expected of [
    { method: "GET", pathname: "/api/v1/admin/recruitment/batches", search: "?page=1&pageSize=20" },
    { method: "GET", pathname: "/api/v1/admin/organization/centers", search: "" },
  ]) {
    expect(requests.filter((request) => (
      request.method === expected.method
      && request.pathname === expected.pathname
      && request.search === expected.search
    ))).toHaveLength(count);
  }
}

test("real OWNER batch list renders only canonical API rows, status, counts, owners and centers", async ({ page }) => {
  const requests: RequestShape[] = [];
  await seedFixtureBatchStorage(page);
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches*", (route) => {
    recordRequest(requests, route);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 2, items: [apiBatch, { ...apiBatch, id: "batch-api-unassigned", name: "qa-无负责人批次", effectiveStatus: "draft", effectiveStatusReason: "draft", lifecycleStatus: "DRAFT", manualOverride: "NONE", applicationCount: 0, openCenters: [], responsibleAccounts: [] }] }) });
  });
  await page.route("**/api/v1/admin/organization/centers", (route) => {
    recordRequest(requests, route);
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
  expectCanonicalReads(requests);
});

test("real batch pagination requests page two and replaces page-one rows", async ({ page }) => {
  const requests: RequestShape[] = [];
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches*", (route) => {
    recordRequest(requests, route);
    const pageNumber = Number(new URL(route.request().url()).searchParams.get("page"));
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        page: pageNumber,
        pageSize: 20,
        total: 21,
        items: [pageNumber === 2
          ? { ...apiBatch, id: "batch-api-page-two", name: "qa-接口第二页批次" }
          : apiBatch],
      }),
    });
  });
  await page.route("**/api/v1/admin/organization/centers", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(apiCenters) }));

  await page.goto("/admin/recruitment/batches");
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "2", exact: true }).click();

  await expect(page.getByText("qa-接口第二页批次", { exact: true })).toBeVisible();
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toHaveCount(0);
  expect(requests.map(({ search }) => search)).toEqual(["?page=1&pageSize=20", "?page=2&pageSize=20"]);
});

test("real batch list renders the server empty state and zero summary without fixture rows", async ({ page }) => {
  const requests: RequestShape[] = [];
  await seedFixtureBatchStorage(page);
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches*", (route) => { recordRequest(requests, route); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 0, items: [] }) }); });
  await page.route("**/api/v1/admin/organization/centers", (route) => { recordRequest(requests, route); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...apiCenters, items: [] }) }); });

  await page.goto("/admin/recruitment/batches");

  await expect(page.getByText("当前生产数据库暂无招新批次。", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("00");
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("0");
  await expect(page.getByText("本地 fixture 批次", { exact: true })).toHaveCount(0);
  expectCanonicalReads(requests);
});

test("real batch list clears prior API rows and exposes a 403 instead of a fixture fallback", async ({ page }) => {
  let forbidden = false;
  const requests: RequestShape[] = [];
  await seedFixtureBatchStorage(page);
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches*", (route) => { recordRequest(requests, route); return route.fulfill(forbidden
    ? { status: 403, contentType: "application/json", body: JSON.stringify({ code: "RECRUITMENT_BATCH_FORBIDDEN", message: "Owner scope denied", requestId: "batch-403" }) }
    : { status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [apiBatch] }) }); });
  await page.route("**/api/v1/admin/organization/centers", (route) => { recordRequest(requests, route); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(apiCenters) }); });

  await page.goto("/admin/recruitment/batches");
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toBeVisible();
  forbidden = true;
  await page.getByRole("button", { name: "重新读取生产招新批次" }).click();

  await expect(page.getByRole("alert")).toContainText("暂时无法读取生产招新批次");
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toHaveCount(0);
  await expect(page.getByText("2026 秋季招新", { exact: true })).toHaveCount(0);
  await expect(page.getByText("本地 fixture 批次", { exact: true })).toHaveCount(0);
  expectCanonicalReads(requests, 2);
});

test("a center-read failure clears batch rows and reports the real-mode error state", async ({ page }) => {
  let centerFailure = false;
  const requests: RequestShape[] = [];
  await seedFixtureBatchStorage(page);
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches*", (route) => { recordRequest(requests, route); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [apiBatch] }) }); });
  await page.route("**/api/v1/admin/organization/centers", (route) => { recordRequest(requests, route); return route.fulfill(centerFailure
    ? { status: 503, contentType: "application/json", body: JSON.stringify({ code: "CENTERS_UNAVAILABLE", message: "Centers unavailable", requestId: "centers-503" }) }
    : { status: 200, contentType: "application/json", body: JSON.stringify(apiCenters) }); });

  await page.goto("/admin/recruitment/batches");
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toBeVisible();
  centerFailure = true;
  await page.getByRole("button", { name: "重新读取生产招新批次" }).click();

  await expect(page.getByRole("alert")).toContainText("暂时无法读取生产招新批次");
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toHaveCount(0);
  await expect(page.getByText("2026 秋季招新", { exact: true })).toHaveCount(0);
  await expect(page.getByText("本地 fixture 批次", { exact: true })).toHaveCount(0);
  expectCanonicalReads(requests, 2);
});

test("a stale list GET resolving after create cannot overwrite the canonical created batch", async ({ page }) => {
  let batchReads = 0;
  let releaseStaleRead!: () => void;
  const staleRead = new Promise<void>((resolve) => { releaseStaleRead = resolve; });
  const createdBatch = {
    ...apiBatch,
    id: "batch-created-after-refresh",
    name: "qa-并发创建批次",
    lifecycleStatus: "DRAFT",
    effectiveStatus: "draft",
    effectiveStatusReason: "draft",
    applicationCount: 0,
    version: 1,
  };
  await page.context().addCookies([{ name: "hsd_csrf", value: "csrf-token", domain: "127.0.0.1", path: "/" }]);
  await installAuthenticatedRoutes(page);
  await page.route("**/api/v1/admin/recruitment/batches*", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(createdBatch) });
    }
    batchReads += 1;
    await staleRead;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [apiBatch] }),
    });
  });
  await page.route("**/api/v1/admin/organization/centers", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(apiCenters) }));

  await page.goto("/admin/recruitment/batches");
  await expect.poll(() => batchReads).toBe(1);

  await page.getByRole("button", { name: "新建招新批次" }).click();
  const dialog = page.getByRole("dialog", { name: "新建招新批次" });
  await expect(dialog.getByLabel("白泽开发中心")).toBeChecked();
  await dialog.getByLabel("批次名称").fill("qa-并发创建批次");
  await dialog.getByLabel("报名开始时间").fill("2026-10-01");
  await dialog.getByLabel("报名截止时间").fill("2026-10-31");
  await dialog.getByRole("button", { name: "保存草稿" }).click();
  await expect(page.getByText("招新批次已保存为草稿，可进入批次继续复核并发布。", { exact: true })).toBeVisible();

  releaseStaleRead();

  await expect(page.getByText("qa-并发创建批次", { exact: true })).toBeVisible();
  await expect(page.getByText("qa-接口开放批次", { exact: true })).toHaveCount(0);
});
