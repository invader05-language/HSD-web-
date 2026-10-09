import { expect, test, type Page } from "@playwright/test";

async function verifyLoginCooldown(page: Page, input: {
  status: 423 | 429;
  code: "LOGIN_ACCOUNT_LOCKED" | "LOGIN_RATE_LIMITED";
  seconds: 30 | 60;
  requestId: string;
  safeMessage: string;
}) {
  const countdownText = (seconds: number) => seconds >= 60
    ? `剩余 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
    : `剩余 ${seconds} 秒`;
  const requests: Array<{ account: string; password: string; rememberMe: boolean }> = [];
  await page.clock.install();
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
        status: input.status,
        contentType: "application/json",
        headers: { "Retry-After": String(input.seconds) },
        body: JSON.stringify({ code: input.code, message: "private diagnostic reason", requestId: input.requestId, retryAfterSeconds: input.seconds }),
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

  await expect(page.getByRole("alert")).toHaveText(input.safeMessage);
  await expect(page.getByRole("status")).toHaveText(countdownText(input.seconds));
  await expect(page.getByRole("button", { name: "登录并继续" })).toBeDisabled();
  await page.clock.fastForward(1_000);
  await expect(page.getByRole("status")).toHaveText(countdownText(input.seconds - 1));
  await expect(page.getByText(input.requestId)).toBeVisible();
  await page.getByRole("button", { name: "复制编号" }).click();
  await expect(page.getByRole("button", { name: /已复制|已选中，请复制/ })).toBeVisible();
  expect(requests).toEqual([{ account: "synthetic-member", password: "  PássWord  ", rememberMe: false }]);
}

test("shows the 30-second source cooldown safely and keeps the submitted password unchanged", async ({ page }) => {
  await verifyLoginCooldown(page, {
    status: 429,
    code: "LOGIN_RATE_LIMITED",
    seconds: 30,
    requestId: "synthetic-login-429",
    safeMessage: "该账号在当前网络尝试过于频繁，请稍后重试。",
  });
});

test("shows the 60-second account cooldown safely", async ({ page }) => {
  await verifyLoginCooldown(page, {
    status: 423,
    code: "LOGIN_ACCOUNT_LOCKED",
    seconds: 60,
    requestId: "synthetic-login-423",
    safeMessage: "该账号暂时锁定，请在剩余时间后重试。",
  });
});
