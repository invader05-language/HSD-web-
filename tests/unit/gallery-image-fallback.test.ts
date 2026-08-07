import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import GalleryLightbox from "../../app/components/GalleryLightbox.vue";
import GalleryMediaFrame from "../../app/components/GalleryMediaFrame.vue";
import ContentMediaView from "../../app/components/ContentMediaView.vue";
import type { GalleryAsset } from "../../app/data/gallery";

const firstAsset: GalleryAsset = {
  id: "fallback-first",
  title: "首张授权素材",
  caption: "保留标题与说明",
  alt: "首张素材替代文字",
  aspect: "wide",
  imageUrl: "/gallery/authorized-first.webp"
};

const secondAsset: GalleryAsset = {
  id: "fallback-second",
  title: "下一张授权素材",
  caption: "切换后重新尝试加载",
  alt: "下一张素材替代文字",
  aspect: "landscape",
  imageUrl: firstAsset.imageUrl
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("gallery image fallback", () => {
  it("replaces a failed media-frame image and retries when its source changes", async () => {
    const wrapper = mount(GalleryMediaFrame, {
      props: { item: firstAsset },
      global: { components: { ContentMediaView } },
    });

    await wrapper.get("[data-testid='content-media-view'] img").trigger("error");

    expect(wrapper.find("[data-testid='content-media-view'] img").exists()).toBe(false);
    expect(wrapper.get(".content-media-view__fallback").text()).toContain("HSD");
    expect(wrapper.text()).toContain(firstAsset.title);
    expect(wrapper.text()).toContain(firstAsset.caption);

    const updatedSource = {
      ...firstAsset,
      imageUrl: "/gallery/authorized-replacement.webp"
    };
    await wrapper.setProps({ item: updatedSource });

    expect(wrapper.get("[data-testid='content-media-view'] img").attributes("src")).toBe(updatedSource.imageUrl);
    expect(wrapper.find(".content-media-view__fallback").exists()).toBe(false);
    wrapper.unmount();
  });

  it("keeps lightbox navigation and copy after an image error, then resets for the next asset", async () => {
    const wrapper = mount(GalleryLightbox, {
      attachTo: document.body,
      props: {
        items: [firstAsset, secondAsset],
        activeIndex: 0
      },
      global: { components: { ContentMediaView } },
    });
    await nextTick();

    const failedImage = document.body.querySelector<HTMLImageElement>(".gallery-lightbox__stage [data-testid='content-media-view'] img");
    expect(failedImage).not.toBeNull();
    failedImage!.dispatchEvent(new Event("error"));
    await nextTick();

    expect(document.body.querySelector(".gallery-lightbox__stage [data-testid='content-media-view'] img")).toBeNull();
    expect(document.body.querySelector(".content-media-view__fallback")?.textContent).toContain("HSD");
    expect(document.body.textContent).toContain(firstAsset.title);
    expect(document.body.textContent).toContain(firstAsset.caption);
    expect(document.body.querySelector<HTMLButtonElement>(".gallery-lightbox__next")?.disabled).toBe(false);

    await wrapper.setProps({ activeIndex: 1 });
    await nextTick();

    expect(
      document.body.querySelector<HTMLImageElement>(".gallery-lightbox__stage [data-testid='content-media-view'] img")?.getAttribute("src")
    ).toBe(secondAsset.imageUrl);
    expect(document.body.querySelector(".content-media-view__fallback")).toBeNull();
    wrapper.unmount();
  });
});
