import { expect, test, type Page } from "@playwright/test";

async function waitForDirectoryHydration(page: Page) {
  await expect(page.locator("[data-directory-hydrated='true']")).toBeVisible();
}

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

test("core search, center filter, and empty state stay local to the directory", async ({ page }) => {
  await page.goto("/people/core");
  await waitForDirectoryHydration(page);

  await page.getByLabel("搜索核心人员").fill("陈同学");
  await expect(page.getByRole("heading", { level: 2, name: "陈同学" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "林同学" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/people\/core$/);

  await page.getByLabel("搜索核心人员").fill("");
  await page.getByLabel("按中心筛选").selectOption("new-media");
  await expect(page.getByRole("heading", { level: 2, name: "陈同学" })).toBeVisible();
  await expect(page.getByText("共 1 位核心人员")).toBeVisible();
  await expect(page).toHaveURL(/\/people\/core$/);

  await page.getByLabel("搜索核心人员").fill("不存在");
  await expect(page.getByRole("status")).toContainText("没有匹配的核心人员");
  await expect(page.getByText("共 0 位核心人员")).toBeVisible();
  await expect(page).toHaveURL(/\/people\/core$/);
});

test("member search and center filter stay local to the public directory", async ({ page }) => {
  await page.goto("/people/members");
  await waitForDirectoryHydration(page);

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

  await page.getByLabel("搜索成员").fill("不存在");
  await expect(page.getByRole("status")).toContainText("没有匹配的成员");
  await expect(page.getByText("共 0 位成员")).toBeVisible();
  await expect(page).toHaveURL(/\/people\/members$/);
});
