import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MediaPlaceholder from "../../app/components/MediaPlaceholder.vue";
import { resolvePortalAssetSource } from "../../app/data/portal-assets";

describe("published portal visuals", () => {
  it("resolves only explicitly allowlisted asset IDs", () => {
    expect(resolvePortalAssetSource("missing-asset")).toBeUndefined();
    expect(resolvePortalAssetSource("__proto__")).toBeUndefined();
    expect(resolvePortalAssetSource("constructor")).toBeUndefined();
  });

  it("renders the approved asset URL and falls back after an image error", async () => {
    const source = resolvePortalAssetSource("asset-recruitment-hero");
    expect(source).toMatch(/\.png(?:\?|$)/);

    const wrapper = mount(MediaPlaceholder, {
      props: { src: source, alt: "已审核招新主视觉", label: "首页主视觉" },
    });
    expect(wrapper.get("img").attributes("src")).toBe(source);
    expect(wrapper.get("img").attributes("alt")).toBe("已审核招新主视觉");

    await wrapper.get("img").trigger("error");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toContain("首页主视觉");
  });

  it("uses the placeholder when no published asset is selected", () => {
    const wrapper = mount(MediaPlaceholder, {
      props: { label: "首页主视觉", detail: "等待正式授权素材" },
    });

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toContain("等待正式授权素材");
  });

  it("connects published home and page banner visuals to the approved source resolver", () => {
    const homeSource = readFileSync("app/pages/index.vue", "utf8");
    const bannerSource = readFileSync("app/components/PageBanner.vue", "utf8");

    expect(homeSource).toContain("resolvePortalAssetSource(config.visuals.home.assetId)");
    expect(homeSource).toContain(':src="homeVisualSource"');
    expect(bannerSource).toContain("resolvePortalAssetSource(props.visual?.assetId)");
    expect(bannerSource).toContain(':src="visualSource"');
  });

  it("renders uploaded portal visuals through the shared media viewer", () => {
    const homeSource = readFileSync("app/pages/index.vue", "utf8");
    const bannerSource = readFileSync("app/components/PageBanner.vue", "utf8");
    const configSource = readFileSync("app/pages/admin/content/home.vue", "utf8");

    expect(homeSource).toContain("ContentMediaView");
    expect(bannerSource).toContain("ContentMediaView");
    expect(configSource).toContain("ContentMediaUploader");
    expect(configSource).toContain("直接上传主视觉素材");
  });
});
