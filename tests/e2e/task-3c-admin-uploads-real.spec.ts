import { expect, test } from "@playwright/test";

const upload = { id: "11111111-1111-4111-8111-111111111111", centerId: "22222222-2222-4222-8222-222222222222", createdBy: { id: "33333333-3333-4333-8333-333333333333", username: "owner", displayName: "接口负责人" }, fileName: "qa-真实接口图片.png", mimeType: "image/png", byteSize: 1536, kind: "image", status: "ready", version: 2, expiresAt: "2026-09-01T00:00:00.000Z", failureCode: null, completedAt: "2026-08-23T01:00:00.000Z", createdAt: "2026-08-23T00:00:00.000Z", updatedAt: "2026-08-23T01:00:00.000Z" };
const ownerSession = { account: { id: "owner-api", adminLevel: "OWNER", adminCenterId: null, capabilities: [] }, person: { id: "person-owner", name: "接口负责人", status: "FORMAL_MEMBER" }, mustChangePassword: false };

test("real upload queue uses the API canonical list and owner center filter only", async ({ page }) => {
  const requests: string[] = [];
  const legacyQueue = [{ id: "legacy-upload", name: "本地旧上传任务", progress: 99 }];
  await page.addInitScript((stored) => localStorage.setItem("baiyun-hsd.admin-uploads", JSON.stringify(stored)), legacyQueue);
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ownerSession) }));
  await page.route("**/api/v1/admin/uploads**", (route) => {
    const url = new URL(route.request().url()); requests.push(url.toString());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: Number(url.searchParams.get("page") || "1"), pageSize: 20, total: 1, items: [upload] }) });
  });

  await page.goto("/admin/uploads");
  await expect(page.getByRole("heading", { level: 1, name: "上传任务" })).toBeVisible();
  await expect(page.getByRole("table", { name: "上传任务列表" })).toContainText("qa-真实接口图片.png");
  await expect(page.getByText("1.5 KB", { exact: true })).toBeVisible();
  await expect(page.getByText("本地旧上传任务", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/%/, { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /重试|上传|完成/ })).toHaveCount(0);
  await page.getByLabel("中心 ID").fill(upload.centerId);
  await expect.poll(() => requests.at(-1)).toContain(`centerId=${upload.centerId}`);
  await page.getByLabel("上传状态").selectOption("ready");
  await expect.poll(() => requests.at(-1)).toContain("status=ready");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("baiyun-hsd.admin-uploads"))).toBe(JSON.stringify(legacyQueue));
});

test("a center ADMIN relies on backend scope and shows an explicit 403 state", async ({ page }) => {
  const adminSession = { account: { id: "center-admin", adminLevel: "ADMIN", adminCenterId: upload.centerId, capabilities: [] }, person: { id: "admin-person", name: "中心管理员", status: "FORMAL_MEMBER" }, mustChangePassword: false };
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(adminSession) }));
  await page.route("**/api/v1/admin/uploads**", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "CENTER_SCOPE_FORBIDDEN", message: "Foreign center denied", requestId: "upload-403" }) }));
  await page.goto("/admin/uploads");
  await expect(page.getByLabel("中心 ID")).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("无权读取上传任务");
  await expect(page.getByText("Foreign center denied", { exact: true })).toBeVisible();
  await expect(page.getByText("qa-真实接口图片.png", { exact: true })).toHaveCount(0);
});

test("real upload queue shows the empty state after a filtered API response", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ownerSession) }));
  await page.route("**/api/v1/admin/uploads**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.searchParams.get("kind") === "video" ? { page: 1, pageSize: 20, total: 0, items: [] } : { page: 1, pageSize: 20, total: 1, items: [upload] }) });
  });
  await page.goto("/admin/uploads");
  await expect(page.getByText("qa-真实接口图片.png", { exact: true })).toBeVisible();
  await page.getByLabel("文件类型").selectOption("video");
  await expect(page.getByText("没有匹配的上传任务", { exact: true })).toBeVisible();
  await expect(page.getByText("qa-真实接口图片.png", { exact: true })).toHaveCount(0);
});
