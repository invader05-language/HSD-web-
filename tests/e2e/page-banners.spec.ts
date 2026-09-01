import { expect, test } from "@playwright/test";

const pageBanners = [
  ["/about", "白云 HSD 开发者部落成员集体合影"],
  ["/centers", "白泽开发中心成员合影"],
  ["/projects", "项目团队展示无人机与硬件成果的现场照片"],
  ["/activities", "1024 程序员节活动现场"],
  ["/gallery", "HSD 换届大会现场合影"],
  ["/resources", "1024 程序员节分享活动现场"],
  ["/join", "广东白云学院新学期迎新活动现场"],
] as const;

test("approved landing visuals load and retain the intended crop mode", async ({ page }) => {
  await page.goto("/");
  const homePoster = page.getByRole("img", { name: "白云 HSD 开发者部落主题海报" });
  await expect(homePoster).toBeVisible();
  await expect.poll(() => homePoster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await homePoster.evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");

  for (const [path, alt] of pageBanners) {
    await page.goto(path);
    const image = page.locator(".page-banner").getByRole("img", { name: alt });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    expect(await image.evaluate((element) => getComputedStyle(element).objectFit)).toBe("cover");
  }
});

test("approved visuals do not cause horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");
  const homeStage = page.locator('[data-visual-stage="poster"]');
  const homePoster = page.getByRole("img", { name: "白云 HSD 开发者部落主题海报" });
  await expect(homePoster).toBeVisible();
  expect(await homeStage.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(390);
  expect(await homePoster.evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");

  for (const path of ["/", ...pageBanners.map(([route]) => route)]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow, `${path} should not overflow horizontally`).toBe(false);
  }
});
