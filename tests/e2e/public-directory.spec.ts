import { expect, test, type Page } from "@playwright/test";

async function waitForDirectoryHydration(page: Page) {
  await expect(page.locator("[data-directory-hydrated='true']")).toBeVisible();
}

async function cardBoxes(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((cards) =>
    cards.map((card) => {
      const box = card.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    })
  );
}

test("about page links to both complete public directories", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByRole("link", { name: "查看全体核心人员" })).toHaveAttribute("href", "/people/core");
  await expect(page.getByRole("link", { name: "查看所有成员" })).toHaveAttribute("href", "/people/members");
  await expect(page.locator(".member-directory > article")).toHaveCount(6);
});

test("core people directory publishes the approved people without login", async ({ page }) => {
  await page.goto("/people/core");

  await expect(page).toHaveURL(/\/people\/core$/);
  await expect(page.getByRole("heading", { level: 1, name: "核心人员名录" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "林同学" })).toBeVisible();
  await expect(page.getByRole("img", { name: "林同学的默认 HSD 头像" })).toBeVisible();
  await expect(page.getByText("共 6 位核心人员")).toBeVisible();
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
  const clearButton = page.getByRole("button", { name: "清除筛选" });
  await expect(clearButton).toBeVisible();
  expect((await clearButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await clearButton.click();
  await expect(page.getByLabel("搜索核心人员")).toHaveValue("");
  await expect(page.getByLabel("按中心筛选")).toHaveValue("all");
  await expect(page.getByText("共 6 位核心人员")).toBeVisible();
  await expect(page.locator(".people-core-grid > article")).toHaveCount(6);
  await expect(page).toHaveURL(/\/people\/core$/);
});

test("member search and center filter stay local to the public directory", async ({ page }) => {
  await page.goto("/people/members");
  await waitForDirectoryHydration(page);

  await expect(page.getByRole("heading", { level: 1, name: "全体成员名录" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "郭同学" })).toBeVisible();
  await expect(page.getByText("共 6 位成员")).toBeVisible();

  await page.getByLabel("搜索成员").fill("何同学");
  await expect(page.getByRole("heading", { level: 2, name: "何同学" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "郭同学" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/people\/members$/);

  await page.getByLabel("搜索成员").fill("");
  await page.getByLabel("按中心筛选").selectOption("new-media");
  await expect(page.getByRole("heading", { level: 2, name: "何同学" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "郭同学" })).toHaveCount(0);
  await expect(page.getByText("共 2 位成员")).toBeVisible();
  await expect(page).toHaveURL(/\/people\/members$/);

  await page.getByLabel("搜索成员").fill("不存在");
  await expect(page.getByRole("status")).toContainText("没有匹配的成员");
  await expect(page.getByText("共 0 位成员")).toBeVisible();
  const clearButton = page.getByRole("button", { name: "清除筛选" });
  await expect(clearButton).toBeVisible();
  expect((await clearButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await clearButton.click();
  await expect(page.getByLabel("搜索成员")).toHaveValue("");
  await expect(page.getByLabel("按中心筛选")).toHaveValue("all");
  await expect(page.getByText("共 6 位成员")).toBeVisible();
  await expect(page.locator(".people-member-list > article")).toHaveCount(6);
  await expect(page).toHaveURL(/\/people\/members$/);
});

test("1440px directories retain their approved three- and two-column grids", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("/people/core");
  const coreBoxes = await cardBoxes(page, ".people-core-grid > article");
  expect(coreBoxes).toHaveLength(6);
  expect(coreBoxes[0]?.y).toBeCloseTo(coreBoxes[1]?.y ?? 0, 0);
  expect(coreBoxes[0]?.y).toBeCloseTo(coreBoxes[2]?.y ?? 0, 0);
  expect(coreBoxes[3]?.y).toBeGreaterThan((coreBoxes[0]?.y ?? 0) + 100);
  expect(coreBoxes[0]?.width).toBeCloseTo(coreBoxes[1]?.width ?? 0, 0);

  await page.goto("/people/members");
  const memberBoxes = await cardBoxes(page, ".people-member-list > article");
  expect(memberBoxes).toHaveLength(6);
  expect(memberBoxes[0]?.y).toBeCloseTo(memberBoxes[1]?.y ?? 0, 0);
  expect(memberBoxes[2]?.y).toBeGreaterThan((memberBoxes[0]?.y ?? 0) + 100);
  expect(memberBoxes[0]?.width).toBeCloseTo(memberBoxes[1]?.width ?? 0, 0);

  await page.goto("/about");
  const previewBoxes = await cardBoxes(page, ".member-directory > article");
  expect(previewBoxes).toHaveLength(6);
  expect(previewBoxes[0]?.y).toBeCloseTo(previewBoxes[2]?.y ?? 0, 0);
  expect(previewBoxes[3]?.y).toBeGreaterThan((previewBoxes[0]?.y ?? 0) + 100);
});
