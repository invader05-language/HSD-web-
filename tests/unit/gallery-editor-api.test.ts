import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { gateway } = vi.hoisted(() => ({ gateway: { galleries: { create: vi.fn(), update: vi.fn(), publish: vi.fn(), offline: vi.fn(), listAdmin: vi.fn(), detail: vi.fn() }, media: { update: vi.fn() } } }));

vi.mock("../../app/composables/useContentGateway", () => ({ useContentGateway: () => gateway }));
vi.mock("../../app/composables/useOrganizationGateway", () => ({ useOrganizationGateway: () => undefined }));
vi.mock("../../app/composables/useAdminToast", () => ({ useAdminToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

import GalleryEditor from "../../app/components/admin/GalleryEditor.vue";
import { useGalleryStore } from "../../app/stores/gallery";
import { useSessionStore } from "../../app/stores/session";

const centerId = "11111111-1111-4111-8111-111111111111";
const galleryId = "22222222-2222-4222-8222-222222222222";
const coverId = "33333333-3333-4333-8333-333333333333";
const detailId = "44444444-4444-4444-8444-444444444444";

const record = {
  id: galleryId,
  centerId,
  slug: "api-gallery",
  status: "published",
  version: 4,
  publishedAt: "2026-08-20T00:00:00.000Z",
  title: "API gallery",
  category: "event_documentary",
  year: "2026",
  description: "Gallery summary",
  team: "Media team",
  coverAttachmentId: coverId,
  detailAttachmentIds: [detailId],
  cover: { id: coverId, ownerType: "gallery", ownerId: galleryId, centerId, role: "cover", kind: "image", title: "Cover", caption: "Cover caption", alt: "Cover", aspect: "wide", sortOrder: 0, status: "ready", version: 2, url: "/cover" },
  details: [{ id: detailId, ownerType: "gallery", ownerId: galleryId, centerId, role: "detail", kind: "image", title: "Detail", caption: "Detail caption", alt: "Detail", aspect: "landscape", sortOrder: 0, status: "ready", version: 3, url: "/detail" }],
  revisionNumber: 2,
};

const uploaderStub = {
  props: { modelValue: { type: Array, default: () => [] }, owner: { type: Object, default: undefined }, mode: { type: String, required: true } },
  template: "<div class=\"uploader\" :data-owner-id=\"owner?.ownerId\" />",
};

function signIn() {
  useSessionStore().applyApiSession({
    account: { id: "55555555-5555-4555-8555-555555555555", adminLevel: "OWNER", adminCenterId: null, capabilities: ["content.create"] },
    person: { id: "66666666-6666-4666-8666-666666666666", name: "Owner", status: "FORMAL_MEMBER" },
    mustChangePassword: false,
  });
}

function mountEditor() {
  const store = useGalleryStore();
  store.activateApiMode();
  store.albums = [store.getById(galleryId) ?? ({
    id: galleryId, slug: record.slug, title: record.title, category: record.category, year: record.year, summary: record.description, team: record.team, ownerCenterId: centerId,
    cover: { ...record.cover, imageUrl: record.cover.url, serverOwned: true }, assets: [{ ...record.details[0], imageUrl: record.details[0].url, serverOwned: true }], to: `/gallery/${record.slug}`, publishedAt: record.publishedAt, revision: record.revisionNumber,
    status: "published", publishedState: "published", version: record.version, createdAt: "", updatedAt: "", createdBy: "",
  } as never)];
  return mount(GalleryEditor, {
    props: { mode: "edit", album: store.getById(galleryId)! },
    global: { stubs: { ContentMediaUploader: uploaderStub, ContentMediaView: true } },
  });
}

describe("GalleryEditor API workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("reactive", reactive);
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "https://api.example.test", useMockApi: false } }));
    signIn();
    for (const method of [gateway.galleries.create, gateway.galleries.update, gateway.galleries.publish, gateway.galleries.offline, gateway.galleries.listAdmin, gateway.galleries.detail, gateway.media.update]) method.mockReset();
  });

  it("updates attachment metadata, saves the draft, then publishes with the returned version", async () => {
    const events: string[] = [];
    gateway.media.update.mockImplementation(async () => { events.push("media.update"); return { ...record.details[0], version: 4, status: "ready", url: "/detail" }; });
    gateway.galleries.update.mockImplementation(async (_id: string, input: { expectedVersion: number }) => { events.push("galleries.update"); return { ...record, status: "published", version: input.expectedVersion + 1, cover: record.cover, details: record.details, detailAttachmentIds: [detailId] }; });
    gateway.galleries.publish.mockImplementation(async (_id: string, input: { expectedVersion: number }) => { events.push("galleries.publish"); return { ...record, status: "published", version: input.expectedVersion + 1, cover: record.cover, details: record.details, detailAttachmentIds: [detailId] }; });

    const wrapper = mountEditor();
    await flushPromises();
    await wrapper.findAll("button").find((button) => button.text() === "直接发布")!.trigger("click");
    await flushPromises();

    expect(events).toEqual(["media.update", "media.update", "galleries.update", "galleries.publish"]);
    expect(gateway.galleries.update).toHaveBeenCalledWith(galleryId, expect.objectContaining({ expectedVersion: 4 }));
    expect(gateway.galleries.publish).toHaveBeenCalledWith(galleryId, { expectedVersion: 5 });
    expect(wrapper.emitted("published")?.[0]).toEqual([galleryId]);
    wrapper.unmount();
  });

  it("does not save or publish after media metadata update fails", async () => {
    gateway.media.update.mockRejectedValue(Object.assign(new Error("Media version conflict"), { code: "MEDIA_ATTACHMENT_VERSION_REQUIRED" }));
    const wrapper = mountEditor();
    await flushPromises();
    const publishButton = wrapper.findAll("button").find((button) => button.text() === "直接发布")!;
    publishButton.element.removeAttribute("disabled");
    await publishButton.trigger("click");
    await flushPromises();

    expect(gateway.galleries.update).not.toHaveBeenCalled();
    expect(gateway.galleries.publish).not.toHaveBeenCalled();
    expect(wrapper.get('[role="alert"]').text()).toContain("发布失败");
    expect(wrapper.get('[role="alert"]').text()).toContain("素材信息已更新，请刷新后重试");
    expect(wrapper.emitted("published")).toBeUndefined();
    wrapper.unmount();
  });

  it("loads a directly requested admin gallery by ID without waiting for the list", async () => {
    const store = useGalleryStore();
    store.activateApiMode();
    gateway.galleries.detail.mockResolvedValue(record);

    await expect(store.refreshDetailFromApi(gateway, galleryId)).resolves.toMatchObject({ id: galleryId, slug: "api-gallery", title: "API gallery" });
    expect(store.getById(galleryId)).toMatchObject({ id: galleryId, slug: "api-gallery" });
    expect(gateway.galleries.detail).toHaveBeenCalledWith(galleryId);
  });
});
