import { expect, test } from "@playwright/test";

test("shows a safe rate-limit response and keeps the submitted password unchanged", async ({ page }) => {
  const requests: Array<{ account: string; password: string; rememberMe: boolean }> = [];
  await page.route("**/login**", async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    const body = await response.text();
    const rewritten = body.replace("useMockApi:true", "useMockApi:false");
    if (rewritten === body) throw new Error("E2E_RUNTIME_CONFIG_NOT_REWRITTEN");
    await route.fulfill({ response, body: rewritten });
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    if (new URL(request.url()).pathname === "/api/v1/auth/login" && request.method() === "POST") {
      requests.push(request.postDataJSON() as { account: string; password: string; rememberMe: boolean });
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        headers: { "Retry-After": "30" },
        body: JSON.stringify({ code: "LOGIN_RATE_LIMITED", message: "private diagnostic reason", requestId: "synthetic-login-429", retryAfterSeconds: 30 }),
      });
      return;
    }
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "UNAUTHENTICATED", message: "Authentication required", requestId: "synthetic-session" }) });
  });

  await page.goto("/login");
  await page.locator('input[name="account"]').fill("synthetic-member");
  await page.locator('input[name="password"]').fill("  PássWord  ");
  await page.getByRole("button", { name: "显示密码" }).click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "隐藏密码" }).click();
  await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page.getByRole("alert")).toHaveText("该账号在当前网络尝试过于频繁，请稍后重试。");
  await expect(page.getByRole("status")).toContainText("剩余");
  await expect(page.getByText("synthetic-login-429")).toBeVisible();
  await page.getByRole("button", { name: "复制编号" }).click();
  await expect(page.getByRole("button", { name: /已复制|已选中，请复制/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "登录并继续" })).toBeDisabled();
  expect(requests).toEqual([{ account: "synthetic-member", password: "  PássWord  ", rememberMe: false }]);
});
