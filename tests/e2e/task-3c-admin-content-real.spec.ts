import { expect, test } from "@playwright/test";

const session = {
  account: { id: "owner-api", adminLevel: "OWNER", adminCenterId: null, capabilities: ["content.create", "content.review", "content.publish"] },
  person: { id: "person-owner", name: "接口负责人", status: "FORMAL_MEMBER" },
  mustChangePassword: false,
};

const contentPage = {
  page: 1, pageSize: 20, total: 1,
  items: [{
    id: "qa-content-api-only", publicId: "qa-public-api-only", centerId: null, slug: "qa-api-only", kind: "article", status: "review", version: 2, workingRevisionNumber: 1,
    title: "qa-真实接口内容", summary: "只能来自路由拦截的 API。", createdBy: { type: "account", accountId: "owner-api", username: "owner", displayName: "接口负责人" },
    createdAt: "2026-08-23T00:00:00.000Z", updatedAt: "2026-08-23T01:00:00.000Z", publishedAt: null, offlineAt: null,
  }],
};

function apiContent(title: string, id: string) {
  return {
    id, publicId: `${id}-public`, centerId: null, slug: id, kind: "article", status: "review", version: 2, workingRevisionNumber: 1,
    title, summary: "只来自服务端分页响应。", createdBy: { type: "account", accountId: "owner-api", username: "owner", displayName: "接口负责人" },
    createdAt: "2026-08-23T00:00:00.000Z", updatedAt: "2026-08-23T01:00:00.000Z", publishedAt: null, offlineAt: null,
  };
}

test("real admin content list requests the server page and never falls back to a Mock title", async ({ page }) => {
  const requests: string[] = [];
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/content**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(contentPage) });
  });

  await page.goto("/admin/content");

  await expect(page.getByRole("heading", { level: 1, name: "官网内容" })).toBeVisible();
  await expect(page.getByRole("table", { name: "官网内容列表" })).toContainText("qa-真实接口内容");
  await expect(page.getByText("2026 秋季招新通道开放", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "新建内容" })).toHaveAttribute("href", "/admin/content/new");
  expect(requests).toEqual([expect.stringContaining("/api/v1/admin/content?page=1&pageSize=20")]);

  await page.getByLabel("发布状态").selectOption("review");
  await expect.poll(() => requests.at(-1)).toContain("status=review");
});

test("real admin content navigation keeps create capability-gated while exposing canonical row routes", async ({ page }) => {
  const sessionWithoutCreate = {
    ...session,
    account: { ...session.account, capabilities: ["content.review", "content.publish"] },
  };
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionWithoutCreate) }));
  await page.route("**/api/v1/admin/content**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(contentPage) }));

  await page.goto("/admin/content");

  const row = page.getByRole("row").filter({ hasText: "qa-真实接口内容" });
  await expect(page.getByRole("link", { name: "新建内容" })).toHaveCount(0);
  await expect(row.getByRole("link", { name: "编辑" })).toHaveAttribute("href", "/admin/content/qa-content-api-only");
  await expect(row.getByRole("link", { name: "预览" })).toHaveAttribute("href", "/admin/content/qa-content-api-only/preview");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("baiyun-hsd.portal-content"))).toBeNull();
});

test("real admin content list visibly reports a 403 and does not retain API rows", async ({ page }) => {
  let rejectRead = false;
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/content**", (route) => route.fulfill(rejectRead
    ? { status: 403, contentType: "application/json", body: JSON.stringify({ code: "CONTENT_FORBIDDEN", message: "owner scope denied", requestId: "req-403" }) }
    : { status: 200, contentType: "application/json", body: JSON.stringify(contentPage) }));

  await page.goto("/admin/content");
  await expect(page.getByText("qa-真实接口内容", { exact: true })).toBeVisible();
  rejectRead = true;
  await page.reload();

  await expect(page.getByRole("alert")).toContainText("无权读取官网内容");
  await expect(page.getByText("owner scope denied", { exact: true })).toBeVisible();
  await expect(page.getByText("qa-真实接口内容", { exact: true })).toHaveCount(0);
  await expect(page.getByText("2026 秋季招新通道开放", { exact: true })).toHaveCount(0);
});

test("real admin content list ignores a seeded local automation failure and exposes no local retry path", async ({ page }) => {
  const requests: string[] = [];
  const localFailureState = {
    version: 4,
    records: [],
    automationFailures: [{
      automationKey: "qa-遗留自动化失败键",
      event: {
        eventId: "qa-local-event", eventType: "recruitment.batch.opened", occurredAt: "2026-08-23T00:00:00.000Z", actorId: "owner-api",
        sourceDomain: "recruitment-batch", sourceId: "qa-local-batch", sourceVersion: 1,
        payload: { batchName: "本地遗留批次", publicRoute: "/join", publicEndAt: "2026-08-31T00:00:00.000Z", isOpen: true },
      },
      errorCode: "PORTAL_AUTOMATION_FAILED", createdAt: "2026-08-23T00:00:00.000Z", updatedAt: "2026-08-23T00:00:00.000Z", audit: [],
    }],
  };
  await page.addInitScript((state) => localStorage.setItem("baiyun-hsd.portal-content", JSON.stringify(state)), localFailureState);
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/content**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(contentPage) });
  });

  await page.goto("/admin/content");

  await expect(page.getByRole("table", { name: "官网内容列表" })).toContainText("qa-真实接口内容");
  await expect(page.getByRole("table", { name: "快讯自动化失败列表" })).toHaveCount(0);
  await expect(page.getByText("qa-遗留自动化失败键", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "按语义键重试" })).toHaveCount(0);
  await expect(page.getByText("快讯草稿已重新生成。", { exact: true })).toHaveCount(0);
  await expect(page.getByText("该事件已有快讯草稿，无需重复生成。", { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baiyun-hsd.portal-content") || "null")?.automationFailures?.[0]?.automationKey)).toBe("qa-遗留自动化失败键");
  expect(requests).toEqual([expect.stringContaining("/api/v1/admin/content?page=1&pageSize=20")]);
});

test("real admin content pagination replaces server rows and a filter resets page without stale content", async ({ page }) => {
  let releaseFilteredResponse!: () => void;
  const requests: string[] = [];
  const filteredResponse = new Promise<void>((resolve) => { releaseFilteredResponse = resolve; });
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/content**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(route.request().url());
    const pageNumber = url.searchParams.get("page");
    if (url.searchParams.get("status") === "review") {
      await filteredResponse;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [apiContent("qa-筛选后的第一页", "qa-filtered")] }) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(pageNumber === "2"
        ? { page: 2, pageSize: 20, total: 40, items: [apiContent("qa-第二页接口内容", "qa-page-two")] }
        : { page: 1, pageSize: 20, total: 40, items: [apiContent("qa-第一页接口内容", "qa-page-one")] }),
    });
  });

  await page.goto("/admin/content");
  await expect(page.getByText("qa-第一页接口内容", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page.getByText("qa-第二页接口内容", { exact: true })).toBeVisible();
  await expect(page.getByText("qa-第一页接口内容", { exact: true })).toHaveCount(0);

  await page.getByLabel("发布状态").selectOption("review");
  await expect(page.getByRole("status")).toContainText("正在读取官网内容");
  await expect(page.getByText("qa-第二页接口内容", { exact: true })).toHaveCount(0);
  await expect.poll(() => requests.at(-1)).toContain("page=1&pageSize=20&status=review");
  releaseFilteredResponse();
  await expect(page.getByText("qa-筛选后的第一页", { exact: true })).toBeVisible();
});

test("real content list navigates to API new, edit, and preview routes without a local fallback", async ({ page }) => {
  const detail = { id: "content-edit", publicId: "content-edit-public", centerId: "center-1", slug: "content-edit", kind: "article", status: "draft", version: 2, createdBy: { type: "account", accountId: "owner-api", username: "owner", displayName: "接口负责人" }, createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:00:00.000Z", workingRevision: { revisionNumber: 1, title: "qa-编辑接口内容", summary: "编辑摘要", tag: null, internalTarget: null, expiresAt: null, blocks: [{ type: "paragraph", text: "原始正文" }], internalNote: null }, publishedRevisionNumber: null, rejectionReason: null, publishedAt: null, offlineAt: null, offlineReason: null };
  const listPage = { ...contentPage, items: [{ ...contentPage.items[0], id: detail.id, publicId: detail.publicId, slug: detail.slug, title: detail.workingRevision.title, summary: detail.workingRevision.summary, status: detail.status }] };
  let createBody: Record<string, unknown> | undefined; let patchBody: Record<string, unknown> | undefined; let currentDetail = detail;
  await page.context().addCookies([{ name: "hsd_csrf", value: "e2e-csrf", url: "http://127.0.0.1:50101" }]);
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/organization/centers", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ currentPermission: { accountId: "owner-api", personId: "person-owner", adminLevel: "OWNER", adminCenterId: null, version: 1 }, items: [{ id: "center-1", slug: "center-1", name: "测试中心", active: true, positions: [] }] }) }));
  await page.route("**/api/v1/admin/content**", async (route) => {
    const request = route.request(); const pathname = new URL(request.url()).pathname;
    if (request.method() === "POST" && pathname === "/api/v1/admin/content") { createBody = request.postDataJSON() as Record<string, unknown>; return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(detail) }); }
    if (request.method() === "PATCH") { patchBody = request.postDataJSON() as Record<string, unknown>; currentDetail = { ...detail, version: 3, workingRevision: { ...detail.workingRevision, blocks: patchBody.blocks as typeof detail.workingRevision.blocks } }; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(currentDetail) }); }
    if (pathname === "/api/v1/admin/content") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listPage) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(currentDetail) });
  });
  await page.goto("/admin/content");
  await page.getByRole("link", { name: "新建内容" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/new$/);
  await page.getByLabel("归属中心").selectOption("center-1"); await page.getByLabel("Slug（可选）").fill("qa-new"); await page.getByLabel("标题").fill("qa-新建接口内容"); await page.getByLabel("摘要").fill("新建摘要"); await page.getByRole("button", { name: "添加正文段落" }).click(); await page.getByLabel("正文段落").fill("新建正文"); await page.getByRole("button", { name: "保存草稿" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/content-edit$/);
  await expect.poll(() => createBody).toMatchObject({ blocks: [{ type: "paragraph", text: "新建正文" }] });
  await page.goto("/admin/content");
  const row = page.getByRole("row").filter({ hasText: "qa-编辑接口内容" });
  await row.getByRole("link", { name: "编辑" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/content-edit$/);
  await page.getByLabel("正文段落").fill("修改后的 API 正文"); await page.getByRole("button", { name: "保存草稿" }).click();
  await expect.poll(() => patchBody).toMatchObject({ expectedVersion: 2, blocks: [{ type: "paragraph", text: "修改后的 API 正文" }] });
  await page.goto("/admin/content");
  await page.getByRole("row").filter({ hasText: "qa-编辑接口内容" }).getByRole("link", { name: "预览" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/content-edit\/preview$/);
  await expect(page.getByText("修改后的 API 正文", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("baiyun-hsd.portal-content"))).toBeNull();
});

test("real content edits a structured paragraph while preserving sibling blocks", async ({ page }) => {
  const blocks = [{ type: "paragraph", text: "First" }, { type: "image", attachmentId: "image-1", alt: "Image" }, { type: "paragraph", text: "Last" }];
  const detail = { id: "multi-paragraph", publicId: "multi-paragraph-public", centerId: "center-1", slug: "multi-paragraph", kind: "article", status: "draft", version: 2, createdBy: { type: "account", accountId: "owner-api", username: "owner", displayName: "接口负责人" }, createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:00:00.000Z", workingRevision: { revisionNumber: 1, title: "多段正文", summary: "多段摘要", tag: null, internalTarget: null, expiresAt: null, blocks, internalNote: null }, publishedRevisionNumber: null, rejectionReason: null, publishedAt: null, offlineAt: null, offlineReason: null };
  let patchCount = 0; let patchBody: Record<string, unknown> | undefined;
  await page.context().addCookies([{ name: "hsd_csrf", value: "e2e-csrf", url: "http://127.0.0.1:50101" }]);
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/content/**", async (route) => {
    if (route.request().method() === "PATCH") { patchCount += 1; patchBody = route.request().postDataJSON() as Record<string, unknown>; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...detail, version: 3, workingRevision: { ...detail.workingRevision, title: patchBody.title as string, blocks: patchBody.blocks as typeof blocks } }) }); }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(detail) });
  });
  await page.goto("/admin/content/multi-paragraph");
  await page.getByLabel("正文段落").first().fill("Changed body"); await page.getByRole("button", { name: "保存草稿" }).click();
  await expect.poll(() => patchBody).toMatchObject({ blocks: [{ type: "paragraph", text: "Changed body" }, blocks[1], blocks[2]] });
  expect(patchCount).toBe(1);
  await page.getByLabel("正文段落").first().fill("Changed again"); await page.getByLabel("标题").fill("仅改标题"); await page.getByRole("button", { name: "保存草稿" }).click();
  await expect.poll(() => patchBody).toMatchObject({ title: "仅改标题", blocks: [{ type: "paragraph", text: "Changed again" }, blocks[1], blocks[2]] });
  expect(patchCount).toBe(2);
});

test("real content retains its edit draft on 409 and reports a 403 workflow denial without local success", async ({ page }) => {
  const detail = { id: "conflict-content", publicId: "conflict-public", centerId: "center-1", slug: "conflict-content", kind: "article", status: "draft", version: 4, createdBy: { type: "account", accountId: "owner-api", username: "owner", displayName: "接口负责人" }, createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:00:00.000Z", workingRevision: { revisionNumber: 1, title: "冲突内容", summary: "冲突摘要", tag: null, internalTarget: null, expiresAt: null, blocks: [{ type: "paragraph", text: "旧正文" }], internalNote: null }, publishedRevisionNumber: null, rejectionReason: null, publishedAt: null, offlineAt: null, offlineReason: null };
  let patchCount = 0; let lastExpectedVersion: number | undefined;
  await page.context().addCookies([{ name: "hsd_csrf", value: "e2e-csrf", url: "http://127.0.0.1:50101" }]);
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/content/**", async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    if (request.method() === "PATCH") { patchCount += 1; lastExpectedVersion = (request.postDataJSON() as { expectedVersion: number }).expectedVersion; return route.fulfill(patchCount === 1 ? { status: 409, contentType: "application/json", body: JSON.stringify({ code: "VERSION_CONFLICT", message: "Reload required", requestId: "conflict" }) } : { status: 200, contentType: "application/json", body: JSON.stringify({ ...detail, version: 5 }) }); }
    if (path.endsWith("/submit-review")) return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "CONTENT_FORBIDDEN", message: "Owner denied", requestId: "forbidden" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(patchCount ? { ...detail, version: 5, workingRevision: { ...detail.workingRevision, blocks: [{ type: "paragraph", text: "服务端新正文" }] } } : detail) });
  });
  await page.goto("/admin/content/conflict-content");
  await page.getByLabel("正文段落").fill("冲突后保留的草稿"); await page.getByRole("button", { name: "保存草稿" }).click();
  await expect(page.getByRole("alert")).toContainText("版本冲突");
  await expect(page.getByLabel("正文段落")).toHaveValue("冲突后保留的草稿");
  await page.getByRole("button", { name: "重新读取" }).click();
  await expect(page.getByLabel("正文段落")).toHaveValue("服务端新正文");
  await page.getByLabel("正文段落").fill("重读后再次保存"); await page.getByRole("button", { name: "保存草稿" }).click();
  await expect.poll(() => lastExpectedVersion).toBe(5);
  await page.getByRole("button", { name: "提交审核" }).click();
  await expect(page.getByRole("alert")).toContainText("Owner denied");
  await expect(page.getByText("服务端已更新内容状态。", { exact: true })).toHaveCount(0);
});
