import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAGE_VISUALS, resolvePageVisual } from "../../app/data/page-visuals";
import { resolvePortalAssetSource } from "../../app/data/portal-assets";

describe("approved page visuals", () => {
  it("defines a resolvable WebP and non-empty alt text for every landing page", () => {
    expect(Object.keys(PAGE_VISUALS)).toEqual([
      "home", "about", "centers", "projects", "activities", "gallery", "resources", "join",
    ]);

    for (const visual of Object.values(PAGE_VISUALS)) {
      expect(visual.assetId).toBeTruthy();
      expect(visual.alt.trim()).not.toBe("");
      expect(resolvePortalAssetSource(visual.assetId)).toMatch(/\.webp(?:\?|$)/);
    }
  });

  it("uses the approved default only when no configured visual exists", () => {
    expect(resolvePageVisual({ alt: "" }, "home")).toBe(PAGE_VISUALS.home);
    expect(resolvePageVisual({ assetId: "missing-asset", alt: "无效素材" }, "home")).toBe(PAGE_VISUALS.home);

    const configured = { assetId: "asset-recruitment-hero", alt: "后台已发布主视觉" };
    expect(resolvePageVisual(configured, "home")).toBe(configured);
  });

  it("keeps each static tab landing page connected to its approved visual", () => {
    const pages = {
      "app/pages/about.vue": "about",
      "app/pages/centers.vue": "centers",
      "app/pages/projects/index.vue": "projects",
      "app/pages/activities/index.vue": "activities",
      "app/pages/gallery/index.vue": "gallery",
      "app/pages/resources.vue": "resources",
    } as const;

    for (const [path, visual] of Object.entries(pages)) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain('import { PAGE_VISUALS } from "~/data/page-visuals"');
      expect(source).toContain(`:visual="PAGE_VISUALS.${visual}"`);
    }
  });
});
