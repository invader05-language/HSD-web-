import { expect, test } from "@playwright/test";

test("member directories show up to three featured honors and open details", async ({ page }) => {
  await page.goto("/people/core");
  const card = page.getByRole("link", { name: /林同学.*查看成员详情/ });
  await expect(card.getByTestId("featured-honor")).toHaveCount(3);
  await card.click();

  await expect(page).toHaveURL(/\/people\/lin-development$/);
  await expect(page.getByRole("heading", { level: 1, name: "林同学" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "个人荣誉" })).toBeVisible();
  await expect(page.getByTestId("honor-record")).toHaveCount(4);
});

test("members without public honors render no empty honor label", async ({ page }) => {
  await page.goto("/people/members");
  const card = page.getByRole("link", { name: /孙同学.*查看成员详情/ });
  await expect(card.getByTestId("featured-honor")).toHaveCount(0);
  await expect(card).not.toContainText("暂无荣誉");
  await card.click();

  await expect(page).toHaveURL(/\/people\/sun-talent$/);
  await expect(page.getByRole("heading", { level: 2, name: "个人荣誉" })).toHaveCount(0);
  await expect(page.getByTestId("honor-record")).toHaveCount(0);
});

test("unknown public person returns 404", async ({ page }) => {
  const response = await page.goto("/people/missing");

  expect(response?.status()).toBe(404);
});
