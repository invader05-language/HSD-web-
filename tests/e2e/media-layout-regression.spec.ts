import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "laptop", width: 1024, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 390, height: 844 },
] as const;

const detailRoutes = [
  "/projects/zhilv-smart-care",
  "/activities/activity-welcome-2025-2025",
  "/activities/activity-ai-roundtable-2025-2025",
  "/activities/activity-handover-2026-2026",
  "/activities/activity-huawei-lecture-2025-2025",
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
}

async function expectMediaInsideItsContentContainer(page: Page) {
  const contained = await page.locator(
    ".page-banner__media, .activity-detail-media .content-media-view, .project-detail-media .content-media-view",
  ).evaluateAll((nodes) => nodes.every((node) => {
    const container = node.closest(".page-banner, .detail-main");
    if (!container) return false;
    const mediaBounds = node.getBoundingClientRect();
    const containerBounds = container.getBoundingClientRect();
    return mediaBounds.left >= containerBounds.left - 1
      && mediaBounds.right <= containerBounds.right + 1;
  }));

  expect(contained).toBe(true);
}

test.describe("published media layout regression", () => {
  for (const route of detailRoutes) {
    test(`${route} keeps banner and detail media inside the responsive page at every supported viewport`, async ({ page }) => {
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto(route, { waitUntil: "networkidle" });
        await expect(page.locator(".page-banner")).toBeVisible();
        await expect(page.locator(".page-banner__media")).toHaveCount(1);
        await expectNoHorizontalOverflow(page);
        await expectMediaInsideItsContentContainer(page);
      }
    });
  }

  test("the home featured-project cover fills its card instead of letterboxing the wide Zhixun poster", async ({ page }) => {
    await page.setViewportSize(viewports[0]);
    await page.goto("/", { waitUntil: "networkidle" });

    const featuredImage = page.locator(".featured-project__media img");
    await expect(featuredImage).toBeVisible();
    await expect.poll(() => featuredImage.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(featuredImage).toHaveCSS("object-fit", "cover");
    await expectNoHorizontalOverflow(page);
  });

  test("the homepage leadership cards use the approved real roster and positions", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.locator(".member-story strong")).toHaveText(["徐一鸣", "郭展良", "李靖镖"]);
    await expect(page.locator(".member-story p")).toHaveText([
      "联盟负责人 · 白泽开发中心",
      "联盟负责人 · 白泽开发中心",
      "部长 · 白泽开发中心",
    ]);
  });
});
