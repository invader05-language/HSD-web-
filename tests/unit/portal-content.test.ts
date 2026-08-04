import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  PORTAL_CONTENT_STORAGE_KEY,
  usePortalContentStore,
} from "../../app/stores/portal-content";
import { usePortalCatalog } from "../../app/composables/usePortalCatalog";
import { useSessionStore } from "../../app/stores/session";

const now = new Date("2026-08-04T09:00:00.000Z");

describe("portal content store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("moves manual content through the reviewed publication workflow", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({
      kind: "article",
      title: "新学期项目开放日",
      summary: "邀请同学了解项目协作方式。",
      blocks: [{ type: "paragraph", text: "欢迎参加。" }],
    }, now);

    store.submitForReview(record.id, now);
    expect(() => store.approve(record.id, now)).toThrow("PORTAL_CONTENT_PERMISSION_REQUIRED");

    session.signIn("admin-alliance", { requireAdmin: true });
    store.approve(record.id, now);
    store.publish(record.id, true, now);

    expect(store.getPublicById(record.id)).toMatchObject({
      title: "新学期项目开放日",
      status: "published",
      revision: 1,
    });
  });

  it("keeps the published revision public while an edited revision is a draft", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({ kind: "notice", title: "场地安排", summary: "原安排。" }, now);
    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);

    store.updateDraft(record.id, { title: "场地安排已更新", summary: "新安排。" }, now);

    expect(store.getPublicById(record.id)).toMatchObject({ title: "场地安排", revision: 1 });
    expect(store.getById(record.id)).toMatchObject({
      title: "场地安排已更新",
      status: "draft",
      revision: 2,
    });
  });

  it("can unpublish an earlier public revision while a newer revision is being edited", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({ kind: "notice", title: "设备维护", summary: "原通知。" }, now);
    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);
    store.updateDraft(record.id, { summary: "更新中的通知。" }, now);

    store.unpublish(record.id, "原通知不再适用", now);

    expect(store.getPublicById(record.id)).toBeUndefined();
    expect(store.getById(record.id)).toMatchObject({ status: "draft", revision: 2, publishedState: "unpublished" });
  });

  it("marks a normally published work revision as unpublished", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({ kind: "notice", title: "设备维护", summary: "维护通知。" }, now);
    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);

    store.unpublish(record.id, "通知结束", now);

    expect(store.getById(record.id)).toMatchObject({ status: "unpublished", publishedState: "unpublished" });
  });

  it("expires public flash projections and records expiry without exposing them", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({
      kind: "flash", title: "即将截止", summary: "请及时提交。", expiresAt: "2026-08-04T10:00:00.000Z",
    }, now);
    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);

    expect(store.getPublicById(record.id, new Date("2026-08-04T11:00:00.000Z"))).toBeUndefined();
    expect(store.getById(record.id)).toMatchObject({ sourceValidity: "expired" });
    expect(store.getById(record.id)?.audit[0]?.action).toBe("source-expired");
  });

  it("rejects review transitions after a system source becomes unavailable", () => {
    const store = usePortalContentStore();
    const result = store.createSystemDraft({
      eventId: "source-close-event", eventType: "recruitment.batch.opened", occurredAt: now.toISOString(), actorId: "admin-alliance",
      sourceDomain: "recruitment-batch", sourceId: "batch-close", sourceVersion: 1,
      payload: { batchName: "秋季招新", publicRoute: "/join", publicEndAt: "2026-09-01T00:00:00.000Z", isOpen: true },
    });
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    store.invalidateSource("recruitment-batch", "batch-close", new Date("2026-08-05T00:00:00.000Z"));

    expect(() => store.submitForReview(result.contentId!, now)).toThrow("PORTAL_SOURCE_NOT_PUBLIC");
  });

  it("falls back to seeded records for malformed or version-mismatched persisted content", () => {
    localStorage.setItem(PORTAL_CONTENT_STORAGE_KEY, JSON.stringify({ version: 1, records: [{}] }));
    setActivePinia(createPinia());
    expect(usePortalContentStore().records).toHaveLength(3);

    localStorage.setItem(PORTAL_CONTENT_STORAGE_KEY, JSON.stringify({ version: 0, records: [] }));
    setActivePinia(createPinia());
    expect(usePortalContentStore().records).toHaveLength(3);
  });

  it("rejects malformed nested published revisions before catalog reads", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({ kind: "article", title: "坏快照", summary: "不应恢复。" }, now);
    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);
    const persisted = JSON.parse(localStorage.getItem(PORTAL_CONTENT_STORAGE_KEY)!);
    persisted.records.find((item: { id: string }) => item.id === record.id).publishedRevision.target = { type: "internal-route" };
    localStorage.setItem(PORTAL_CONTENT_STORAGE_KEY, JSON.stringify(persisted));

    setActivePinia(createPinia());
    const restored = usePortalContentStore();

    expect(restored.getById(record.id)).toBeUndefined();
    expect(() => usePortalCatalog()).not.toThrow();
  });

  it("rejects inconsistent published-state records before public reads", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({ kind: "article", title: "状态不一致", summary: "不应恢复。" }, now);
    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);
    const persisted = JSON.parse(localStorage.getItem(PORTAL_CONTENT_STORAGE_KEY)!);
    persisted.records.find((item: { id: string }) => item.id === record.id).publishedState = "unpublished";
    localStorage.setItem(PORTAL_CONTENT_STORAGE_KEY, JSON.stringify(persisted));

    setActivePinia(createPinia());

    expect(usePortalContentStore().getById(record.id)).toBeUndefined();
  });

  it("retains an in-memory draft when versioned storage is unavailable", () => {
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = usePortalContentStore();

    const record = store.createDraft({ kind: "flash", title: "临时通知", summary: "请留意。" }, now);

    expect(store.getById(record.id)?.title).toBe("临时通知");
    expect(store.persistenceError).toBe("PORTAL_CONTENT_STORAGE_UNAVAILABLE");
    expect(localStorage.getItem(PORTAL_CONTENT_STORAGE_KEY)).toBeNull();
    setItem.mockRestore();
  });

  it("accepts normalized internal content targets and rejects unsafe target schemes", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = usePortalContentStore();

    expect(store.createDraft({
      kind: "flash", title: "加入我们", summary: "查看招新信息。",
      target: { type: "internal-route", value: "/join" }
    }).target.value).toBe("/join");
    expect(store.createDraft({
      kind: "flash", title: "活动详情", summary: "查看活动详情。",
      target: { type: "internal-route", value: "/activities/foo" }
    }).target.value).toBe("/activities/foo");

    for (const value of ["https://example.com", "//evil.example", "javascript:alert(1)", "data:text/html,test"]) {
      expect(() => store.createDraft({
        kind: "flash", title: "不安全目标", summary: "不应保存。",
        target: { type: "internal-route", value }
      })).toThrow("PORTAL_CONTENT_INVALID_TARGET");
    }
  });

  it("assigns canonical update targets even when an article is authored with another target", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({
      kind: "article",
      slug: "new-public-update",
      title: "新的公开动态",
      summary: "验证公开详情目标。",
      target: { type: "internal-route", value: "/activities" },
      blocks: [{ type: "paragraph", text: "公开正文。" }],
    }, now);
    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);

    expect(store.getPublicById(record.id)?.target.value).toBe("/updates/new-public-update");
    expect(usePortalCatalog().find((item) => item.sourceId === record.id)?.to).toBe("/updates/new-public-update");
  });

  it("rejects duplicate slugs on create after trimming and case normalization", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = usePortalContentStore();
    store.createDraft({ kind: "article", slug: "Shared-Slug", title: "第一篇", summary: "第一篇摘要。" }, now);

    expect(() => store.createDraft({
      kind: "notice", slug: " shared-slug ", title: "第二篇", summary: "第二篇摘要。",
    }, now)).toThrow("PORTAL_CONTENT_DUPLICATE_SLUG");
  });

  it("rejects duplicate slug updates without mutating the existing draft", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = usePortalContentStore();
    const first = store.createDraft({ kind: "article", slug: "first-slug", title: "第一篇", summary: "第一篇摘要。" }, now);
    const second = store.createDraft({ kind: "notice", slug: "second-slug", title: "第二篇", summary: "第二篇摘要。" }, now);

    expect(() => store.updateDraft(second.id, { slug: " FIRST-SLUG " }, now)).toThrow("PORTAL_CONTENT_DUPLICATE_SLUG");
    expect(store.getById(second.id)?.slug).toBe("second-slug");
    expect(store.getById(first.id)?.slug).toBe("first-slug");
  });

  it("does not resolve an ambiguous public slug from corrupted duplicate state", () => {
    const store = usePortalContentStore();
    const duplicate = JSON.parse(JSON.stringify(
      store.records.find((record) => record.slug === "project-team")!,
    ));
    duplicate.id = "corrupted-duplicate";
    store.records.unshift(duplicate);

    expect(store.getPublicBySlug("project-team")).toBeUndefined();
  });

  it("rejects invalid image blocks before content can be saved, submitted, or published", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const validInput = {
      kind: "article" as const,
      title: "媒体报道",
      summary: "包含已审核媒体素材。",
      target: { type: "internal-route" as const, value: "/activities/foo" },
      blocks: [{ type: "image" as const, assetId: "asset-recruitment-hero", alt: "招新主视觉" }]
    };

    expect(() => store.createDraft({ ...validInput, blocks: [{ type: "image", assetId: "", alt: "替代文本" }] })).toThrow("PORTAL_CONTENT_INVALID_BLOCK");
    expect(() => store.createDraft({ ...validInput, blocks: [{ type: "image", assetId: "asset-recruitment-hero", alt: "   " }] })).toThrow("PORTAL_CONTENT_INVALID_BLOCK");

    const draft = store.createDraft(validInput, now);
    expect(() => store.updateDraft(draft.id, { blocks: [{ type: "image", assetId: "asset-salon", alt: "未审核素材" }] }, now)).toThrow("PORTAL_CONTENT_INVALID_BLOCK");

    draft.target.value = "//evil.example";
    expect(() => store.submitForReview(draft.id, now)).toThrow("PORTAL_CONTENT_INVALID_TARGET");
    draft.target.value = "/activities/foo";
    store.submitForReview(draft.id, now);
    store.approve(draft.id, now);
    draft.blocks[0] = { type: "image", assetId: "asset-recruitment-hero", alt: "" };
    expect(() => store.publish(draft.id, true, now)).toThrow("PORTAL_CONTENT_INVALID_BLOCK");
  });
});
