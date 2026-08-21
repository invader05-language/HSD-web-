import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveHomepageUpdates } from "../../app/utils/homepage-updates";

describe("homepage live updates", () => {
  it("uses the newest real public activities when the production news slot is empty", () => {
    const updates = resolveHomepageUpdates([], [
      { id: "older", slug: "older", title: "较早活动", summary: "较早活动摘要", date: "2025-03-18", publishedAt: "" },
      { id: "newer", slug: "newer", title: "真实活动名称", summary: "真实活动摘要", date: "2025-12-26", publishedAt: "" },
    ], true);

    expect(updates.map((item) => item.title)).toEqual(["真实活动名称", "较早活动"]);
    expect(updates[0]).toMatchObject({
      entityType: "activity",
      sourceId: "newer",
      to: "/activities/newer",
      publishedAt: "2025-12-26T00:00:00.000Z",
    });
  });

  it("keeps configured news in mock mode", () => {
    const news = [{
      entityType: "article" as const,
      sourceId: "news-1",
      title: "已发布新闻",
      summary: "新闻摘要",
      to: "/updates/news-1",
      publishedAt: "2026-01-01T00:00:00.000Z",
      eligibleSlots: ["news" as const],
      available: true,
    }];

    expect(resolveHomepageUpdates(news, [], false)).toEqual(news);
  });

  it("constrains the homepage news media to its grid column", () => {
    const css = readFileSync("app/assets/css/main.css", "utf8");
    expect(css).toMatch(/\.news-feature\s*>\s*\.content-media-view\s*\{[^}]*min-width:\s*0;[^}]*width:\s*100%;[^}]*aspect-ratio:\s*auto;/s);
  });
});
