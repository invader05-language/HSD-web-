import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  ADMIN_CONTENT_RECORDS,
  HOMEPAGE_SLOTS,
  canTransitionContent,
  filterAdminRecords,
  getContentOverview
} from "../../app/data/admin-content";
import { usePortalContentStore } from "../../app/stores/portal-content";
import { useSessionStore } from "../../app/stores/session";

describe("administration content workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("allows the confirmed editorial state path and blocks skipping review", () => {
    expect(canTransitionContent("草稿", "待审核")).toBe(true);
    expect(canTransitionContent("待审核", "待发布")).toBe(true);
    expect(canTransitionContent("待审核", "已发布")).toBe(false);
    expect(canTransitionContent("待发布", "已发布")).toBe(true);
    expect(canTransitionContent("已发布", "已下架")).toBe(true);
    expect(canTransitionContent("草稿", "已发布")).toBe(false);
  });

  it("combines text status and category filters", () => {
    expect(
      filterAdminRecords(ADMIN_CONTENT_RECORDS, {
        query: "招新",
        status: "已发布",
        category: "HSD 快讯"
      }).map((record) => record.title)
    ).toEqual(["2026 秋季招新通道开放"]);
  });

  it("keeps homepage modules fixed with explicit capacity", () => {
    expect(HOMEPAGE_SLOTS.map((slot) => [slot.label, slot.capacity])).toEqual([
      ["HSD 快讯", 1],
      ["推荐新闻", 3],
      ["精选项目", 4],
      ["近期活动", 3],
      ["媒体专题", 1],
      ["推荐资源", 3]
    ]);
  });

  it("persists ordinary-admin drafts while reserving review and publishing for the owner", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const content = usePortalContentStore();
    const draft = content.createDraft({
      kind: "article",
      title: "新成员见面会",
      summary: "介绍新学期协作安排。",
      blocks: [{ type: "paragraph", text: "欢迎加入。" }]
    });

    expect(() => content.approve(draft.id)).toThrow("PORTAL_CONTENT_PERMISSION_REQUIRED");
    content.submitForReview(draft.id);

    session.signIn("admin-alliance", { requireAdmin: true });
    content.approve(draft.id);
    content.publish(draft.id, true);
    content.unpublish(draft.id, "活动结束");

    setActivePinia(createPinia());
    expect(usePortalContentStore().getById(draft.id)).toMatchObject({
      status: "unpublished",
      publishedState: "unpublished"
    });
  });

  it("derives dashboard content metrics from the live store statuses", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const content = usePortalContentStore();
    const draft = content.createDraft({ kind: "flash", title: "快讯草稿", summary: "等待审核。" });
    content.submitForReview(draft.id);
    const overview = getContentOverview(content.records);

    expect(overview.total).toBe(4);
    expect(overview.inReview).toBe(1);
    expect(overview.pendingPublication).toBe(0);
    expect(overview.published).toBe(3);
  });
});
