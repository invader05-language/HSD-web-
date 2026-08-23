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
