import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { HOME_SECTIONS, PROJECTS, RESOURCES } from "../../app/data/home";
import { findResource } from "../../app/data/resources";

describe("homepage content", () => {
  it("keeps the approved section and project order", () => {
    expect(HOME_SECTIONS).toEqual([
      "hero",
      "flash",
      "stats",
      "news",
      "centers",
      "projects",
      "activities",
      "gallery",
      "members",
      "resources",
      "recruitment"
    ]);
    expect(PROJECTS[0]?.title).toBe("智巡先锋");
    expect(PROJECTS[1]?.title).toBe("智学领航");
    expect(PROJECTS[2]?.title).toBe("小白云");
  });

  it("routes every homepage resource card through its matching detail page", () => {
    expect(RESOURCES.map((resource) => resource.to)).toEqual([
      "/resources/harmonyos-getting-started",
      "/resources/project-requirement-template",
      "/resources/member-training-package"
    ]);

    for (const resource of RESOURCES) {
      const detail = findResource(resource.to.replace("/resources/", ""));
      expect(detail?.to).toBe(resource.to);
      if (detail?.status === "not-connected") {
        expect(resource.access).toBe("文件暂未接入");
        expect(resource.access).not.toContain("下载");
      }
    }
  });

  it("reads homepage flash and news from the published portal projection", () => {
    const source = readFileSync(`${process.cwd()}/app/pages/index.vue`, "utf8");
    const homeDataSource = readFileSync(`${process.cwd()}/app/data/home.ts`, "utf8");

    expect(source).toContain("usePublishedPortal");
    expect(source).not.toMatch(/\bFLASH_NEWS\b/);
    expect(source).not.toMatch(/\bNEWS\b/);
    expect(homeDataSource).not.toMatch(/export const FLASH_NEWS\b/);
    expect(homeDataSource).not.toMatch(/export const NEWS\b/);
    expect(source).toContain("HSD 快讯 · 暂无新消息");
    expect(source).toContain("当前暂无动态");
    expect(source).toContain("近期内容将在此更新。");
  });

  it("keeps public portal visual rendering independent from admin fixtures", () => {
    const publicSources = [
      "app/pages/index.vue",
      "app/components/PageBanner.vue",
    ].map((path) => readFileSync(`${process.cwd()}/${path}`, "utf8"));

    for (const source of publicSources) {
      expect(source).not.toMatch(/from ["']~\/data\/admin-/);
    }
  });

  it("uses the dynamic and activity name in the public footer", () => {
    const source = readFileSync(`${process.cwd()}/app/components/SiteFooter.vue`, "utf8");

    expect(source).toContain('<NuxtLink to="/activities">动态与活动</NuxtLink>');
    expect(source).not.toContain('<NuxtLink to="/activities">活动中心</NuxtLink>');
  });
});
