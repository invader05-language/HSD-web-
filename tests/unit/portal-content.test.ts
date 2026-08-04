import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  PORTAL_CONTENT_STORAGE_KEY,
  usePortalContentStore,
} from "../../app/stores/portal-content";
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
    expect(store.getById(record.id)).toMatchObject({ status: "unpublished", revision: 2 });
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
});
