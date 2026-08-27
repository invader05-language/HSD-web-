import { expect, test } from "@playwright/test";

const memberPages = [
  { path: "/member/growth", selector: ".member-space__content > .shell" },
  { path: "/member/honors", selector: ".member-space__content > .shell" },
  { path: "/member/activities", selector: ".member-space__content > .shell" },
  { path: "/member/applications", selector: ".member-space__content > .shell" },
  { path: "/member/results", selector: ".member-results-content > .shell" },
  { path: "/member/profile", selector: ".member-profile-main" },
] as const;

async function completeDemoLogin(page: import("@playwright/test").Page) {
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();
}

function expectedContentWidth(viewportWidth: number, pagePath: string) {
  const isSingleColumn = viewportWidth <= 900;
  const availableWidth = isSingleColumn ? viewportWidth : viewportWidth - 250;
  const horizontalGutter = pagePath === "/member/results"
    ? viewportWidth <= 640 ? 32 : viewportWidth <= 900 ? 40 : 64
    : pagePath === "/member/profile"
      ? viewportWidth <= 640 ? 32 : 64
      : viewportWidth <= 720 ? 36 : 64;
  return Math.min(availableWidth - horizontalGutter, 1240);
}

test.describe("member subpage content width", () => {
  test("keeps every member page wide enough at desktop and mobile viewports", async ({ page }) => {
    await page.goto("/login?redirect=%2Fmember%2Fgrowth");
    await completeDemoLogin(page);

    for (const viewportWidth of [1280, 1440, 1920, 900, 720, 390]) {
      await page.setViewportSize({ width: viewportWidth, height: 1000 });

      for (const memberPage of memberPages) {
        await page.goto(memberPage.path);
        await expect(page.locator(memberPage.selector)).toBeVisible();

        const metrics = await page.locator(memberPage.selector).evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            width: rect.width,
            left: rect.left,
            right: rect.right,
            scrollWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
          };
        });
        const expected = expectedContentWidth(viewportWidth, memberPage.path);

        expect(metrics.width, `${memberPage.path} content width`).toBeGreaterThanOrEqual(expected - 2);
        expect(metrics.left, `${memberPage.path} left edge`).toBeGreaterThanOrEqual(-1);
        expect(metrics.right, `${memberPage.path} right edge`).toBeLessThanOrEqual(viewportWidth + 1);
        expect(metrics.scrollWidth, `${memberPage.path} horizontal overflow`).toBeLessThanOrEqual(metrics.viewportWidth);
      }
    }
  });
});
