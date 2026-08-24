import { expect, test } from "@playwright/test";

const ownerSession = { account: { id: "owner-api", adminLevel: "OWNER", adminCenterId: null, capabilities: [] }, person: { id: "person-owner", name: "接口负责人", status: "FORMAL_MEMBER" }, mustChangePassword: false };
const adminSession = { account: { id: "center-admin", adminLevel: "ADMIN", adminCenterId: "center-1", capabilities: [] }, person: { id: "admin-person", name: "中心管理员", status: "FORMAL_MEMBER" }, mustChangePassword: false };
const memberSession = { account: { id: "member-api", adminLevel: "MEMBER", adminCenterId: null, capabilities: [] }, person: { id: "member-person", name: "普通成员", status: "FORMAL_MEMBER" }, mustChangePassword: false };
const auditEvent = { id: "11111111-1111-4111-8111-111111111111", actor: { type: "account", accountId: "22222222-2222-4222-8222-222222222222", username: "owner", displayName: "接口负责人" }, action: "content.publish", target: { type: "content", id: "33333333-3333-4333-8333-333333333333" }, before: { status: "review", token: "must-not-render", ip: "127.0.0.1", clientIp: "10.0.0.1" }, after: { status: "published", cookie: "must-not-render", allowed: ["published", true] }, reason: "review approved", createdAt: "2026-08-23T00:00:00.000Z" };

test("owner real audit log uses only safe API rows and server filters", async ({ page }) => {
  const requests: string[] = [];
  await page.addInitScript(() => localStorage.setItem("baiyun-hsd.admin-access", JSON.stringify({ auditRecords: [{ actor: "旧本地审计记录" }] })));
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ownerSession) }));
  await page.route("**/api/v1/admin/audit-events**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [auditEvent] }) });
  });

  await page.goto("/admin/logs");
  await expect(page.getByRole("heading", { level: 1, name: "操作日志" })).toBeVisible();
  await expect(page.getByRole("table", { name: "管理员操作日志" })).toContainText("content.publish");
  await expect(page.getByText("旧本地审计记录", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/IP 地址|请求环境|导出日志|保留 180 天/)).toHaveCount(0);
  expect(requests).toEqual([expect.stringContaining("/api/v1/admin/audit-events?page=1&pageSize=20")]);

  await page.getByLabel("动作前缀").fill("content.");
  await expect.poll(() => requests.at(-1)).toContain("actionPrefix=content.");
  await page.getByRole("button", { name: "变更前 / 变更后" }).click();
  const drawer = page.getByRole("complementary", { name: "日志详情" });
  await expect(drawer).toContainText("status: review");
  await expect(drawer).toContainText("allowed: published, true");
  await expect(drawer).not.toContainText(/must-not-render|127\.0\.0\.1|10\.0\.0\.1|token|cookie|IP|设备|请求环境/);
});

test("a real-mode MEMBER receives no audit table or seeded local audit fallback", async ({ page }) => {
  let auditRequests = 0;
  await page.addInitScript(() => localStorage.setItem("baiyun-hsd.admin-access", JSON.stringify({ auditRecords: [{ actor: "成员不能读取的本地记录" }] })));
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(memberSession) }));
  await page.route("**/api/v1/admin/audit-events**", (route) => { auditRequests += 1; return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "AUDIT_OWNER_ONLY", message: "Owner only", requestId: "member-403" }) }); });
  await page.goto("/admin/logs");
  await expect(page.getByRole("heading", { level: 1, name: "当前账号没有此项管理权限" })).toBeVisible();
  await expect(page.getByRole("table", { name: "管理员操作日志" })).toHaveCount(0);
  await expect(page.getByText("成员不能读取的本地记录", { exact: true })).toHaveCount(0);
  expect(auditRequests).toBe(0);
});

test("real audit log clears rows for owner empty results and exposes an admin 403 without fixtures", async ({ page }) => {
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ownerSession) }));
  await page.route("**/api/v1/admin/audit-events**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 0, items: [] }) }));
  await page.goto("/admin/logs");
  await expect(page.getByText("服务端未返回符合当前筛选条件的审计日志。", { exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "管理员操作日志" })).toHaveCount(0);

  await page.unroute("**/api/v1/auth/session");
  await page.unroute("**/api/v1/admin/audit-events**");
  await page.route("**/api/v1/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(adminSession) }));
  await page.route("**/api/v1/admin/audit-events**", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "AUDIT_OWNER_ONLY", message: "Owner only", requestId: "audit-403" }) }));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("无权读取审计日志");
  await expect(page.getByText("Owner only", { exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "管理员操作日志" })).toHaveCount(0);
});
