import { expect, test } from "@playwright/test";

test("center cards link to public detail pages from every overview", async ({ page }) => {
  for (const path of ["/", "/about", "/centers"]) {
    await page.goto(path);

    const centerLink = page.getByRole("link", { name: /白泽开发中心.*查看中心详情/ });
    await expect(centerLink).toHaveAttribute("href", "/centers/baize-development");
  }
});

test("center overview navigates to a structured public detail page", async ({ page }) => {
  await page.goto("/centers");
  await page.getByRole("link", { name: /白泽开发中心.*查看中心详情/ }).click();

  await expect(page).toHaveURL(/\/centers\/baize-development$/);
  await expect(page.getByRole("heading", { level: 1, name: "白泽开发中心" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "中心职责" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "成长路径" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "相关成员" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "林同学" })).toBeVisible();
  await expect(page.getByRole("link", { name: /下一中心.*新媒体中心/ })).toHaveAttribute(
    "href",
    "/centers/new-media"
  );
});

test("unknown center slug responds with the Nuxt 404 page", async ({ page }) => {
  const response = await page.goto("/centers/missing");

  expect(response?.status()).toBe(404);
  await expect(page.getByText("404", { exact: true })).toBeVisible();
});

test("mobile center switcher keeps its heading on the content edge", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/centers/baize-development");

  const heading = page.getByRole("heading", { level: 2, name: "继续了解其他中心" });
  const box = await heading.boundingBox();

  expect(box?.x).toBeLessThan(40);
});
