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
  await expect(page.getByRole("link", { name: "新建内容" })).toHaveCount(0);
  expect(requests).toEqual([expect.stringContaining("/api/v1/admin/content?page=1&pageSize=20")]);

  await page.getByLabel("发布状态").selectOption("review");
  await expect.poll(() => requests.at(-1)).toContain("status=review");
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

test("real legacy content write and preview routes are unavailable and never report a local success", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));

  for (const path of ["/admin/content/new", "/admin/content/legacy-local-id", "/admin/content/legacy-local-id/preview"]) {
    await page.goto(path);
    await expect(page.getByText("尚未接入真实 API", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "保存草稿" })).toHaveCount(0);
    await expect(page.getByText("草稿已保存。", { exact: true })).toHaveCount(0);
    await expect(page.getByText("按语义键重试", { exact: true })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("baiyun-hsd.portal-content"))).toBeNull();
  }
});
