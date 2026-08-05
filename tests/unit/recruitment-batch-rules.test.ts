import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type {
  RecruitmentBatch,
  RecruitmentBatchEffectiveStatus,
} from "../../app/types/recruitment-batch";
import {
  getCurrentOpenBatch,
  getEffectiveRecruitmentBatchStatus,
  getRecruitmentBatchProgress,
  getUpcomingRecruitmentBatch,
} from "../../app/utils/recruitment-batch-rules";
import { formatRecruitmentBatchPeriod } from "../../app/data/recruitment-admin-context";
import { createRecruitmentApplicationDraft, createRegistrationProfileDraft } from "../../app/data/recruitment-application";
import { useRecruitmentBatchStore } from "../../app/stores/recruitment-batch";
import { useRecruitmentApplicationStore } from "../../app/stores/recruitment-application";
import { useMemberProfileStore } from "../../app/stores/member-profile";
import { useSessionStore } from "../../app/stores/session";
import { usePortalContentStore } from "../../app/stores/portal-content";

const NOW = new Date("2026-08-04T02:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recruitment batch period formatting", () => {
  it("renders UTC storage timestamps in the batch timezone", () => {
    expect(formatRecruitmentBatchPeriod({
      startAt: "2027-02-19T16:00:00.000Z",
      endAt: "2027-03-08T15:59:59.999Z",
      timezone: "Asia/Shanghai",
  })).toBe("2027-02-20 00:00 — 2027-03-08 23:59");
  });
});

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

  it("automatically closes a force-open batch at its planned end", () => {
    expect(getEffectiveRecruitmentBatchStatus(batch({
      manualOverride: "force-open",
      endAt: "2026-08-04T01:00:00.000Z",
    }), NOW)).toMatchObject({ status: "closed", reason: "after-end" });
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

  it("calculates time progress while preserving terminal and paused states", () => {
    const startAt = new Date("2026-08-01T00:00:00.000Z");
    const endAt = new Date("2026-09-01T00:00:00.000Z");
    const midpoint = new Date((startAt.getTime() + endAt.getTime()) / 2);

    expect(getRecruitmentBatchProgress(batch({ startAt: startAt.toISOString(), endAt: endAt.toISOString() }), midpoint))
      .toMatchObject({ status: "open", percentage: 50 });
    expect(getRecruitmentBatchProgress(batch({ startAt: "2026-08-05T00:00:00.000Z" }), NOW))
      .toMatchObject({ status: "upcoming", percentage: 0 });
    expect(getRecruitmentBatchProgress(batch({
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      manualOverride: "paused",
    }), midpoint))
      .toMatchObject({ status: "paused", percentage: 50 });
    expect(getRecruitmentBatchProgress(batch({ endAt: "2026-08-03T00:00:00.000Z" }), NOW))
      .toMatchObject({ status: "closed", percentage: 100 });
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

  it("locks submitted applications on early close and unlocks only those locks on reopen", () => {
    const applicantSession = useSessionStore();
    applicantSession.signIn("demo-applicant");
    const profileStore = useMemberProfileStore();
    const applicationStore = useRecruitmentApplicationStore();
    applicationStore.submitApplication(
      createRegistrationProfileDraft(profileStore.getProfile(applicantSession.currentMemberId)),
      {
        ...createRecruitmentApplicationDraft(),
        contact: "applicant@example.com",
        firstChoice: "白泽开发中心",
        secondChoice: "新媒体中心",
        baizeDirection: "鸿蒙开发",
        acceptsAdjustment: true,
      },
      true,
      { batchId: "batch-current", now: NOW },
    );

    applicantSession.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.close("batch-current", true, NOW, "提前结束报名");

    expect(applicationStore.getApplication("batch-current", "applicant-chen"))
      .toMatchObject({ status: "locked", lockReason: "early-close" });

    store.reopen("batch-current", true, new Date("2026-08-04T03:00:00.000Z"), "恢复报名");

    expect(applicationStore.getApplication("batch-current", "applicant-chen"))
      .toMatchObject({ status: "submitted", lockReason: undefined });
  });

  it("rejects closing a batch that is not open or paused", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ lifecycleStatus: "published", startAt: "2026-08-05T00:00:00.000Z" })]);

    expect(() => store.close("batch-current", true, NOW)).toThrow("BATCH_NOT_CLOSABLE");
  });

  it("rejects early opening when the actual open interval overlaps another future batch", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([
      batch({
        id: "batch-first",
        startAt: "2026-08-10T00:00:00.000Z",
        endAt: "2026-08-20T00:00:00.000Z",
      }),
      batch({
        id: "batch-second",
        startAt: "2026-08-20T00:00:00.000Z",
        endAt: "2026-08-30T00:00:00.000Z",
      }),
    ]);
    const before = JSON.parse(JSON.stringify(store.getBatch("batch-second")));

    expect(() => store.openNow("batch-second", true, NOW)).toThrow("BATCH_SCHEDULE_OVERLAP");
    expect(store.getBatch("batch-second")).toEqual(before);
    expect(store.auditRecords).toEqual([]);
  });

  it("blocks a later scheduled batch after an earlier batch was force-opened", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([
      batch({
        id: "batch-force-opened",
        startAt: "2026-08-20T00:00:00.000Z",
        endAt: "2026-08-30T00:00:00.000Z",
      }),
      batch({
        id: "batch-scheduled",
        lifecycleStatus: "draft",
        startAt: "2026-08-10T00:00:00.000Z",
        endAt: "2026-08-15T00:00:00.000Z",
      }),
    ]);
    store.openNow("batch-force-opened", true, NOW);
    const before = JSON.parse(JSON.stringify(store.getBatch("batch-scheduled")));

    expect(() => store.publishBatch("batch-scheduled", NOW)).toThrow("BATCH_SCHEDULE_OVERLAP");
    expect(store.getBatch("batch-scheduled")).toEqual(before);
    expect(store.auditRecords).toHaveLength(1);
  });

  it("creates a versioned portal flash when publishing a draft batch already within its open window", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ lifecycleStatus: "draft" })]);

    store.publishBatch("batch-current", NOW);

    expect(usePortalContentStore().records.find((record) => (
      record.sourceId === "batch-current" && record.sourceVersion === 2
    ))).toMatchObject({ sourceEventType: "recruitment.batch.opened", sourceValidity: "valid" });
  });

  it("rejects publishing an already-started draft when another batch is open without mutating state", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([
      batch(),
      batch({ id: "batch-draft", lifecycleStatus: "draft", version: 7 }),
    ]);
    const before = JSON.parse(JSON.stringify(store.getBatch("batch-draft")));

    expect(() => store.publishBatch("batch-draft", NOW)).toThrow("BATCH_ALREADY_OPEN");

    expect(store.getBatch("batch-draft")).toEqual(before);
    expect(store.auditRecords).toEqual([]);
    expect(usePortalContentStore().records.some((record) => record.sourceId === "batch-draft")).toBe(false);
  });

  it("rejects moving a published batch into the open window when another batch is open without mutating state", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([
      batch(),
      batch({
        id: "batch-upcoming",
        startAt: "2026-08-10T00:00:00.000Z",
        endAt: "2026-09-30T00:00:00.000Z",
        version: 4,
      }),
    ]);
    const before = JSON.parse(JSON.stringify(store.getBatch("batch-upcoming")));

    expect(() => store.updateBatch(
      "batch-upcoming",
      { startAt: "2026-08-01T00:00:00.000Z" },
      "move into current window",
      NOW,
    )).toThrow("BATCH_ALREADY_OPEN");

    expect(store.getBatch("batch-upcoming")).toEqual(before);
    expect(store.auditRecords).toEqual([]);
  });

  it("rejects overlapping future published windows before either becomes open", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([
      batch({
        id: "batch-future-a",
        startAt: "2026-08-10T00:00:00.000Z",
        endAt: "2026-08-20T00:00:00.000Z",
      }),
      batch({
        id: "batch-future-draft",
        lifecycleStatus: "draft",
        startAt: "2026-08-15T00:00:00.000Z",
        endAt: "2026-08-25T00:00:00.000Z",
      }),
    ]);
    const before = JSON.parse(JSON.stringify(store.getBatch("batch-future-draft")));

    expect(() => store.publishBatch("batch-future-draft", NOW)).toThrow("BATCH_SCHEDULE_OVERLAP");
    expect(store.getBatch("batch-future-draft")).toEqual(before);
    expect(store.auditRecords).toEqual([]);
  });

  it("returns the conflicting published batch from publish readiness", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([
      batch({
        id: "batch-current",
        name: "2026 秋季招新",
        lifecycleStatus: "published",
        manualOverride: "paused",
        startAt: "2026-08-01T00:00:00.000Z",
        endAt: "2026-09-18T00:00:00.000Z",
      }),
      batch({
        id: "batch-draft",
        name: "111",
        lifecycleStatus: "draft",
        startAt: "2026-08-05T00:00:00.000Z",
        endAt: "2026-08-28T23:59:59.999Z",
      }),
    ]);

    expect(store.getPublishReadiness("batch-draft", NOW)).toEqual({
      ok: false,
      code: "BATCH_SCHEDULE_OVERLAP",
      conflict: {
        batchId: "batch-current",
        batchName: "2026 秋季招新",
        startAt: "2026-08-01T00:00:00.000Z",
        endAt: "2026-09-18T00:00:00.000Z",
      },
    });
  });

  it("reports a ready draft and blocks missing centers or invalid windows", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([
      batch({
        id: "batch-ready",
        lifecycleStatus: "draft",
        startAt: "2026-10-01T00:00:00.000Z",
        endAt: "2026-10-31T23:59:59.999Z",
      }),
      batch({
        id: "batch-no-center",
        lifecycleStatus: "draft",
        openCenterIds: [],
      }),
      batch({
        id: "batch-invalid-window",
        lifecycleStatus: "draft",
        startAt: "2026-10-31T23:59:59.999Z",
        endAt: "2026-10-01T00:00:00.000Z",
      }),
    ]);

    expect(store.getPublishReadiness("batch-ready", NOW)).toEqual({ ok: true });
    expect(store.getPublishReadiness("batch-no-center", NOW)).toMatchObject({ ok: false, code: "BATCH_CENTER_REQUIRED" });
    expect(store.getPublishReadiness("batch-invalid-window", NOW)).toMatchObject({ ok: false, code: "BATCH_WINDOW_INVALID" });
  });

  it("attaches conflict metadata to a rejected publish without mutating state", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([
      batch({ id: "batch-current", name: "2026 秋季招新" }),
      batch({
        id: "batch-draft",
        name: "111",
        lifecycleStatus: "draft",
        startAt: "2026-08-05T00:00:00.000Z",
        endAt: "2026-08-28T23:59:59.999Z",
      }),
    ]);
    const before = JSON.parse(JSON.stringify(store.getBatch("batch-draft")));

    expect(() => store.publishBatch("batch-draft", NOW)).toThrowError(
      expect.objectContaining({
        code: "BATCH_SCHEDULE_OVERLAP",
        conflict: expect.objectContaining({
          batchId: "batch-current",
          batchName: "2026 秋季招新",
        }),
      }),
    );
    expect(store.getBatch("batch-draft")).toEqual(before);
    expect(store.auditRecords).toEqual([]);
  });

  it("rejects reopening a closed batch into an overlapping future window", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([
      batch({
        id: "batch-future-a",
        startAt: "2026-08-10T00:00:00.000Z",
        endAt: "2026-08-20T00:00:00.000Z",
      }),
      batch({
        id: "batch-closed",
        lifecycleStatus: "closed",
        manualOverride: "force-closed",
        startAt: "2026-08-15T00:00:00.000Z",
        endAt: "2026-08-25T00:00:00.000Z",
      }),
    ]);
    const before = JSON.parse(JSON.stringify(store.getBatch("batch-closed")));

    expect(() => store.reopen("batch-closed", true, NOW)).toThrow("BATCH_SCHEDULE_OVERLAP");
    expect(store.getBatch("batch-closed")).toEqual(before);
    expect(store.auditRecords).toEqual([]);
  });

  it("emits the opened event only after a successful time-window update", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({
      id: "batch-upcoming",
      startAt: "2026-08-10T00:00:00.000Z",
      endAt: "2026-09-30T00:00:00.000Z",
      version: 4,
    })]);

    store.updateBatch(
      "batch-upcoming",
      { startAt: "2026-08-01T00:00:00.000Z" },
      "open current window",
      NOW,
    );

    expect(usePortalContentStore().records.find((record) => (
      record.sourceId === "batch-upcoming" && record.sourceVersion === 5
    ))).toMatchObject({ sourceEventType: "recruitment.batch.opened", sourceValidity: "valid" });
  });

  it("allows only an owner to mutate lifecycle state", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ startAt: "2026-08-05T00:00:00.000Z" })]);

    expect(() => store.openNow("batch-current", true, NOW)).toThrow("OWNER_PERMISSION_REQUIRED");
  });

  it("lets only the alliance owner create and persist a draft batch", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();

    const created = store.createBatch({
      name: "2027 春季补招",
      startAt: "2027-02-20T00:00:00.000Z",
      endAt: "2027-03-08T00:00:00.000Z",
      openCenterIds: ["new-media", "talent-development"],
    }, new Date("2026-08-04T10:00:00.000Z"));

    expect(created).toMatchObject({
      name: "2027 春季补招",
      lifecycleStatus: "draft",
      responsibleAccountIds: ["admin-alliance"],
      openCenterIds: ["new-media", "talent-development"],
    });
    expect(localStorage.getItem("baiyun-hsd-recruitment-batches")).toContain("2027 春季补招");
  });

  it("persists lifecycle audit records and assessment publication locks across store reload", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({
      startAt: "2026-08-05T00:00:00.000Z",
      endAt: "2026-09-18T00:00:00.000Z",
    })]);
    store.openNow("batch-current", true, NOW, "提前开放测试");
    store.markAssessmentPublished("batch-current", "2026-08-04T10:20:00.000Z");

    setActivePinia(createPinia());
    const reloaded = useRecruitmentBatchStore();
    expect(reloaded.auditRecords[0]).toMatchObject({
      action: "open-now",
      actorId: "admin-alliance",
      originalStartAt: "2026-08-05T00:00:00.000Z",
    });
    expect(reloaded.assessmentPublishedAt["batch-current"]).toBe("2026-08-04T10:20:00.000Z");
  });

  it("rolls back a batch mutation when persistence fails", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    const before = JSON.parse(JSON.stringify(store.getBatch("batch-current")));
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => store.close("batch-current", true, NOW, "写入失败测试")).toThrow("BATCH_STORAGE_WRITE_FAILED");
    expect(store.getBatch("batch-current")).toEqual(before);
    expect(store.auditRecords).toEqual([]);
    setItem.mockRestore();
  });

  it("does not expose draft creation to ordinary administrators", () => {
    const session = useSessionStore();
    session.signIn("media-admin", { requireAdmin: true });
    const store = useRecruitmentBatchStore();

    expect(() => store.createBatch({
      name: "不应创建",
      startAt: "2027-02-20T00:00:00.000Z",
      endAt: "2027-03-08T00:00:00.000Z",
      openCenterIds: ["new-media"],
    }, NOW)).toThrow("OWNER_PERMISSION_REQUIRED");
  });

  it("keeps only one open batch when opening another batch", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch(), batch({
      id: "batch-next",
      startAt: "2026-08-06T00:00:00.000Z",
    })]);

    expect(() => store.openNow("batch-next", true, NOW)).toThrow("BATCH_ALREADY_OPEN");
    expect(store.currentOpenBatch?.id).toBe("batch-current");
  });

  it("requires explicit reopen confirmation after a close", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ endAt: "2026-09-18T00:00:00.000Z" })]);

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

  it("creates a new source-versioned flash when a paused batch resumes open", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch()]);
    store.pause("batch-current", NOW);

    store.resume("batch-current", NOW);

    expect(usePortalContentStore().records.find((record) => (
      record.sourceId === "batch-current" && record.sourceVersion === 3
    ))).toMatchObject({ sourceEventType: "recruitment.batch.opened", sourceValidity: "valid" });
  });

  it("resumes a force-open batch as open before its planned start", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ startAt: "2026-08-05T00:00:00.000Z" })]);
    store.openNow("batch-current", true, NOW);
    store.pause("batch-current", NOW);

    store.resume("batch-current", NOW);

    expect(store.getBatch("batch-current")?.manualOverride).toBe("force-open");
    expect(store.effectiveStatus("batch-current", NOW)).toBe("open");
  });

  it("creates a new source-versioned flash when a closed batch reopens", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch()]);
    store.close("batch-current", true, NOW);

    store.reopen("batch-current", true, NOW);

    expect(usePortalContentStore().records.find((record) => (
      record.sourceId === "batch-current" && record.sourceVersion === 3
    ))).toMatchObject({ sourceEventType: "recruitment.batch.opened", sourceValidity: "valid" });
  });

  it("reopens a force-open batch as open before its planned start", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance", { requireAdmin: true });
    const store = useRecruitmentBatchStore();
    store.replaceBatches([batch({ startAt: "2026-08-05T00:00:00.000Z" })]);
    store.openNow("batch-current", true, NOW);
    store.close("batch-current", true, NOW);

    store.reopen("batch-current", true, NOW);

    expect(store.getBatch("batch-current")?.manualOverride).toBe("force-open");
    expect(store.effectiveStatus("batch-current", NOW)).toBe("open");
  });
});
