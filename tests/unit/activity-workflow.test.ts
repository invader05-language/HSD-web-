import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useActivitiesStore } from "../../app/stores/activities";
import { useSessionStore } from "../../app/stores/session";
import { usePortalCatalog } from "../../app/composables/usePortalCatalog";
import { ACTIVITY_TIME_OPTIONS } from "../../app/data/activities";
import { composeActivityTime, isValidActivityTime, splitActivityTime } from "../../app/utils/activity-time";

const NOW = new Date("2026-08-06T09:00:00.000Z");

function activityInput(overrides: Record<string, unknown> = {}) {
  return {
    slug: "new-media-workshop",
    title: "新媒体工作坊",
    type: "媒体创作" as const,
    date: "2026-09-12",
    time: "19:00–21:00",
    location: "新媒体工作室",
    summary: "学习活动影像的现场记录方法。",
    content: "对摄影和视频感兴趣的同学",
    agenda: ["现场观察", "镜头组织"],
    cover: {
      id: "activity-cover",
      role: "cover" as const,
      kind: "image" as const,
      title: "活动封面",
      caption: "",
      alt: "新媒体工作坊活动封面",
      aspect: "wide" as const,
      sortOrder: 0,
      status: "ready" as const,
    },
    details: [],
    ownerCenterId: "new-media",
    registrationEndAt: "2026-09-11T23:59:59.000Z",
    ...overrides,
  };
}

describe("activity publishing and registration workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("publishes a draft and keeps draft edits private until republished", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = useActivitiesStore();
    const created = store.createDraft(activityInput(), NOW);

    expect(store.getPublicBySlug(created.slug)).toBeUndefined();
    store.publish(created.id, NOW);
    expect(store.getPublicBySlug(created.slug)).toMatchObject({ title: "新媒体工作坊" });

    store.updateDraft(created.id, { title: "新媒体工作坊（更新版）" }, NOW);
    expect(store.getPublicBySlug(created.slug)).toMatchObject({ title: "新媒体工作坊" });
    expect(store.getById(created.id)).toMatchObject({ title: "新媒体工作坊（更新版）" });

    store.publish(created.id, NOW);
    expect(store.getPublicBySlug(created.slug)).toMatchObject({ title: "新媒体工作坊（更新版）" });
    expect(usePortalCatalog().find((item) => item.sourceId === created.slug)).toMatchObject({
      entityType: "activity",
      to: `/activities/${created.slug}`,
      available: true,
    });
  });

  it("allows an owner to publish any center activity but scopes a center administrator", () => {
    const store = useActivitiesStore();
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const baize = store.createDraft(activityInput({ slug: "baize-workshop", ownerCenterId: "baize-development" }), NOW);

    useSessionStore().signIn("media-admin", { requireAdmin: true });
    expect(() => store.publish(baize.id, NOW)).toThrow("ACTIVITY_CENTER_SCOPE_REQUIRED");

    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    expect(() => store.publish(baize.id, NOW)).not.toThrow();
  });

  it("registers an authenticated member and lets an administrator accept or reject it", () => {
    const store = useActivitiesStore();
    const published = store.getPublicBySlug("harmonyos-salon");
    expect(published).toBeDefined();

    useSessionStore().signIn("demo-member");
    const registration = store.registerCurrentUser(published!.id, NOW);
    expect(registration.status).toBe("registered");
    expect(() => store.registerCurrentUser(published!.id, NOW)).toThrow("ACTIVITY_REGISTRATION_DUPLICATE");

    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    store.decideRegistration(registration.id, "accepted", "确认参加", NOW);
    expect(store.getRegistration(registration.id)?.status).toBe("accepted");

    useSessionStore().signIn("demo-applicant");
    const second = store.registerCurrentUser(published!.id, NOW);
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    store.decideRegistration(second.id, "rejected", "本次活动安排不匹配", NOW);
    expect(store.getRegistration(second.id)?.status).toBe("rejected");
  });

  it("does not use capacity or waitlist states and hides unpublished activities", () => {
    const store = useActivitiesStore();
    const published = store.getPublicBySlug("harmonyos-salon");
    expect(published?.registrationMode).toBe("unlimited");
    expect(store.getPublicActivities().some((item) => item.id === published?.id)).toBe(true);

    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    store.unpublish(published!.id, "活动内容调整", NOW);
    expect(store.getPublicBySlug(published!.slug)).toBeUndefined();
  });

  it("rehydrates published activities and registration decisions from versioned browser storage", () => {
    const store = useActivitiesStore();
    const published = store.getPublicBySlug("harmonyos-salon");
    useSessionStore().signIn("demo-member");
    const registration = store.registerCurrentUser(published!.id, NOW);
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    store.decideRegistration(registration.id, "accepted", "确认参加", NOW);

    setActivePinia(createPinia());
    const hydrated = useActivitiesStore();
    expect(hydrated.getPublicBySlug("harmonyos-salon")).toMatchObject({ title: "HarmonyOS 原生应用入门" });
    expect(hydrated.getRegistration(registration.id)).toMatchObject({ status: "accepted" });
  });

  it("uses activity content and generates a slug when a draft is created", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useActivitiesStore();
    const draft = store.createDraft(activityInput({
      slug: undefined,
      title: "new activity",
      content: "活动内容",
      time: ACTIVITY_TIME_OPTIONS[4],
    }), NOW);

    expect(draft.slug).toBe("new-activity");
    expect(draft.content).toBe("活动内容");
  });

  it("rejects publishing when any required activity field is empty", () => {
    const store = useActivitiesStore();
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const draft = store.createDraft(activityInput({
      title: "未完成活动",
      date: "",
      time: "",
      location: "",
      summary: "",
      content: "",
      agenda: [],
    }), NOW);

    expect(() => store.publish(draft.id, NOW)).toThrow("ACTIVITY_INCOMPLETE");
  });

  it("persists an incomplete draft without exposing it publicly", () => {
    const store = useActivitiesStore();
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const draft = store.createDraft(activityInput({
      slug: "incomplete-draft",
      title: "",
      date: "",
      time: "",
      location: "",
      summary: "",
      content: "",
      agenda: [],
    }), NOW);

    expect(store.getById(draft.id)).toMatchObject({ status: "draft", title: "" });
    expect(store.getPublicBySlug(draft.slug)).toBeUndefined();
    expect(JSON.parse(localStorage.getItem("baiyun-hsd.activities") ?? "{}").activities).toHaveLength(4);
  });

  it("migrates version 1 audience data without losing registrations", () => {
    localStorage.setItem("baiyun-hsd.activities", JSON.stringify({
      version: 1,
      activities: [{
        id: "legacy-activity",
        slug: "legacy-activity",
        title: "旧活动",
        type: "技术沙龙",
        date: "2026-09-20",
        time: "19:00–21:00",
        location: "线上会议室",
        summary: "旧摘要",
        audience: "旧活动内容",
        agenda: ["环节一"],
        ownerCenterId: "baize-development",
        registrationEndAt: "2026-09-19T23:59:00.000Z",
        registrationMode: "unlimited",
        publishedAt: NOW.toISOString(),
        revision: 1,
        status: "draft",
        registrationOpen: false,
        version: 1,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
        createdBy: "admin-alliance",
        publishedState: "unpublished",
      }],
      registrations: [{
        id: "legacy-registration",
        activityId: "legacy-activity",
        memberId: "demo-member",
        memberName: "测试成员",
        status: "registered",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      }],
    }));
    setActivePinia(createPinia());

    const store = useActivitiesStore();
    expect(store.getById("legacy-activity")?.content).toBe("旧活动内容");
    expect(store.getRegistration("legacy-registration")?.status).toBe("registered");
    expect(JSON.parse(localStorage.getItem("baiyun-hsd.activities") ?? "{}").version).toBe(2);
  });

  it("requires a reviewed cover and activity detail image description before publishing", () => {
    const store = useActivitiesStore();
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const draft = store.createDraft(activityInput({
      slug: "activity-media-validation",
      cover: null,
      details: [],
    }), NOW);
    expect(() => store.publish(draft.id, NOW)).toThrow("ACTIVITY_INCOMPLETE");

    store.updateDraft(draft.id, {
      cover: activityInput().cover,
      details: [{
        id: "activity-detail",
        role: "detail" as const,
        kind: "video" as const,
        title: "",
        caption: "",
        alt: "活动现场视频",
        aspect: "wide" as const,
        sortOrder: 0,
        status: "ready" as const,
      }],
    }, NOW);
    expect(() => store.publish(draft.id, NOW)).not.toThrow();
  });

  it("keeps partially entered activity times while editing start and end inputs", () => {
    expect(composeActivityTime("19:00", "")).toBe("19:00");
    expect(composeActivityTime("19:00", "21:00")).toBe("19:00-21:00");
    expect(splitActivityTime("19:00-21:00")).toEqual(["19:00", "21:00"]);
    expect(isValidActivityTime("19:00")).toBe(true);
    expect(isValidActivityTime("21:00-19:00")).toBe(false);
  });

  it("automatically closes registration after the deadline", () => {
    const store = useActivitiesStore();
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const draft = store.createDraft(activityInput({
      slug: "expired-registration",
      registrationEndAt: "2026-08-05T23:59:59.000Z",
    }), NOW);
    store.publish(draft.id, NOW);
    store.setRegistrationOpen(draft.id, true, new Date("2026-08-05T12:00:00.000Z"));

    useSessionStore().signIn("demo-member");
    expect(() => store.registerCurrentUser(draft.id, NOW)).toThrow("ACTIVITY_REGISTRATION_CLOSED");
  });

  it("requires an explicit override when reopening after the deadline", () => {
    const store = useActivitiesStore();
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const draft = store.createDraft(activityInput({
      slug: "manual-reopen-registration",
      registrationEndAt: "2026-08-05T23:59:59.000Z",
    }), NOW);
    store.publish(draft.id, NOW);

    expect(() => store.setRegistrationOpen(draft.id, true, NOW)).toThrow("ACTIVITY_REGISTRATION_CLOSED");
    expect(store.setRegistrationOpen(draft.id, true, NOW, true).registrationOpen).toBe(true);
  });
});
