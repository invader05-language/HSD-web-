import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type {
  RecruitmentBatch,
  RecruitmentBatchEffectiveStatus,
} from "../../app/types/recruitment-batch";
import {
  getCurrentOpenBatch,
  getEffectiveRecruitmentBatchStatus,
  getUpcomingRecruitmentBatch,
} from "../../app/utils/recruitment-batch-rules";
import { useRecruitmentBatchStore } from "../../app/stores/recruitment-batch";
import { useSessionStore } from "../../app/stores/session";
import { usePortalContentStore } from "../../app/stores/portal-content";

const NOW = new Date("2026-08-04T02:00:00.000Z");

function batch(overrides: Partial<RecruitmentBatch> = {}): RecruitmentBatch {
  return {
    id: "batch-current",
    name: "2026 秋季招新",
    startAt: "2026-08-01T00:00:00.000Z",
    endAt: "2026-09-18T00:00:00.000Z",
    timezone: "Asia/Shanghai",
    openCenterIds: ["baize-development", "new-media", "tuowei-planning", "talent-development"],
    responsibleAccountIds: ["admin-alliance"],
    lifecycleStatus: "published",
    manualOverride: "none",
    version: 1,
    publishedAt: "2026-07-30T00:00:00.000Z",
    createdAt: "2026-07-29T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("recruitment batch effective status", () => {
  it.each<[string, Partial<RecruitmentBatch>, RecruitmentBatchEffectiveStatus]>([
    ["draft", { lifecycleStatus: "draft" }, "draft"],
    ["upcoming", { startAt: "2026-08-05T00:00:00.000Z" }, "upcoming"],
    ["open at the start boundary", { startAt: "2026-08-04T02:00:00.000Z" }, "open"],
    ["closed at the end boundary", { endAt: "2026-08-04T02:00:00.000Z" }, "closed"],
    ["paused override", { manualOverride: "paused" }, "paused"],
    ["force-closed override", { manualOverride: "force-closed" }, "closed"],
    ["archived lifecycle", { lifecycleStatus: "archived" }, "archived"],
  ])("returns %s", (_label, overrides, expected) => {
    expect(getEffectiveRecruitmentBatchStatus(batch(overrides), NOW).status).toBe(expected);
  });

  it("allows a published batch to open before its planned start only with force-open", () => {
    const result = getEffectiveRecruitmentBatchStatus(batch({
      startAt: "2026-08-05T00:00:00.000Z",
      manualOverride: "force-open",
    }), NOW);

    expect(result).toMatchObject({ status: "open", reason: "force-open" });
  });

  it("does not let manual pause or close get overwritten by time calculations", () => {
    expect(getEffectiveRecruitmentBatchStatus(batch({
      manualOverride: "paused",
      endAt: "2026-08-03T00:00:00.000Z",
    }), NOW).status).toBe("paused");
    expect(getEffectiveRecruitmentBatchStatus(batch({
      manualOverride: "force-closed",
      startAt: "2026-08-05T00:00:00.000Z",
    }), NOW).status).toBe("closed");
    expect(getEffectiveRecruitmentBatchStatus(batch({
      lifecycleStatus: "closed",
      manualOverride: "none",
    }), NOW)).toEqual({ status: "closed", reason: "after-end" });
  });

  it("returns one current open batch and rejects conflicting fixtures", () => {
    expect(getCurrentOpenBatch([batch()], NOW)?.id).toBe("batch-current");
    expect(() => getCurrentOpenBatch([
      batch(),
      batch({ id: "batch-conflict" }),
    ], NOW)).toThrow("BATCH_ALREADY_OPEN");
  });

  it("selects the earliest published upcoming batch", () => {
    expect(getUpcomingRecruitmentBatch([
      batch({ id: "later", startAt: "2026-08-20T00:00:00.000Z" }),
      batch({ id: "earlier", startAt: "2026-08-10T00:00:00.000Z" }),
    ], NOW)?.id).toBe("earlier");
  });
});

describe("recruitment batch lifecycle commands", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("requires owner confirmation for early opening and records the plan and actual time", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ startAt: "2026-08-05T00:00:00.000Z" })]);

    expect(() => store.openNow("batch-current", false, NOW)).toThrow("CONFIRMATION_REQUIRED");
    store.openNow("batch-current", true, NOW, "owner confirmed");

    expect(store.getBatch("batch-current")).toMatchObject({
      manualOverride: "force-open",
      actualOpenedAt: NOW.toISOString(),
      version: 2,
    });
    expect(store.auditRecords[0]).toMatchObject({
      batchId: "batch-current",
      action: "open-now",
      actorId: "admin-alliance",
      originalStartAt: "2026-08-05T00:00:00.000Z",
      actualAt: NOW.toISOString(),
    });
  });

  it("allows only an owner to mutate lifecycle state", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ startAt: "2026-08-05T00:00:00.000Z" })]);

    expect(() => store.openNow("batch-current", true, NOW)).toThrow("OWNER_PERMISSION_REQUIRED");
  });

  it("keeps only one open batch when opening another batch", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch(), batch({
      id: "batch-next",
      startAt: "2026-08-05T00:00:00.000Z",
    })]);

    expect(() => store.openNow("batch-next", true, NOW)).toThrow("BATCH_ALREADY_OPEN");
    expect(store.currentOpenBatch?.id).toBe("batch-current");
  });

  it("requires explicit reopen confirmation after a close", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ endAt: "2026-08-03T00:00:00.000Z" })]);

    store.close("batch-current", true, NOW, "deadline reached");
    expect(() => store.reopen("batch-current", false, NOW)).toThrow("CONFIRMATION_REQUIRED");
  });

  it("invalidates the generated portal flash when an open batch is closed", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ startAt: "2026-08-05T00:00:00.000Z" })]);
    store.openNow("batch-current", true, NOW);
    const content = usePortalContentStore();
    const flash = content.records.find((record) => record.sourceId === "batch-current")!;

    store.close("batch-current", true, NOW, "招新结束");

    expect(content.getPublicById(flash.id, NOW)).toBeUndefined();
    expect(content.getById(flash.id)?.sourceValidity).toBe("invalid");
  });
});
