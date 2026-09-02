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

  it("renders responsive banner attributes and falls back to the legacy asset once", async () => {
    const wrapper = mount(MediaPlaceholder, {
      props: {
        src: "/_nuxt/projects-v2-1440.webp",
        srcSet: "/_nuxt/projects-v2-828.webp 828w, /_nuxt/projects-v2-1440.webp 1440w",
        sizes: "(max-width: 900px) 100vw, 48vw",
        width: 4096,
        height: 2730,
        loading: "eager",
        fetchPriority: "high",
        fallbackSrc: "/_nuxt/projects-legacy.webp",
        alt: "项目成果大屏",
      },
    });

    const image = wrapper.get("img");
    expect(image.attributes("srcset")).toContain("1440w");
    expect(image.attributes("sizes")).toBe("(max-width: 900px) 100vw, 48vw");
    expect(image.attributes("width")).toBe("4096");
    expect(image.attributes("height")).toBe("2730");
    expect(image.attributes("loading")).toBe("eager");
    expect(image.attributes("fetchpriority")).toBe("high");

    await image.trigger("error");
    expect(wrapper.get("img").attributes("src")).toBe("/_nuxt/projects-legacy.webp");
    expect(wrapper.get("img").attributes("srcset")).toBeUndefined();

    await wrapper.get("img").trigger("error");
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("uses the placeholder when no published asset is selected", () => {
    const wrapper = mount(MediaPlaceholder, {
      props: { label: "首页主视觉", detail: "等待正式授权素材" },
    });

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toContain("等待正式授权素材");
  });

  it("connects home and join defaults without replacing configured uploads", () => {
    const homeSource = readFileSync("app/pages/index.vue", "utf8");
    const joinSource = readFileSync("app/pages/join.vue", "utf8");
    const bannerSource = readFileSync("app/components/PageBanner.vue", "utf8");

    expect(homeSource).toContain("resolvePortalAssetSource(config.value.visuals.home.assetId)");
    expect(homeSource).toContain('resolvePageVisual(config.value.visuals.home, "home")');
    expect(homeSource).toContain(':src="homeVisualSource"');
    expect(homeSource).toContain("home-hero__media--poster");
    expect(homeSource).toContain('data-visual-stage="poster"');
    expect(homeSource).toContain("home-hero__stage-backdrop");
    expect(homeSource).toContain("--home-poster-image");
    expect(joinSource).toContain('resolvePageVisual(config.visuals.join, "join")');
    expect(joinSource).toContain(':visual="joinVisual"');
    expect(bannerSource).toContain("resolvePortalAssetSource(props.visual?.assetId)");
    expect(bannerSource).toContain("resolvePortalAssetMetadata(props.visual?.assetId)");
    expect(bannerSource).toContain(":src-set=\"visualMetadata?.srcSet\"");
  });

  it("renders uploaded portal visuals through the shared media viewer", () => {
    const homeSource = readFileSync("app/pages/index.vue", "utf8");
    const bannerSource = readFileSync("app/components/PageBanner.vue", "utf8");
    const configSource = readFileSync("app/pages/admin/content/home.vue", "utf8");

    expect(homeSource).toContain("ContentMediaView");
    expect(bannerSource).toContain("ContentMediaView");
    expect(configSource).toContain("ContentMediaUploader");
    expect(configSource).toContain("上传横幅图片");
  });
});
