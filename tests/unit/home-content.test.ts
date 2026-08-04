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

    expect(source).toContain("usePublishedPortal");
    expect(source).not.toMatch(/\bFLASH_NEWS\b/);
    expect(source).not.toMatch(/\bNEWS\b/);
  });
});
