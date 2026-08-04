import { expect, test } from "@playwright/test";

const notice =
  "本平台由学生社团自主建设，仅用于社团管理与校园交流，站内内容及图片不作任何商业用途。";

test("desktop footer publishes the non-commercial notice without a Help Center link", async ({ page }) => {
  await page.goto("/");

  const footer = page.locator(".site-footer");
  const footerGrid = footer.locator(".site-footer__grid");
  const footerBottom = footer.locator(".site-footer__bottom");

  await expect(footer.getByText(notice, { exact: true })).toBeVisible();
  await expect(footer.getByText("© 2026 白云 HSD 开发者部落", { exact: true })).toBeVisible();
  await expect(footer.getByRole("link", { name: /帮助/ })).toHaveCount(0);

  const spacing = await footerGrid.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom
    };
  });
  expect(spacing).toEqual({ paddingTop: "54px", paddingBottom: "39px" });
  await expect(footerBottom).toHaveCSS("min-height", "52px");

  const boxes = await Promise.all([
    footer.locator(".site-footer__copyright").boundingBox(),
    footer.locator(".site-footer__notice").boundingBox()
  ]);
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[0]!.x).toBeLessThan(boxes[1]!.x);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});

test("mobile footer stacks copyright and notice without exposing Help Center", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const footer = page.locator(".site-footer");
  const copyright = footer.locator(".site-footer__copyright");
  const disclaimer = footer.locator(".site-footer__notice");
  await expect(footer.getByRole("link", { name: /帮助/ })).toHaveCount(0);

  const boxes = await Promise.all([
    copyright.boundingBox(),
    disclaimer.boundingBox()
  ]);
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});
