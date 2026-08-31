import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentMediaAttachment } from "../../app/types/content-media";

const { updateMetadata, upload } = vi.hoisted(() => ({ updateMetadata: vi.fn(), upload: vi.fn() }));

vi.mock("../../app/composables/useContentMediaUpload", () => ({
  useContentMediaUpload: () => ({
    upload,
    resolvePreviewUrl: vi.fn().mockResolvedValue({ url: undefined, owned: false }),
    updateDetails: (items: ContentMediaAttachment[]) => items.map((item, index) => ({ ...item, sortOrder: index })),
    updateMetadata,
  }),
}));

import ContentMediaUploader from "../../app/components/admin/ContentMediaUploader.vue";

const attachment: ContentMediaAttachment = {
  id: "media-1",
  serverOwned: true,
  version: 1,
  mediaId: "asset-1",
  role: "detail",
  kind: "image",
  title: "旧标题",
  caption: "旧说明",
  alt: "旧描述",
  aspect: "landscape",
  sortOrder: 0,
  status: "ready",
};

function mountUploader(metadataProfile: "full" | "activity" = "activity") {
  return mount(ContentMediaUploader, {
    props: { modelValue: [attachment], mode: "collection", metadataProfile },
    global: { stubs: { ContentMediaView: true } },
  });
}

describe("content media metadata persistence", () => {
  beforeEach(() => {
    updateMetadata.mockReset();
    upload.mockReset();
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "", useMockApi: true } }));
  });

  it("serializes updates per attachment and sends the latest value with the new version", async () => {
    let resolveFirst!: (value: ContentMediaAttachment) => void;
    const firstResponse = new Promise<ContentMediaAttachment>((resolve) => { resolveFirst = resolve; });
    const calls: ContentMediaAttachment[] = [];
    updateMetadata
      .mockImplementationOnce(async (value: ContentMediaAttachment) => { calls.push({ ...value }); return firstResponse; })
      .mockImplementation(async (value: ContentMediaAttachment) => { calls.push({ ...value }); return { ...value, version: (value.version ?? 0) + 1 }; });

    const wrapper = mountUploader();
    const alt = wrapper.get('input[placeholder="描述用户看不到的画面内容"]');
    await alt.setValue("新描述");
    await alt.trigger("blur");
    const ratio = wrapper.get("select");
    await ratio.setValue("portrait");

    expect(updateMetadata).toHaveBeenCalledTimes(1);
    resolveFirst({ ...attachment, alt: "新描述", version: 2 });
    await flushPromises();

    expect(updateMetadata).toHaveBeenCalledTimes(2);
    expect(calls[1]).toMatchObject({ version: 2, alt: "新描述", aspect: "portrait" });
    wrapper.unmount();
  });

  it("rejects the flush when a metadata update fails", async () => {
    updateMetadata.mockRejectedValue(new Error("MEDIA_ATTACHMENT_VERSION_CONFLICT"));
    const wrapper = mountUploader();
    const alt = wrapper.get('input[placeholder="描述用户看不到的画面内容"]');
    await alt.setValue("新描述");
    await alt.trigger("blur");

    await expect((wrapper.vm as unknown as { flushPendingMetadata: () => Promise<void> }).flushPendingMetadata()).rejects.toThrow("MEDIA_ATTACHMENT_VERSION_CONFLICT");
    expect(wrapper.get('[role="alert"]').text()).toContain("素材信息保存失败");
    wrapper.unmount();
  });

  it("only shows the activity metadata field for the activity profile", () => {
    const activity = mountUploader("activity");
    expect(activity.text()).toContain("图片内容描述");
    expect(activity.text()).not.toContain("替代文本");
    expect(activity.text()).not.toContain("旧标题");
    activity.unmount();

    const full = mountUploader("full");
    expect(full.text()).toContain("标题");
    expect(full.text()).toContain("说明");
    expect(full.text()).toContain("替代文本");
    full.unmount();
  });

  it("keeps the existing cover when a replacement upload fails", async () => {
    upload.mockRejectedValueOnce(Object.assign(new Error("Failed to fetch"), { code: "DIRECT_UPLOAD_NETWORK_FAILED" }));
    const wrapper = mount(ContentMediaUploader, {
      props: { modelValue: [{ ...attachment, role: "cover" }], mode: "cover" },
      global: { stubs: { ContentMediaView: true } },
    });

    await wrapper.get('[role="button"]').trigger("drop", {
      dataTransfer: { files: [new File(["image"], "replacement.png", { type: "image/png" })] },
    });
    await flushPromises();

    expect(wrapper.findAll(".content-media-uploader__item")).toHaveLength(1);
    expect(wrapper.get('[role="alert"]').text()).toContain("无法连接素材存储服务");
    wrapper.unmount();
  });
});
