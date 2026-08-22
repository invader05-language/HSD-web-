import { expect, test, type Page } from "@playwright/test";

const personId = "00000000-0000-4000-8000-000000000201";
const accountId = "00000000-0000-4000-8000-000000000202";
const centerId = "00000000-0000-4000-8000-000000000301";
const projectId = "00000000-0000-4000-8000-000000000401";

async function useProductionApiRuntime(page: Page) {
  await page.route("**/admin/**", async (route) => {
    if (route.request().resourceType() !== "document") {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const body = await response.text();
    const rewritten = body.replace("useMockApi:true", "useMockApi:false");
    if (rewritten === body) throw new Error("E2E_RUNTIME_CONFIG_NOT_REWRITTEN");
    await route.fulfill({ response, body: rewritten });
  });
}

async function stubPositionApi(page: Page) {
  let loggedIn = false;
  let appointed = false;
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/login" && request.method() === "POST") {
      loggedIn = true;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        mustChangePassword: false,
        csrfToken: "member-position-csrf",
        expiresAt: "2030-01-02T00:00:00.000Z",
      }) });
      return;
    }
    if (pathname === "/api/v1/auth/session" && request.method() === "GET") {
      if (!loggedIn) {
        await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "UNAUTHENTICATED", message: "Authentication is required", requestId: "member-position-e2e" }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        account: { id: accountId, adminLevel: "OWNER", adminCenterId: null, capabilities: ["member.create"] },
        person: { id: personId, name: "陈同学", status: "FORMAL_MEMBER" },
        mustChangePassword: false,
      }) });
      return;
    }
    if (pathname === "/api/v1/admin/members" && request.method() === "GET") {
      const position = appointed ? [{
        id: "00000000-0000-4000-8000-000000000501", personId, type: "PROJECT_LEAD", centerId: null, projectId,
        version: 1, appointedAt: "2030-01-01T00:00:00.000Z",
      }] : [];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [{
        id: personId, name: "陈同学", studentId: "2026001001", grade: "2026", className: "软件工程 1 班",
        contact: null, bio: null, biography: null, status: "FORMAL_MEMBER", baizeDirection: null,
        avatar: { kind: "default", variant: "white-hsd" }, publicProfileEnabled: true, version: 1,
        membership: { duty: appointed ? "CORE" : "REGULAR", version: 2, center: { id: centerId, slug: "new-media", name: "新媒体中心" } },
        account: { id: accountId, username: "2026001001", status: "ENABLED", adminLevel: "MEMBER", adminCenterId: null, mustChangePassword: false, version: 1 },
        coreMember: null, positions: position,
      }] }) });
      return;
    }
    if (pathname === "/api/v1/admin/organization/centers" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ currentPermission: { accountId, personId, adminLevel: "OWNER", adminCenterId: null, version: 1 }, items: [{ id: centerId, slug: "new-media", name: "新媒体中心", active: true, positions: [] }] }) });
      return;
    }
    if (pathname === "/api/v1/admin/accounts" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: 1, items: [{ id: accountId, username: "2026001001", status: "ENABLED", adminLevel: "MEMBER", adminCenterId: null, mustChangePassword: false, lastLoginAt: null, version: 1, createdAt: "2030-01-01T00:00:00.000Z", updatedAt: "2030-01-01T00:00:00.000Z", person: { id: personId, name: "陈同学", studentId: "2026001001", grade: "2026", className: "软件工程 1 班" }, adminCenter: null }] }) });
      return;
    }
    if (pathname === "/api/v1/admin/projects" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [{
        id: projectId, centerId, slug: "zhixun-xianfeng", displayOrder: 1, status: "published", version: 1, publishedAt: "2030-01-01T00:00:00.000Z",
        title: "智巡先锋", category: "AI_APPLICATION", year: "2030", description: "项目描述", achievement: "项目成果", projectStage: "持续开发", challenge: "项目挑战", solution: "项目方案", memberPersonIds: [], coverAttachmentId: null, detailAttachmentIds: [], revisionNumber: 1,
        lead: appointed ? { personId, name: "陈同学", positionVersion: 1 } : null,
      }] }) });
      return;
    }
    if (pathname === `/api/v1/admin/organization/positions/projects/${projectId}/leads/${personId}` && request.method() === "POST") {
      appointed = true;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "00000000-0000-4000-8000-000000000501", personId, type: "PROJECT_LEAD", centerId: null, projectId, version: 1, appointedAt: "2030-01-01T00:00:00.000Z" }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "NOT_FOUND", message: "Not found", requestId: "member-position-e2e" }) });
  });
}

test("project-lead action selects a real project and submits the scoped command once", async ({ page }) => {
  await stubPositionApi(page);
  await useProductionApiRuntime(page);
  await page.goto(`/admin/members/${personId}`);
  await page.getByLabel("学号或成员账号").fill("owner");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/members/${personId}$`));
  await page.context().addCookies([{ name: "hsd_csrf", value: "member-position-csrf", domain: "127.0.0.1", path: "/" }]);

  await page.getByRole("button", { name: "授予项目负责人" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const dialogActions = dialog.locator(".admin-position-dialog__actions");
  await expect(dialogActions.evaluate((element) => getComputedStyle(element).columnGap)).resolves.toBe("12px");
  await expect(dialogActions.evaluate((element) => getComputedStyle(element).rowGap)).resolves.toBe("10px");
  await dialog.getByLabel("选择项目").selectOption(projectId);
  const request = page.waitForRequest((candidate) => candidate.url().endsWith(`/api/v1/admin/organization/positions/projects/${projectId}/leads/${personId}`) && candidate.method() === "POST");
  await dialog.getByRole("button", { name: "确认任命" }).click();
  const sent = await request;
  expect(JSON.parse(sent.postData() ?? "{}")).toMatchObject({ expectedAccountVersion: 1, expectedMembershipVersion: 2 });
  await expect(dialog).toBeHidden();
  await expect(page.getByText("项目负责人", { exact: true })).toBeVisible();
});
