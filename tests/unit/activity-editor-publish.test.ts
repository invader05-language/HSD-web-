import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivityEditor from "../../app/components/admin/ActivityEditor.vue";
import { useActivitiesStore } from "../../app/stores/activities";
import { useSessionStore } from "../../app/stores/session";

const activityId = "33333333-3333-4333-8333-333333333333";
const centerId = "11111111-1111-4111-8111-111111111111";

const activityRecord = {
  id: activityId,
  centerId,
  slug: "closing-activity",
  status: "unpublished",
  version: 4,
  registrationOpen: false,
  publishedAt: null,
  title: "Closing activity",
  type: "Workshop",
  date: "2099-09-01",
  time: "09:00-10:00",
  location: "Room 1",
  summary: "Summary",
  content: "Content",
  agenda: ["Start"],
  registrationEndAt: "2099-08-31T00:00:00.000Z",
  coverAttachmentId: "44444444-4444-4444-8444-444444444444",
  detailAttachmentIds: ["55555555-5555-4555-8555-555555555555"],
  revisionNumber: 1,
};

const metadataFlush = vi.fn(async () => undefined);
const ContentMediaUploaderStub = defineComponent({
  name: "ContentMediaUploaderStub",
  props: {
    modelValue: { type: Array, default: () => [] },
    mode: { type: String, required: true },
  },
  setup(_, { expose }) {
    expose({ flushPendingMetadata: metadataFlush });
    return () => h("div");
  },
});

function session() {
  useSessionStore().applyApiSession({
    account: { id: "66666666-6666-4666-8666-666666666666", adminLevel: "ADMIN", adminCenterId: centerId, capabilities: ["content.create"] },
    person: { id: "77777777-7777-4777-8777-777777777777", name: "Editor", status: "FORMAL_MEMBER" },
    mustChangePassword: false,
  });
}

describe("activity editor publish metadata sequencing", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    metadataFlush.mockReset();
    metadataFlush.mockResolvedValue(undefined);
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("reactive", reactive);
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("onMounted", onMounted);
    vi.stubGlobal("useRuntimeConfig", () => ({ public: { apiBase: "", useMockApi: true } }));
    session();
  });

  it("waits for both media metadata saves before publishing an unchanged offline activity", async () => {
    const activities = useActivitiesStore();
    await activities.refreshFromApi({ activities: { listAdmin: vi.fn().mockResolvedValue({ items: [activityRecord] }) } });
    const events: string[] = [];
    metadataFlush.mockImplementation(async () => { events.push("metadata"); });
    const publish = vi.spyOn(activities, "publish").mockImplementation((id: string) => { events.push("publish"); return activities.getById(id)!; });

    const wrapper = mount(ActivityEditor, {
      props: { mode: "edit", activity: activities.getById(activityId)! },
      global: {
        stubs: { ContentMediaUploader: ContentMediaUploaderStub, ContentMediaView: true },
      },
    });
    await flushPromises();

    const publishButton = wrapper.findAll("button").find((button) => button.text() === "直接发布")!;
    publishButton.element.removeAttribute("disabled");
    await publishButton.trigger("click");
    await flushPromises();

    expect(metadataFlush).toHaveBeenCalledTimes(2);
    expect(events).toEqual(["metadata", "metadata", "publish"]);
    expect(publish).toHaveBeenCalledWith(activityId);
    wrapper.unmount();
  });

  it("renders a field-level time error instead of only the summary error", async () => {
    const activities = useActivitiesStore();
    await activities.refreshFromApi({ activities: { listAdmin: vi.fn().mockResolvedValue({ items: [{ ...activityRecord, time: "" }] }) } });
    const wrapper = mount(ActivityEditor, {
      props: { mode: "edit", activity: activities.getById(activityId)! },
      global: {
        stubs: { ContentMediaUploader: ContentMediaUploaderStub, ContentMediaView: true },
      },
    });
    await flushPromises();

    const publishButton = wrapper.findAll("button").find((button) => button.text() === "直接发布")!;
    publishButton.element.removeAttribute("disabled");
    await publishButton.trigger("click");

    expect(wrapper.findAll("small.field-error").some((field) => field.text() === "时间不能为空")).toBe(true);
    wrapper.unmount();
  });

  it("does not publish when pending metadata cannot be saved", async () => {
    const activities = useActivitiesStore();
    await activities.refreshFromApi({ activities: { listAdmin: vi.fn().mockResolvedValue({ items: [activityRecord] }) } });
    metadataFlush.mockRejectedValue(new Error("MEDIA_ATTACHMENT_VERSION_CONFLICT"));
    const publish = vi.spyOn(activities, "publish");
    const wrapper = mount(ActivityEditor, {
      props: { mode: "edit", activity: activities.getById(activityId)! },
      global: { stubs: { ContentMediaUploader: ContentMediaUploaderStub, ContentMediaView: true } },
    });
    await flushPromises();

    const publishButton = wrapper.findAll("button").find((button) => button.text() === "直接发布")!;
    publishButton.element.removeAttribute("disabled");
    await publishButton.trigger("click");
    await flushPromises();

    expect(publish).not.toHaveBeenCalled();
    expect(wrapper.get('[role="alert"]').text()).toContain("发布失败");
    wrapper.unmount();
  });

  it("maps media completeness errors to the corresponding field", async () => {
    const activities = useActivitiesStore();
    await activities.refreshFromApi({ activities: { listAdmin: vi.fn().mockResolvedValue({ items: [activityRecord] }) } });
    vi.spyOn(activities, "publish").mockImplementation(() => {
      throw Object.assign(new Error("活动封面信息不完整"), { code: "MEDIA_COVER_INCOMPLETE" });
    });
    const wrapper = mount(ActivityEditor, {
      props: { mode: "edit", activity: activities.getById(activityId)! },
      global: { stubs: { ContentMediaUploader: ContentMediaUploaderStub, ContentMediaView: true } },
    });
    await flushPromises();

    const publishButton = wrapper.findAll("button").find((button) => button.text() === "直接发布")!;
    publishButton.element.removeAttribute("disabled");
    await publishButton.trigger("click");
    await flushPromises();

    expect(wrapper.findAll("small.field-error").some((field) => field.text() === "活动封面信息不完整，请补充图片内容描述。")).toBe(true);
    wrapper.unmount();
  });
});
