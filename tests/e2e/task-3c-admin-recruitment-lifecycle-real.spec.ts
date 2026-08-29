import { expect, test, type Page, type Route } from "@playwright/test";

const OWNER_SESSION = {
  account: { id: "owner-api", adminLevel: "OWNER", adminCenterId: null, capabilities: ["recruitment.batch.manage"] },
  person: { id: "person-owner", name: "接口负责人", status: "FORMAL_MEMBER" },
  mustChangePassword: false,
};

const ADMIN_SESSION = {
  account: { id: "admin-api", adminLevel: "ADMIN", adminCenterId: "center-baize", capabilities: [] },
  person: { id: "person-admin", name: "中心管理员", status: "FORMAL_MEMBER" },
  mustChangePassword: false,
};

const MEMBER_SESSION = {
  account: { id: "member-api", adminLevel: "MEMBER", adminCenterId: null, capabilities: [] },
  person: { id: "person-member", name: "普通成员", status: "FORMAL_MEMBER" },
  mustChangePassword: false,
};

function batch(version = 9, archived = false) {
  return {
    id: "batch-real-closed",
    name: "真实终态招新批次",
    startAt: "2026-08-01T00:00:00.000Z",
    endAt: "2026-08-20T00:00:00.000Z",
    timezone: "Asia/Shanghai",
    lifecycleStatus: archived ? "ARCHIVED" : "CLOSED",
    manualOverride: "FORCE_CLOSED",
    effectiveStatus: archived ? "archived" : "closed",
    effectiveStatusReason: archived ? "archived" : "force-closed",
    version,
    publishedAt: "2026-07-31T00:00:00.000Z",
    actualOpenedAt: "2026-08-01T00:00:00.000Z",
    closedAt: "2026-08-21T00:00:00.000Z",
    archivedAt: archived ? "2026-08-24T08:00:00.000Z" : null,
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: archived ? "2026-08-24T08:00:00.000Z" : "2026-08-21T00:00:00.000Z",
    applicationCount: 23,
    openCenters: [{ id: "center-baize", slug: "baize-development", name: "白泽开发中心", active: true }],
    responsibleAccounts: [{
      id: "account-owner",
      username: "api-owner",
      status: "ENABLED",
      adminLevel: "OWNER",
      person: { id: "person-api-owner", name: "API 负责人" },
    }],
  };
}

function lifecycleItems() {
  return [{
    id: "6ef322d6-c7b5-4aa4-959e-891434398e67",
    actor: {
      type: "account",
      accountId: "03dd355b-b32d-4d3a-a2db-1ad9d2f08ece",
      username: "api-owner",
      displayName: "API 归档负责人",
    },
    action: "recruitment.batch.archived",
    target: { type: "RecruitmentBatch", id: "batch-real-closed" },
    before: {
      name: "真实终态招新批次",
      lifecycleStatus: "CLOSED",
      version: 9,
      openCenterIds: ["center-baize"],
      ipAddress: "198.51.100.10",
      requestId: "private-request-id",
      nested: { token: "nested-private-token" },
    },
    after: {
      name: "真实终态招新批次",
      lifecycleStatus: "ARCHIVED",
      version: 10,
      responsibleAccountIds: ["account-owner"],
      userAgent: "Unsafe Browser UA",
      storageKey: "private/object-key",
    },
    reason: "结果复核完成",
    createdAt: "2026-08-24T08:00:00.000Z",
  }];
}

async function installSession(page: Page, session = OWNER_SESSION) {
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(session),
  }));
}

async function seedUnsafeMockLifecycle(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("baiyun-hsd-recruitment-batches", JSON.stringify({
      version: 1,
      batches: [{
        id: "batch-real-closed",
        name: "LOCAL FIXTURE MUST NOT RENDER",
        lifecycleStatus: "archived",
        version: 999,
      }],
      auditRecords: [{
        id: "local-audit",
        batchId: "batch-real-closed",
        action: "archive",
        actor: "LOCAL ACTOR MUST NOT RENDER",
        requestId: "LOCAL PRIVATE REQUEST",
        token: "LOCAL PRIVATE TOKEN",
      }],
    }));
  });
}

async function installDetail(page: Page, handler: (route: Route) => Promise<void> | void = (route) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(batch()),
})) {
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed", handler);
}

test("real OWNER detail renders canonical lifecycle data and recursively excludes private audit and Mock fields", async ({ page }) => {
  let lifecycleRequest: { method: string; search: string; requestId?: string } | undefined;
  await seedUnsafeMockLifecycle(page);
  await installSession(page);
  await installDetail(page);
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => {
    const url = new URL(route.request().url());
    lifecycleRequest = {
      method: route.request().method(),
      search: url.search,
      requestId: route.request().headers()["x-request-id"],
    };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ page: 1, pageSize: 50, total: 1, items: lifecycleItems() }),
    });
  });

  await page.goto("/admin/recruitment/batches/batch-real-closed");

  await expect(page.getByRole("heading", { name: "真实终态招新批次" })).toBeVisible();
  const audit = page.getByRole("region", { name: "生命周期记录" });
  await expect(audit).toContainText("归档批次");
  await expect(audit).toContainText("API 归档负责人");
  await expect(audit).toContainText("招新批次");
  await expect(audit).toContainText("结果复核完成");
  await expect(audit).toContainText("已关闭");
  await expect(audit).toContainText("已归档");
  // Lifecycle rows intentionally render compact summaries; inspect the
  // detail drawer for the canonical nested center/account identifiers.
  await audit.getByRole("button", { name: "查看详情" }).click();
  const lifecycleDetails = page.getByRole("dialog", { name: "生命周期详情" });
  await expect(lifecycleDetails).toContainText("center-baize");
  await expect(lifecycleDetails).toContainText("account-owner");
  await expect(audit).not.toContainText("198.51.100.10");
  await expect(audit).not.toContainText("private-request-id");
  await expect(audit).not.toContainText("nested-private-token");
  await expect(audit).not.toContainText("Unsafe Browser UA");
  await expect(audit).not.toContainText("private/object-key");
  await expect(page.locator("body")).not.toContainText("LOCAL FIXTURE MUST NOT RENDER");
  await expect(page.locator("body")).not.toContainText("LOCAL ACTOR MUST NOT RENDER");
  await expect(page.locator("body")).not.toContainText("LOCAL PRIVATE TOKEN");
  expect(lifecycleRequest).toMatchObject({ method: "GET", search: "?page=1&pageSize=50" });
  expect(lifecycleRequest?.requestId).toBeTruthy();
});

test("real lifecycle pagination requests page two and replaces page-one events", async ({ page }) => {
  const lifecycleRequests: string[] = [];
  await installSession(page);
  await installDetail(page);
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => {
    const url = new URL(route.request().url());
    lifecycleRequests.push(url.search);
    const pageNumber = Number(url.searchParams.get("page"));
    const items = lifecycleItems().map((item) => pageNumber === 2 ? {
      ...item,
      id: "aef322d6-c7b5-4aa4-959e-891434398e68",
      action: "recruitment.batch.closed",
      reason: "第二页关闭记录",
    } : item);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ page: pageNumber, pageSize: 50, total: 51, items }),
    });
  });

  await page.goto("/admin/recruitment/batches/batch-real-closed");
  const audit = page.getByRole("region", { name: "生命周期记录" });
  await expect(audit).toContainText("归档批次");

  await audit.getByRole("button", { name: "2", exact: true }).click();

  await expect(audit).toContainText("提前关闭");
  await expect(audit).toContainText("第二页关闭记录");
  await expect(audit).not.toContainText("归档批次");
  expect(lifecycleRequests).toEqual(["?page=1&pageSize=50", "?page=2&pageSize=50"]);
});

test("real lifecycle renders the canonical empty state without Mock fallback", async ({ page }) => {
  await seedUnsafeMockLifecycle(page);
  await installSession(page);
  await installDetail(page);
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ page: 1, pageSize: 50, total: 0, items: [] }),
  }));

  await page.goto("/admin/recruitment/batches/batch-real-closed");

  await expect(page.getByText("当前批次暂无生命周期记录。", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("LOCAL ACTOR MUST NOT RENDER");
});

for (const [status, message] of [
  [401, "登录状态已失效，无法读取生命周期记录。"],
  [403, "当前账号无权读取该批次的生命周期记录。"],
  [404, "生命周期记录所属批次不存在。"],
] as const) {
  test(`real lifecycle exposes ${status} and clears events`, async ({ page }) => {
    await installSession(page);
    await installDetail(page);
    await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ code: `LIFECYCLE_${status}`, message: `Lifecycle ${status}`, requestId: `request-${status}` }),
    }));

    await page.goto("/admin/recruitment/batches/batch-real-closed");

    await expect(page.getByRole("alert")).toContainText(message);
    await expect(page.getByText("recruitment.batch.archived", { exact: true })).toHaveCount(0);
  });
}

test("real lifecycle exposes a network failure", async ({ page }) => {
  await installSession(page);
  await installDetail(page);
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => route.abort("failed"));

  await page.goto("/admin/recruitment/batches/batch-real-closed");

  await expect(page.getByRole("alert")).toContainText("生命周期记录读取失败，请稍后重试。");
});

test("real OWNER archive posts the current version with CSRF, maps the response, and refreshes lifecycle", async ({ page }) => {
  let lifecycleReads = 0;
  let archiveRequest: { method: string; headers: Record<string, string>; body: unknown } | undefined;
  await installSession(page);
  await installDetail(page);
  await page.context().addCookies([{ name: "hsd_csrf", value: "csrf-token", domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => {
    lifecycleReads += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ page: 1, pageSize: 50, total: lifecycleReads > 1 ? 1 : 0, items: lifecycleReads > 1 ? lifecycleItems() : [] }),
    });
  });
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/archive", async (route) => {
    archiveRequest = {
      method: route.request().method(),
      headers: route.request().headers(),
      body: route.request().postDataJSON(),
    };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(batch(10, true)) });
  });

  await page.goto("/admin/recruitment/batches/batch-real-closed");
  await page.getByRole("button", { name: "归档批次" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("操作原因（可选）").fill("结果复核完成");
  await dialog.getByRole("button", { name: "确认归档批次" }).click();

  await expect(page.getByTestId("admin-toast")).toContainText("归档批次已完成");
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("已归档");
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("v10");
  await expect(page.getByRole("region", { name: "生命周期记录" })).toContainText("归档批次");
  expect(lifecycleReads).toBe(2);
  expect(archiveRequest).toMatchObject({
    method: "POST",
    body: { expectedVersion: 9, confirmed: true, reason: "结果复核完成" },
  });
  expect(archiveRequest?.headers["x-csrf-token"]).toBe("csrf-token");
  expect(archiveRequest?.headers["x-request-id"]).toBeTruthy();
});

test("real archive confirms success without claiming a failed lifecycle refresh", async ({ page }) => {
  let lifecycleReads = 0;
  await installSession(page);
  await installDetail(page);
  await page.context().addCookies([{ name: "hsd_csrf", value: "csrf-token", domain: "127.0.0.1", path: "/" }]);
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => {
    lifecycleReads += 1;
    return lifecycleReads === 1
      ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 50, total: 0, items: [] }) })
      : route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "LIFECYCLE_UNAVAILABLE", message: "Lifecycle unavailable", requestId: "lifecycle-refresh-failed" }) });
  });
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/archive", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(batch(10, true)),
  }));

  await page.goto("/admin/recruitment/batches/batch-real-closed");
  await page.getByRole("button", { name: "归档批次" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "确认归档批次" }).click();

  const success = page.getByTestId("admin-toast");
  await expect(success).toContainText("归档批次已完成");
  await expect(success).not.toContainText("状态和生命周期记录已刷新");
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("已归档");
  await expect(page.getByRole("region", { name: "生命周期记录" }).getByRole("alert")).toContainText("生命周期记录读取失败");
  expect(lifecycleReads).toBe(2);
});

test("real ADMIN cannot start archive and a server 403 never produces success", async ({ page }) => {
  await installSession(page, ADMIN_SESSION);
  await installDetail(page);
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => route.fulfill({
    status: 403,
    contentType: "application/json",
    body: JSON.stringify({ code: "OWNER_ONLY", message: "Owner only", requestId: "request-owner-only" }),
  }));

  await page.goto("/admin/recruitment/batches/batch-real-closed");

  await expect(page.getByRole("button", { name: "归档批次" })).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("当前账号无权读取该批次的生命周期记录。");
  await expect(page.getByTestId("admin-toast")).toHaveCount(0);
});

test("real MEMBER receives the admin 403 view and can never submit archive", async ({ page }) => {
  let adminRequests = 0;
  let archivePosts = 0;
  await installSession(page, MEMBER_SESSION);
  await page.route("**/api/v1/admin/recruitment/**", (route) => {
    adminRequests += 1;
    if (route.request().method() === "POST") archivePosts += 1;
    return route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "ADMIN_ACCESS_REQUIRED", message: "Admin only", requestId: "member-403" }),
    });
  });

  await page.goto("/admin/recruitment/batches/batch-real-closed");

  await expect(page.getByRole("heading", { level: 1, name: "当前账号没有此项管理权限" })).toBeVisible();
  await expect(page.getByRole("button", { name: /归档批次/ })).toHaveCount(0);
  await expect(page.getByTestId("admin-toast")).toHaveCount(0);
  expect(adminRequests).toBe(0);
  expect(archivePosts).toBe(0);
});

for (const status of [403, 422] as const) {
  test(`real archive keeps the server-authoritative closed state on ${status}`, async ({ page }) => {
    await installSession(page);
    await installDetail(page);
    await page.context().addCookies([{ name: "hsd_csrf", value: "csrf-token", domain: "127.0.0.1", path: "/" }]);
    await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ page: 1, pageSize: 50, total: 0, items: [] }),
    }));
    await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/archive", (route) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ code: status === 403 ? "OWNER_ONLY" : "RESULTS_NOT_READY", message: status === 403 ? "只有 OWNER 可以归档。" : "结果尚未就绪，不能归档。", requestId: `archive-${status}` }),
    }));

    await page.goto("/admin/recruitment/batches/batch-real-closed");
    await page.getByRole("button", { name: "归档批次" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByLabel("操作原因（可选）").fill("仍需服务端确认");
    await dialog.getByRole("button", { name: "确认归档批次" }).click();

    await expect(dialog.getByRole("alert")).toContainText(status === 403 ? "只有 OWNER 可以归档。" : "结果尚未就绪，不能归档。");
    await expect(page.getByRole("region", { name: "批次概览" })).toContainText("已关闭");
    await expect(page.getByRole("region", { name: "批次概览" })).toContainText("v9");
    await expect(page.getByTestId("admin-toast")).toHaveCount(0);
  });
}

test("real archive keeps reason and confirmation context across 409 refresh, then uses the new version", async ({ page }) => {
  let detailReads = 0;
  let lifecycleReads = 0;
  const archiveBodies: unknown[] = [];
  await installSession(page);
  await page.context().addCookies([{ name: "hsd_csrf", value: "csrf-token", domain: "127.0.0.1", path: "/" }]);
  await installDetail(page, (route) => {
    detailReads += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(batch(detailReads === 1 ? 9 : 10)) });
  });
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => {
    lifecycleReads += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 50, total: 0, items: [] }) });
  });
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/archive", (route) => {
    archiveBodies.push(route.request().postDataJSON());
    return archiveBodies.length === 1
      ? route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ code: "RECRUITMENT_BATCH_VERSION_CONFLICT", message: "Version conflict", requestId: "archive-conflict" }) })
      : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(batch(11, true)) });
  });

  await page.goto("/admin/recruitment/batches/batch-real-closed");
  await page.getByRole("button", { name: "归档批次" }).click();
  const dialog = page.getByRole("alertdialog");
  const reason = dialog.getByLabel("操作原因（可选）");
  await reason.fill("保留这段原因");
  await dialog.getByRole("button", { name: "确认归档批次" }).click();

  await expect(dialog).toBeVisible();
  await expect(reason).toHaveValue("保留这段原因");
  await expect(dialog.getByRole("alert")).toContainText("批次版本已变化");
  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("v10");
  expect(detailReads).toBe(2);
  expect(lifecycleReads).toBe(2);
  expect(archiveBodies[0]).toEqual({ expectedVersion: 9, confirmed: true, reason: "保留这段原因" });

  await dialog.getByRole("button", { name: "确认归档批次" }).click();
  await expect(page.getByTestId("admin-toast")).toContainText("归档批次已完成");
  expect(archiveBodies[1]).toEqual({ expectedVersion: 10, confirmed: true, reason: "保留这段原因" });
});

test("real archive disables a retained confirmation when the 409 refresh reports archived", async ({ page }) => {
  let detailReads = 0;
  const archiveBodies: unknown[] = [];
  await installSession(page);
  await page.context().addCookies([{ name: "hsd_csrf", value: "csrf-token", domain: "127.0.0.1", path: "/" }]);
  await installDetail(page, (route) => {
    detailReads += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(detailReads === 1 ? batch(9) : batch(10, true)),
    });
  });
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/lifecycle-events?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ page: 1, pageSize: 50, total: 0, items: [] }),
  }));
  await page.route("**/api/v1/admin/recruitment/batches/batch-real-closed/archive", (route) => {
    archiveBodies.push(route.request().postDataJSON());
    return route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ code: "RECRUITMENT_BATCH_VERSION_CONFLICT", message: "Version conflict", requestId: "archive-conflict-archived" }),
    });
  });

  await page.goto("/admin/recruitment/batches/batch-real-closed");
  await page.getByRole("button", { name: "归档批次" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("操作原因（可选）").fill("状态变化后仍保留展示");
  await dialog.getByRole("button", { name: "确认归档批次" }).click();

  await expect(page.getByRole("region", { name: "批次概览" })).toContainText("已归档");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("操作原因（可选）")).toHaveValue("状态变化后仍保留展示");
  await expect(dialog.getByRole("button", { name: "确认归档批次" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "确认归档批次？" })).toHaveCount(1);
  expect(archiveBodies).toEqual([{ expectedVersion: 9, confirmed: true, reason: "状态变化后仍保留展示" }]);
});
