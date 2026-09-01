import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContentMediaView from "../../app/components/ContentMediaView.vue";
import type { ContentMediaAttachment } from "../../app/types/content-media";

const portraitItem: ContentMediaAttachment = {
  id: "portrait",
  role: "detail",
  kind: "image",
  title: "Portrait",
  caption: "",
  alt: "Portrait media",
  aspect: "portrait",
  sortOrder: 0,
  url: "/portrait.webp",
  status: "ready",
};

beforeEach(() => {
  vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: true } }));
});

describe("content media fit", () => {
  it("keeps a full-detail image in contain mode when its aspect metadata is portrait", async () => {
    const wrapper = mount(ContentMediaView, { props: { item: portraitItem, fit: "contain", preview: "full" } });
    await nextTick();

    expect(wrapper.classes()).toContain("content-media-view--contain");
    expect(wrapper.classes()).toContain("content-media-view--aspect-portrait");
    expect(wrapper.get("img").attributes("alt")).toBe("Portrait media");
  });

  it("uses cover only when a caller explicitly selects the card-cover mode", () => {
    const wrapper = mount(ContentMediaView, { props: { item: portraitItem, fit: "cover", preview: "thumbnail" } });

    expect(wrapper.classes()).toContain("content-media-view--cover");
    expect(wrapper.classes()).toContain("content-media-view--thumbnail");
  });

  it("prioritizes a dynamic hero while keeping cards lazy by default", async () => {
    const hero = mount(ContentMediaView, { props: { item: portraitItem, role: "hero", preview: "thumbnail" } });
    await nextTick();
    expect(hero.get("img").attributes("loading")).toBe("eager");
    expect(hero.get("img").attributes("fetchpriority")).toBe("high");
    expect(hero.get("img").attributes("decoding")).toBe("async");

    const card = mount(ContentMediaView, { props: { item: portraitItem, preview: "thumbnail" } });
    await nextTick();
    expect(card.get("img").attributes("loading")).toBe("lazy");
    expect(card.get("img").attributes("fetchpriority")).toBe("auto");
  });
});
