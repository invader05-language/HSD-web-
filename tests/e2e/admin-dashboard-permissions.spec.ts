import { expect, test, type Page } from "@playwright/test";
import type { AdminDashboardSnapshot } from "../../app/types/admin-dashboard";

const adminId = "00000000-0000-4000-8000-000000000101";
const ownerId = "00000000-0000-4000-8000-000000000102";
const personId = "00000000-0000-4000-8000-000000000201";
const centerId = "00000000-0000-4000-8000-000000000301";
const recruitmentBatchId = "00000000-0000-4000-8000-000000000501";
const foreignApplicationId = "00000000-0000-4000-8000-000000000502";

function dashboardSnapshot(level: "admin" | "owner"): AdminDashboardSnapshot {
  const owner = level === "owner";
  return {
    schemaVersion: 1,
    generatedAt: "2030-01-01T00:00:00.000Z",
    timezone: "Asia/Shanghai",
    operator: {
      id: owner ? ownerId : adminId,
      name: owner ? "联盟负责人" : "中心管理员",
      level,
      centerRole: owner ? null : "新媒体中心负责人",
      capabilities: owner
        ? [
            "recruitment.batch.manage",
            "recruitment.assessment.edit",
            "recruitment.result.publish",
            "content.create",
            "content.review",
            "content.publish",
            "portal.configure",
            "portal.publish",
            "member.create",
          ]
        : ["recruitment.assessment.edit", "content.create"],
    },
    metrics: [],
    tasks: [],
    recruitment: null,
    content: { inReview: 0, pendingPublication: 0, recent: [] },
    portal: owner ? { draftRevision: 2, publishedRevision: 1, isDirty: true } : null,
    media: { total: 0, processing: 0, failed: 0, reviewPending: 0 },
    warnings: [],
  };
}

async function stubProductionDashboardApi(page: Page, level: "admin" | "owner") {
  let loggedIn = false;
  const owner = level === "owner";
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/login" && request.method() === "POST") {
      loggedIn = true;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          mustChangePassword: false,
          csrfToken: "dashboard-e2e-csrf",
          expiresAt: "2030-01-02T00:00:00.000Z",
        }),
      });
      return;
    }
    if (pathname === "/api/v1/auth/session" && request.method() === "GET") {
      if (!loggedIn) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ code: "UNAUTHENTICATED", message: "Authentication is required", requestId: "e2e" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          account: {
            id: owner ? ownerId : adminId,
            adminLevel: owner ? "OWNER" : "ADMIN",
            adminCenterId: owner ? null : centerId,
            capabilities: dashboardSnapshot(level).operator.capabilities,
          },
          person: { id: personId, name: owner ? "联盟负责人" : "中心管理员", status: "FORMAL_MEMBER" },
          mustChangePassword: false,
        }),
      });
      return;
    }
    if (pathname === "/api/v1/admin/dashboard" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(dashboardSnapshot(level)),
      });
      return;
    }
    if (pathname === `/api/v1/admin/recruitment/batches/${recruitmentBatchId}/applications/${foreignApplicationId}`
      && request.method() === "GET") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          code: "CENTER_SCOPE_FORBIDDEN",
          message: "The recruitment application is outside the administrator center scope",
          requestId: "e2e-foreign-application",
        }),
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ code: "NOT_FOUND", message: "Not found", requestId: "e2e" }),
    });
  });
}

async function useProductionApiRuntime(page: Page) {
  await page.route("**/admin", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    const rewritten = body.replace("useMockApi:true", "useMockApi:false");
    if (rewritten === body) throw new Error("E2E_RUNTIME_CONFIG_NOT_REWRITTEN");
    await route.fulfill({
      response,
      body: rewritten,
    });
  });
}

async function enterDashboard(page: Page, level: "admin" | "owner") {
  await stubProductionDashboardApi(page, level);
  await useProductionApiRuntime(page);
  await page.goto("/admin");
  await page.getByLabel("学号或成员账号").fill(level === "owner" ? "owner" : "center-admin");
  await page.getByLabel("密码", { exact: true }).fill("safe-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "管理工作台" })).toBeVisible();
}

async function navigateInProductionRuntime(page: Page, path: string) {
  await page.evaluate(async (targetPath) => {
    const root = document.querySelector("#__nuxt") as Element & {
      __vue_app__?: { config?: { globalProperties?: {
        $router?: { push(path: string): Promise<unknown> };
      } } };
    };
    const globals = root?.__vue_app__?.config?.globalProperties;
    if (!globals?.$router) throw new Error("ROUTER_NOT_EXPOSED");
    await globals.$router.push(targetPath);
  }, path);
}

test("a center administrator enters Dashboard without portal capabilities or revision data", async ({ page }) => {
  await enterDashboard(page, "admin");

  await expect(page.getByText("当前操作人：中心管理员")).toBeVisible();
  await expect(page.getByRole("heading", { name: "门户发布状态" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "配置门户 →" })).toHaveCount(0);
  await expect(page.getByText("R2", { exact: true })).toHaveCount(0);
  await expect(page.getByText("R1", { exact: true })).toHaveCount(0);
});

test("an alliance owner sees the capability-authorized portal revision summary", async ({ page }) => {
  await enterDashboard(page, "owner");

  await expect(page.getByRole("heading", { name: "门户发布状态" })).toBeVisible();
  await expect(page.getByRole("link", { name: "配置门户 →" })).toBeVisible();
  await expect(page.getByText("R2", { exact: true })).toBeVisible();
  await expect(page.getByText("R1", { exact: true })).toBeVisible();
});

test("a center administrator receives no foreign recruitment application details at the API boundary", async ({ page }) => {
  await enterDashboard(page, "admin");

  const result = await page.evaluate(async ({ batchId, applicationId }) => {
    const response = await fetch(
      `/api/v1/admin/recruitment/batches/${batchId}/applications/${applicationId}`,
      { credentials: "include" },
    );
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  }, { batchId: recruitmentBatchId, applicationId: foreignApplicationId });

  expect(result.status).toBe(403);
  expect(result.body).toMatchObject({ code: "CENTER_SCOPE_FORBIDDEN" });
  expect(JSON.stringify(result.body)).not.toContain("contact");
  expect(JSON.stringify(result.body)).not.toContain("preferences");

  await navigateInProductionRuntime(
    page,
    `/admin/recruitment/batches/${recruitmentBatchId}/applications/${foreignApplicationId}`,
  );
  await expect(page.getByRole("heading", { name: "报名记录不可用", exact: true })).toBeVisible();
  await expect(page.getByText("The recruitment application is outside the administrator center scope")).toBeVisible();
  await expect(page.getByLabel("联系方式")).toHaveCount(0);
});
