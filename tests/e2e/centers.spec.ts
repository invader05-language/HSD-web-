import { expect, test } from "@playwright/test";

const centerExpectations = [
  {
    slug: "baize-development",
    href: "/centers/baize-development",
    title: "白泽开发中心",
    headline: "把校园场景中的想法，做成可验证的产品。",
    nextTitle: "新媒体中心",
    nextHref: "/centers/new-media"
  },
  {
    slug: "new-media",
    href: "/centers/new-media",
    title: "新媒体中心",
    headline: "让每一次真实的协作，都被清晰看见。",
    nextTitle: "拓维策划中心",
    nextHref: "/centers/tuowei-planning"
  },
  {
    slug: "tuowei-planning",
    href: "/centers/tuowei-planning",
    title: "拓维策划中心",
    headline: "把不同角色的行动，组织成一次完整发生。",
    nextTitle: "人才发展中心",
    nextHref: "/centers/talent-development"
  },
  {
    slug: "talent-development",
    href: "/centers/talent-development",
    title: "人才发展中心",
    headline: "让每位成员，都能找到持续成长的位置。",
    nextTitle: "白泽开发中心",
    nextHref: "/centers/baize-development"
  }
] as const;

test("center cards link to public detail pages from every overview", async ({ page }) => {
  for (const path of ["/", "/about", "/centers"]) {
    await page.goto(path);

    for (const center of centerExpectations) {
      const centerLink = page.getByRole("link", {
        name: new RegExp(`${center.title}.*查看中心详情`)
      });
      await expect(centerLink).toHaveAttribute("href", center.href);
    }
  }
});

test("all four center routes publish structured details and cross-center navigation", async ({ page }) => {
  for (const center of centerExpectations) {
    const response = await page.goto(center.href);

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/centers/${center.slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: center.title })).toBeVisible();
    await expect(page.getByText(center.headline, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "主要方向" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "中心职责" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "成长路径" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "协作方式" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "相关成员" })).toBeVisible();

    const navigation = page.getByRole("navigation", { name: "四大中心详情导航" });
    await expect(navigation.getByRole("link", { name: /白泽开发中心/ })).toHaveAttribute(
      "href",
      "/centers/baize-development"
    );
    await expect(navigation.getByRole("link", { name: /新媒体中心/ })).toHaveAttribute(
      "href",
      "/centers/new-media"
    );
    await expect(navigation.getByRole("link", { name: /拓维策划中心/ })).toHaveAttribute(
      "href",
      "/centers/tuowei-planning"
    );
    await expect(navigation.getByRole("link", { name: /人才发展中心/ })).toHaveAttribute(
      "href",
      "/centers/talent-development"
    );
    await expect(
      page.getByRole("link", { name: new RegExp(`下一中心.*${center.nextTitle}`) })
    ).toHaveAttribute("href", center.nextHref);
  }
});

test("center detail renders authored topics and collaboration as distinct content", async ({ page }) => {
  await page.goto("/centers/baize-development");

  const topics = page.getByRole("region", { name: "主要方向" });
  await expect(topics.getByText("鸿蒙开发", { exact: true })).toBeVisible();

  const collaboration = page.getByRole("region", { name: "协作方式" });
  await expect(collaboration).toContainText(
    "与策划中心梳理需求，与新媒体中心沉淀项目成果，并为人才发展中心提供技术成长案例。"
  );
});

test("1440px overview exposes a non-hover action and the whole center card navigates", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/centers");

  const card = page.getByRole("link", { name: /白泽开发中心.*查看中心详情/ });
  await expect(card.getByText("查看中心详情 →", { exact: true })).toBeVisible();
  await card.click({ position: { x: 24, y: 24 } });

  await expect(page).toHaveURL(/\/centers\/baize-development$/);
  await expect(page.getByRole("heading", { level: 1, name: "白泽开发中心" })).toBeVisible();
});

test("overview renders live alliance owners with the shared leadership card treatment", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/centers", { waitUntil: "networkidle" });

  const panel = page.getByTestId("organization-leadership-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("2 位负责人");
  await expect(panel.locator("[data-testid='organization-leadership-card']")).toHaveCount(2);
  await expect(panel.getByText("徐一鸣", { exact: true })).toBeVisible();
  await expect(panel.getByText("郭展良", { exact: true })).toBeVisible();
  await expect(panel.getByText("联盟负责人", { exact: true }).first()).toBeVisible();
  await expect(panel).not.toContainText("202402210204");
  await expect(panel).not.toContainText("24通信工程2班");
  await expect(panel.locator("a[href^='/people/']")).toHaveCount(2);
  expect(await panel.locator(".organization-leadership__grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(panel.locator("[data-testid='organization-leadership-card']")).toHaveCount(2);
  expect(await panel.locator(".organization-leadership__grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(1);
});

test("about collaboration cards navigate from the card body", async ({ page }) => {
  await page.goto("/about");
  const card = page.getByRole("link", { name: /新媒体中心.*查看中心详情/ });
  await card.click({ position: { x: 24, y: 24 } });
  await expect(page).toHaveURL(/\/centers\/new-media$/);
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

test("center details use the live roster with leadership cards, filters, and bounded pages", async ({ page }) => {
  const liveCenters = [
    { slug: "baize-development", members: 38, core: 13, ministers: ["李靖镖"] },
    { slug: "new-media", members: 24, core: 10, ministers: ["肖子妤", "李泽宇", "陈奕伟"] },
    { slug: "tuowei-planning", members: 12, core: 3, ministers: ["赵志文", "梁欣然"] },
    { slug: "talent-development", members: 48, core: 1, ministers: ["陈旭涛"] },
  ] as const;

  for (const center of liveCenters) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/centers/${center.slug}`, { waitUntil: "networkidle" });
    await expect(page.getByText(`共 ${center.members} 位成员`, { exact: false })).toBeVisible();
    await expect(page.locator("[data-testid='center-member-card']")).toHaveCount(8);
    await expect(page.locator("[data-testid='center-minister-card']")).toHaveCount(center.ministers.length);
    for (const minister of center.ministers) await expect(page.getByText(minister, { exact: true }).first()).toBeVisible();

    await page.goto(`/centers/${center.slug}?memberPage=2`, { waitUntil: "networkidle" });
    await expect(page.getByText(/第 2 页/)).toBeVisible();
    await expect(page.locator("[data-testid='center-member-card']")).toHaveCount(Math.min(8, center.members - 8));

    await page.goto(`/centers/${center.slug}?memberType=core`, { waitUntil: "networkidle" });
    await expect(page.getByText(`当前显示 核心成员 ${center.core} 人`, { exact: false })).toBeVisible();
    await expect(page.locator("[data-testid='center-member-card']")).toHaveCount(Math.min(8, center.core));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/centers/${center.slug}`, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
