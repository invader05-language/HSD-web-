import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  PORTAL_CONTENT_STORAGE_KEY,
  usePortalContentStore,
} from "../../app/stores/portal-content";
import { usePortalCatalog } from "../../app/composables/usePortalCatalog";
import { useSessionStore } from "../../app/stores/session";

const now = new Date("2026-08-04T09:00:00.000Z");
const textBlocks = (text = "有效正文。") => [{ type: "paragraph" as const, text }];

describe("portal content store", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    const record = store.createDraft({ kind: "notice", title: "场地安排", summary: "原安排。", blocks: textBlocks() }, now);
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
    const record = store.createDraft({ kind: "notice", title: "设备维护", summary: "原通知。", blocks: textBlocks() }, now);
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
    const record = store.createDraft({ kind: "notice", title: "设备维护", summary: "维护通知。", blocks: textBlocks() }, now);
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

  it("keeps expired public reads available when expiry audit persistence fails", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({
      kind: "flash", title: "持久化失败的快讯", summary: "到期后仍不能阻塞首页。", expiresAt: "2026-08-04T10:00:00.000Z",
    }, now);
    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);

    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(store.getPublicById(record.id, new Date("2026-08-04T11:00:00.000Z"))).toBeUndefined();
    expect(store.persistenceError).toBe("PORTAL_CONTENT_PERSISTENCE_FAILED");
    expect(store.getById(record.id)).toMatchObject({ sourceValidity: "expired" });
    setItem.mockRestore();
  });

  it("rejects review transitions after a system source becomes unavailable", () => {
    const store = usePortalContentStore();
    const result = store.createSystemDraft({
      eventId: "source-close-event", eventType: "recruitment.batch.opened", occurredAt: now.toISOString(), actorId: "admin-alliance",
      sourceDomain: "recruitment-batch", sourceId: "batch-close", sourceVersion: 1,
      payload: { batchName: "秋季招新", publicRoute: "/join", publicEndAt: "2026-09-01T00:00:00.000Z", isOpen: true },
    });
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
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
    const record = store.createDraft({ kind: "article", title: "坏快照", summary: "不应恢复。", blocks: textBlocks() }, now);
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
    const record = store.createDraft({ kind: "article", title: "状态不一致", summary: "不应恢复。", blocks: textBlocks() }, now);
    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);
    const persisted = JSON.parse(localStorage.getItem(PORTAL_CONTENT_STORAGE_KEY)!);
    persisted.records.find((item: { id: string }) => item.id === record.id).publishedState = "unpublished";
    localStorage.setItem(PORTAL_CONTENT_STORAGE_KEY, JSON.stringify(persisted));

    setActivePinia(createPinia());

    expect(usePortalContentStore().getById(record.id)).toBeUndefined();
  });

  it("rejects a draft without mutating memory when versioned storage is unavailable", () => {
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = usePortalContentStore();

    const before = JSON.parse(JSON.stringify(store.records));
    expect(() => store.createDraft({ kind: "flash", title: "临时通知", summary: "请留意。" }, now))
      .toThrow("PORTAL_CONTENT_PERSISTENCE_FAILED");

    expect(store.records).toEqual(before);
    expect(store.persistenceError).toBe("PORTAL_CONTENT_PERSISTENCE_FAILED");
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
    store.createDraft({ kind: "article", slug: "Shared-Slug", title: "第一篇", summary: "第一篇摘要。", blocks: textBlocks() }, now);

    expect(() => store.createDraft({
      kind: "notice", slug: " shared-slug ", title: "第二篇", summary: "第二篇摘要。", blocks: textBlocks(),
    }, now)).toThrow("PORTAL_CONTENT_DUPLICATE_SLUG");
  });

  it("rejects duplicate slug updates without mutating the existing draft", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = usePortalContentStore();
    const first = store.createDraft({ kind: "article", slug: "first-slug", title: "第一篇", summary: "第一篇摘要。", blocks: textBlocks() }, now);
    const second = store.createDraft({ kind: "notice", slug: "second-slug", title: "第二篇", summary: "第二篇摘要。", blocks: textBlocks() }, now);

    expect(() => store.updateDraft(second.id, { slug: " FIRST-SLUG " }, now)).toThrow("PORTAL_CONTENT_DUPLICATE_SLUG");
    expect(store.getById(second.id)?.slug).toBe("second-slug");
    expect(store.getById(first.id)?.slug).toBe("first-slug");
  });

  it("reserves the live published slug while a newer working revision changes slug", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const first = store.createDraft({
      kind: "article", slug: "published-route", title: "已发布新闻", summary: "公开版本。",
      blocks: [{ type: "paragraph", text: "公开正文。" }],
    }, now);
    store.submitForReview(first.id, now);
    store.approve(first.id, now);
    store.publish(first.id, true, now);
    store.updateDraft(first.id, { slug: "working-route", title: "编辑中的新闻" }, now);

    expect(store.getPublicBySlug("published-route")?.id).toBe(first.id);
    expect(store.getPublicBySlug("working-route")).toBeUndefined();
    expect(() => store.createDraft({
      kind: "notice", slug: " PUBLISHED-ROUTE ", title: "冲突公告", summary: "不应创建。", blocks: textBlocks(),
    }, now)).toThrow("PORTAL_CONTENT_DUPLICATE_SLUG");
    expect(store.getPublicBySlug("published-route")?.title).toBe("已发布新闻");
  });

  it("rechecks live published slug reservations before submit and publish", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const first = store.createDraft({
      kind: "article", slug: "reserved-route", title: "保留路由新闻", summary: "公开版本。",
      blocks: [{ type: "paragraph", text: "公开正文。" }],
    }, now);
    store.submitForReview(first.id, now);
    store.approve(first.id, now);
    store.publish(first.id, true, now);
    store.updateDraft(first.id, { slug: "next-route" }, now);

    const second = store.createDraft({
      kind: "notice", slug: "candidate-route", title: "候选公告", summary: "候选版本。",
      blocks: [{ type: "paragraph", text: "候选正文。" }],
    }, now);
    second.slug = "reserved-route";
    expect(() => store.submitForReview(second.id, now)).toThrow("PORTAL_CONTENT_DUPLICATE_SLUG");

    second.slug = "candidate-route";
    store.submitForReview(second.id, now);
    store.approve(second.id, now);
    second.slug = "reserved-route";
    expect(() => store.publish(second.id, true, now)).toThrow("PORTAL_CONTENT_DUPLICATE_SLUG");
    expect(store.getPublicBySlug("reserved-route")?.id).toBe(first.id);
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
      blocks: [
        { type: "image" as const, assetId: "asset-recruitment-hero", alt: "招新主视觉" },
        { type: "paragraph" as const, text: "媒体报道正文。" },
      ]
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

  it("persists proposed manual command state before mutating memory", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const draft = store.createDraft({ kind: "flash", title: "持久化检查", summary: "保持旧状态。" }, now);

    const failPersistence = () => vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    let before = JSON.parse(JSON.stringify(store.getById(draft.id)));
    let setItem = failPersistence();
    expect(() => store.updateDraft(draft.id, { title: "不应进入内存" }, now)).toThrow("PORTAL_CONTENT_PERSISTENCE_FAILED");
    expect(store.getById(draft.id)).toEqual(before);
    setItem.mockRestore();

    before = JSON.parse(JSON.stringify(store.getById(draft.id)));
    setItem = failPersistence();
    expect(() => store.submitForReview(draft.id, now)).toThrow("PORTAL_CONTENT_PERSISTENCE_FAILED");
    expect(store.getById(draft.id)).toEqual(before);
    setItem.mockRestore();

    store.submitForReview(draft.id, now);
    before = JSON.parse(JSON.stringify(store.getById(draft.id)));
    setItem = failPersistence();
    expect(() => store.approve(draft.id, now)).toThrow("PORTAL_CONTENT_PERSISTENCE_FAILED");
    expect(store.getById(draft.id)).toEqual(before);
    setItem.mockRestore();

    store.approve(draft.id, now);
    before = JSON.parse(JSON.stringify(store.getById(draft.id)));
    setItem = failPersistence();
    expect(() => store.publish(draft.id, true, now)).toThrow("PORTAL_CONTENT_PERSISTENCE_FAILED");
    expect(store.getById(draft.id)).toEqual(before);
    expect(store.getPublicById(draft.id, now)).toBeUndefined();
    setItem.mockRestore();

    store.publish(draft.id, true, now);
    const publicBefore = store.getPublicById(draft.id, now);
    before = JSON.parse(JSON.stringify(store.getById(draft.id)));
    setItem = failPersistence();
    expect(() => store.unpublish(draft.id, "不应成功", now)).toThrow("PORTAL_CONTENT_PERSISTENCE_FAILED");
    expect(store.getById(draft.id)).toEqual(before);
    expect(store.getPublicById(draft.id, now)).toEqual(publicBefore);
    setItem.mockRestore();
  });

  it("does not create an in-memory draft when initial persistence fails", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = usePortalContentStore();
    const before = JSON.parse(JSON.stringify(store.records));
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => store.createDraft({ kind: "flash", title: "无法保存", summary: "不应报告成功。" }, now))
      .toThrow("PORTAL_CONTENT_PERSISTENCE_FAILED");
    expect(store.records).toEqual(before);
    expect(store.persistenceError).toBe("PORTAL_CONTENT_PERSISTENCE_FAILED");
    setItem.mockRestore();
  });

  it("validates meaningful content at every store command boundary", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();

    expect(() => store.createDraft({ kind: "flash", title: "   ", summary: "摘要" }, now))
      .toThrow("PORTAL_CONTENT_INVALID_TITLE");
    expect(() => store.createDraft({ kind: "flash", title: "标题", summary: "   " }, now))
      .toThrow("PORTAL_CONTENT_INVALID_SUMMARY");
    expect(() => store.createDraft({ kind: "article", title: "新闻", summary: "摘要", blocks: [] }, now))
      .toThrow("PORTAL_CONTENT_INVALID_BLOCK");
    expect(() => store.createDraft({
      kind: "notice",
      title: "公告",
      summary: "摘要",
      blocks: [{ type: "paragraph", text: "   " }],
    }, now)).toThrow("PORTAL_CONTENT_INVALID_BLOCK");

    const flash = store.createDraft({ kind: "flash", title: "有效标题", summary: "有效摘要" }, now);
    const beforeUpdate = JSON.parse(JSON.stringify(flash));
    expect(() => store.updateDraft(flash.id, { title: "" }, now)).toThrow("PORTAL_CONTENT_INVALID_TITLE");
    expect(store.getById(flash.id)).toEqual(beforeUpdate);

    flash.summary = "   ";
    expect(() => store.submitForReview(flash.id, now)).toThrow("PORTAL_CONTENT_INVALID_SUMMARY");
    flash.summary = "有效摘要";
    store.submitForReview(flash.id, now);
    flash.title = "";
    expect(() => store.approve(flash.id, now)).toThrow("PORTAL_CONTENT_INVALID_TITLE");
    flash.title = "有效标题";
    store.approve(flash.id, now);
    flash.summary = "";
    expect(() => store.publish(flash.id, true, now)).toThrow("PORTAL_CONTENT_INVALID_SUMMARY");
    expect(store.getById(flash.id)?.status).toBe("pending-publication");
  });

  it("ignores restored records with semantically invalid titles, summaries, or structured text", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({
      kind: "article",
      title: "有效新闻",
      summary: "有效摘要",
      blocks: [{ type: "paragraph", text: "有效正文" }],
    }, now);
    const persisted = JSON.parse(localStorage.getItem(PORTAL_CONTENT_STORAGE_KEY)!);
    persisted.records.find((item: { id: string }) => item.id === record.id).blocks = [{ type: "paragraph", text: "   " }];
    localStorage.setItem(PORTAL_CONTENT_STORAGE_KEY, JSON.stringify(persisted));

    setActivePinia(createPinia());

    expect(usePortalContentStore().getById(record.id)).toBeUndefined();
  });

  it("records complete content audit envelopes for review return, publish, and unpublish", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = usePortalContentStore();
    const record = store.createDraft({
      kind: "notice",
      title: "审计公告",
      summary: "审计摘要",
      blocks: [{ type: "paragraph", text: "审计正文" }],
    }, now);
    store.submitForReview(record.id, now);
    store.returnToDraft(record.id, "补充来源", now);

    expect(record.audit[0]).toMatchObject({
      actorId: "admin-alliance",
      action: "return",
      targetId: record.id,
      beforeRevision: 1,
      afterRevision: 1,
      reason: "补充来源",
      actualAt: now.toISOString(),
    });

    store.submitForReview(record.id, now);
    store.approve(record.id, now);
    store.publish(record.id, true, now);
    expect(record.audit[0]).toMatchObject({
      actorId: "admin-alliance",
      action: "publish",
      targetId: record.id,
      beforeRevision: 1,
      afterRevision: 1,
      actualAt: now.toISOString(),
    });

    store.unpublish(record.id, "公告结束", now);
    expect(record.audit[0]).toMatchObject({
      actorId: "admin-alliance",
      action: "unpublish",
      targetId: record.id,
      beforeRevision: 1,
      afterRevision: 1,
      reason: "公告结束",
      actualAt: now.toISOString(),
    });
  });
});
