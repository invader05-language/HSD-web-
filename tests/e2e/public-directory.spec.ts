import { expect, test } from "@playwright/test";

test("about page links to both complete public directories", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByRole("link", { name: "查看全体核心人员" })).toHaveAttribute("href", "/people/core");
  await expect(page.getByRole("link", { name: "查看所有成员" })).toHaveAttribute("href", "/people/members");
});

test("core people directory publishes the approved people without login", async ({ page }) => {
  await page.goto("/people/core");

  await expect(page).toHaveURL(/\/people\/core$/);
  await expect(page.getByRole("heading", { level: 1, name: "核心人员名录" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "林同学" })).toBeVisible();
  await expect(page.getByRole("img", { name: "林同学的默认 HSD 头像" })).toBeVisible();
  await expect(page.getByText("共 4 位核心人员")).toBeVisible();
});

test("member search and center filter stay local to the public directory", async ({ page }) => {
  await page.goto("/people/members");
  await page.waitForFunction(() => {
    const nuxtRoot = document.querySelector("#__nuxt");
    return nuxtRoot && "__vue_app__" in nuxtRoot;
  });

  await expect(page.getByRole("heading", { level: 1, name: "全体成员名录" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "郭同学" })).toBeVisible();
  await expect(page.getByText("共 4 位成员")).toBeVisible();

  await page.getByLabel("搜索成员").fill("何同学");
  await expect(page.getByRole("heading", { level: 2, name: "何同学" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "郭同学" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/people\/members$/);

  await page.getByLabel("搜索成员").fill("");
  await page.getByLabel("按中心筛选").selectOption("new-media");
  await expect(page.getByRole("heading", { level: 2, name: "何同学" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "郭同学" })).toHaveCount(0);
  await expect(page.getByText("共 1 位成员")).toBeVisible();
  await expect(page).toHaveURL(/\/people\/members$/);
});
