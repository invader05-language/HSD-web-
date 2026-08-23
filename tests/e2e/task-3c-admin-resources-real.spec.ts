import { expect, test } from "@playwright/test";

const id = "11111111-1111-4111-8111-111111111111";
const session = { account: { id: "owner-api", adminLevel: "OWNER", adminCenterId: null, capabilities: [] }, person: { id: "person-owner", name: "接口负责人", status: "FORMAL_MEMBER" }, mustChangePassword: false };
const resource = { id, centerId: "22222222-2222-4222-8222-222222222222", slug: "qa-api-resource", status: "published", version: 4, title: "qa-真实接口资料", summary: "只能来自服务端分页响应。", kind: "pdf", format: "pdf", versionLabel: "v2.0", access: "member", availability: "available", attachmentId: null, revisionNumber: 2, createdBy: { id: "33333333-3333-4333-8333-333333333333", username: "owner", displayName: "接口负责人" }, createdAt: "2026-08-23T00:00:00.000Z", updatedAt: "2026-08-23T01:00:00.000Z", publishedAt: "2026-08-23T01:00:00.000Z", offlineAt: null };

test("real admin resources list/detail/version use only API canonical fields", async ({ page }) => {
  const requests: string[] = [];
  const legacyResources = [{ id: "legacy-resource", title: "本地旧资料" }];
  await page.addInitScript((stored) => localStorage.setItem("baiyun-hsd.admin-resources", JSON.stringify(stored)), legacyResources);
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/resources**", (route) => {
    const url = new URL(route.request().url()); requests.push(url.toString());
    if (url.pathname.endsWith("/versions")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [{ versionLabel: "v2.0", access: "member", availability: "available", content: "版本正文", attachmentId: null, revisionNumber: 2, createdAt: resource.createdAt }] }) });
    if (url.pathname.endsWith(`/${id}`)) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...resource, content: "接口正文", offlineReason: null }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: Number(url.searchParams.get("page") || "1"), pageSize: 20, total: 40, items: [resource] }) });
  });

  await page.goto("/admin/resources");
  await expect(page.getByRole("heading", { level: 1, name: "学习资料" })).toBeVisible();
  await expect(page.getByRole("table", { name: "学习资料管理列表" })).toContainText("qa-真实接口资料");
  await expect(page.getByText("HarmonyOS 入门路线", { exact: true })).toHaveCount(0);
  await expect(page.getByText("下载记录", { exact: true })).toHaveCount(0);
  await expect(page.getByText("分类", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "上传学习资料" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /保存资源|上传新版本|重试/ })).toHaveCount(0);
  await expect(page.getByText(/保存.*成功|重试成功/)).toHaveCount(0);
  expect(requests).toEqual([expect.stringContaining("/api/v1/admin/resources?page=1&pageSize=20")]);

  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect.poll(() => requests.at(-1)).toContain("page=2&pageSize=20");
  await page.getByLabel("发布状态").selectOption("published");
  await expect.poll(() => requests.at(-1)).toContain("page=1&pageSize=20&status=published");
  expect(requests.filter((request) => request.includes("page=1&pageSize=20&status=published"))).toHaveLength(1);
  await page.getByRole("button", { name: "查看资源 qa-真实接口资料" }).click();
  const drawer = page.getByRole("complementary", { name: "学习资料详情" });
  await expect(drawer).toContainText("接口正文");
  await expect(drawer).toContainText("v2.0");
  await expect(drawer).not.toContainText("上传新版本");
  await expect(page.getByText("尚未接入真实 API：新增、追加版本、发布与下架", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("baiyun-hsd.admin-resources"))).toBe(JSON.stringify(legacyResources));
});

test("a center ADMIN receives scoped rows and an explicit 403 detail state without a foreign payload", async ({ page }) => {
  const adminSession = { account: { id: "center-admin", adminLevel: "ADMIN", adminCenterId: resource.centerId, capabilities: [] }, person: { id: "admin-person", name: "中心管理员", status: "FORMAL_MEMBER" }, mustChangePassword: false };
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(adminSession) }));
  await page.route("**/api/v1/admin/resources**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith(`/${id}`)) return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "CENTER_SCOPE_FORBIDDEN", message: "Foreign center denied", requestId: "admin-403" }) });
    if (pathname.endsWith("/versions")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [resource] }) });
  });
  await page.goto("/admin/resources");
  await expect(page.getByText("qa-真实接口资料", { exact: true })).toBeVisible();
  await expect(page.getByLabel("中心 ID")).toHaveCount(0);
  await page.getByRole("button", { name: "查看资源 qa-真实接口资料" }).click();
  await expect(page.getByRole("complementary", { name: "学习资料详情" }).getByRole("alert")).toContainText("Foreign center denied");
  await expect(page.getByRole("complementary", { name: "学习资料详情" })).not.toContainText("接口正文");
});

test("real admin resources visibly clears rows after a 403", async ({ page }) => {
  let forbidden = false;
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/resources**", (route) => route.fulfill(forbidden ? { status: 403, contentType: "application/json", body: JSON.stringify({ code: "CENTER_SCOPE_FORBIDDEN", message: "Foreign center denied", requestId: "req-403" }) } : { status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [resource] }) }));
  await page.goto("/admin/resources");
  await expect(page.getByText("qa-真实接口资料", { exact: true })).toBeVisible();
  forbidden = true;
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("无权读取学习资料");
  await expect(page.getByText("Foreign center denied", { exact: true })).toBeVisible();
  await expect(page.getByText("qa-真实接口资料", { exact: true })).toHaveCount(0);
  await expect(page.getByText("HarmonyOS 入门路线", { exact: true })).toHaveCount(0);
});

test("real admin resources shows the server empty state and removes prior rows", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) }));
  await page.route("**/api/v1/admin/resources**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.searchParams.get("format") === "web"
        ? { page: 1, pageSize: 20, total: 0, items: [] }
        : { page: 1, pageSize: 20, total: 1, items: [resource] }),
    });
  });

  await page.goto("/admin/resources");
  await expect(page.getByText("qa-真实接口资料", { exact: true })).toBeVisible();
  await page.getByLabel("格式").selectOption("web");
  await expect(page.getByText("没有匹配的学习资料", { exact: true })).toBeVisible();
  await expect(page.getByText("服务端未返回符合当前筛选条件的资料。", { exact: true })).toBeVisible();
  await expect(page.getByText("qa-真实接口资料", { exact: true })).toHaveCount(0);
});
