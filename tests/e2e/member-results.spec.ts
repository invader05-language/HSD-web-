import { expect, test } from "@playwright/test";

async function completeDemoLogin(page: import("@playwright/test").Page) {
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
}

test("results center shows the current admission and assessment views inside the main site", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("link", { name: "结果中心" }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get("redirect")).toBe("/member/results");
  await completeDemoLogin(page);

  await expect(page).toHaveURL(/\/member\/results$/);
  await expect(page.getByRole("heading", { level: 1, name: "结果中心" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "招新录取" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "你已正式加入白泽开发中心" })).toBeVisible();
  await expect(page.getByText("鸿蒙开发", { exact: true })).toHaveCount(2);
  await expect(page.getByText("负责人姓名", { exact: true })).toBeVisible();

  const contactLink = page.getByRole("link", { name: "联系负责人" });
  await contactLink.hover();
  await expect(contactLink).toHaveCSS("color", "rgb(255, 255, 255)");

  await page.getByRole("button", { name: "复制联系方式" }).click();
  await expect(page.getByRole("button", { name: "已复制" })).toBeVisible();
  await expect(page.getByText("138 **** 8899", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("13800008899");

  await page.getByRole("tab", { name: "阶段考核" }).click();
  await expect(page.getByRole("tab", { name: "阶段考核" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "当前没有进行中的考核" })).toBeVisible();
  await expect(page.getByText("仅当前有效结果", { exact: true })).toBeVisible();
  await expect(page.getByText(/报到时间|报到地点|携带材料|确认加入|放弃名额/)).toHaveCount(0);
});

test("legacy assessment URL continues through login to the integrated results center", async ({ page }) => {
  await page.goto("/assessment-results");
  await expect.poll(() => new URL(page.url()).searchParams.get("redirect")).toBe("/assessment-results");

  await completeDemoLogin(page);

  await expect(page).toHaveURL(/\/member\/results$/);
  await expect(page.getByRole("heading", { level: 1, name: "结果中心" })).toBeVisible();
});

test("results center uses the most recent published assessment projection", async ({ page }) => {
  await page.goto("/login?redirect=%2Fmember%2Fresults");
  await completeDemoLogin(page);
  await expect.poll(() => new URL(page.url()).pathname).toBe("/member/results");

  await page.evaluate(() => {
    localStorage.setItem("baiyun-hsd-recruitment-assessment", JSON.stringify({
      version: 1,
      batches: {
        "batch-current": {
          batchId: "batch-current",
          batchVersion: 1,
          version: 2,
          currentRound: 3,
          status: "published",
          publishedAt: "2026-08-04T10:20:00.000Z",
          auditRecords: [],
          records: [{
            batchId: "batch-current",
            candidateId: "candidate-lin",
            memberId: "member-lin",
            center: "白泽开发中心",
            acceptsAdjustment: true,
            roundOutcomes: { 1: "passed", 2: "failed" },
            finalDecision: "not-admitted",
            publishedAt: "2026-08-04T10:20:00.000Z",
          }],
        },
      },
    }));
  });
  expect(await page.evaluate(() => sessionStorage.getItem("baiyun-hsd.session"))).not.toBeNull();
  await page.reload();

  await expect(page.getByRole("heading", { name: "本期未录取" })).toBeVisible();
  await expect(page.getByText("内部备注")).toHaveCount(0);
});
