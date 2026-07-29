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
    await expect(page.getByRole("heading", { level: 2, name: "中心职责" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "成长路径" })).toBeVisible();
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
