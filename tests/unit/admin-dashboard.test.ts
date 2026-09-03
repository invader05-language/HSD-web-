import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { dashboardTargetToRoute } from "../../app/utils/admin-dashboard-routes";
import {
  createMockDashboardGateway,
  selectOperatingRecruitmentBatch,
} from "../../app/services/admin-dashboard/mock-dashboard.gateway";
import { ApiDashboardGateway } from "../../app/services/admin-dashboard/api-dashboard.gateway";
import type { AdminDashboardSnapshot } from "../../app/types/admin-dashboard";
import { useSessionStore } from "../../app/stores/session";
import { useRecruitmentBatchStore } from "../../app/stores/recruitment-batch";
import { useRecruitmentAssessmentStore } from "../../app/stores/recruitment-assessment";
import { usePortalContentStore } from "../../app/stores/portal-content";
import { usePortalConfigStore } from "../../app/stores/portal-config";
import { useActivitiesStore } from "../../app/stores/activities";
import { useAdminDashboard } from "../../app/composables/useAdminDashboard";
import type { RecruitmentAssessmentBatchState } from "../../app/stores/recruitment-assessment";
import { readFileSync } from "node:fs";
import { isAdminDashboardSnapshot } from "../../app/services/admin-dashboard/api-dashboard.gateway";

const now = new Date("2026-08-05T08:00:00.000Z");

function createSnapshot(): AdminDashboardSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    timezone: "Asia/Shanghai",
    operator: {
      id: "admin-alliance",
      name: "张同学",
      level: "owner",
      capabilities: ["content.publish", "portal.configure"],
    },
    metrics: [],
    tasks: [],
    recruitment: null,
    content: { inReview: 0, pendingPublication: 0, recent: [] },
    portal: { draftRevision: 1, publishedRevision: 1, isDirty: false },
    media: { total: 0, processing: 0, failed: 0, reviewPending: 0 },
    warnings: [],
  };
}

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

describe("admin dashboard targets", () => {
  it("maps batch-aware recruitment targets without accepting arbitrary URLs", () => {
    expect(dashboardTargetToRoute({
      module: "recruitment",
      action: "assess",
      resourceType: "batch",
      resourceId: "batch-current",
    })).toBe("/admin/recruitment/batches/batch-current/assessment");
    expect(dashboardTargetToRoute({ module: "content", action: "review" })).toBe(
      "/admin/content?status=待审核",
    );
    expect(dashboardTargetToRoute({ module: "content", action: "publish" })).toBe(
      "/admin/content?status=待发布",
    );
    expect(dashboardTargetToRoute({
      module: "content",
      action: "view",
      resourceType: "content",
      resourceId: "flash-recruitment-2026",
    })).toBe("/admin/content/flash-recruitment-2026");
    expect(dashboardTargetToRoute({ module: "portal", action: "configure" })).toBe(
      "/admin/content/home",
    );
    expect(dashboardTargetToRoute({ module: "media", action: "health" })).toBe("/admin");
  });

  it("fails resource-less production assessment and publication actions closed to the batch list", () => {
    expect(dashboardTargetToRoute(
      { module: "recruitment", action: "assess" },
      { useMockApi: false },
    )).toBe("/admin/recruitment/batches");
    expect(dashboardTargetToRoute(
      { module: "recruitment", action: "publish-results" },
      { useMockApi: false },
    )).toBe("/admin/recruitment/batches");
    expect(dashboardTargetToRoute(
      { module: "recruitment", action: "assess" },
      { useMockApi: true },
    )).toBe("/admin/recruitment/batches");
  });
});

describe("mock dashboard gateway", () => {
  it("keeps center administrators within their supported capabilities and tasks", async () => {
    useSessionStore().signIn("media-admin", { requireAdmin: true });

    const snapshot = await createMockDashboardGateway().getSnapshot({ now });

    expect(snapshot.operator.capabilities).toEqual([
      "recruitment.assessment.edit",
      "content.create",
      "content.submit_review",
    ]);
    expect(snapshot.tasks.every((task) => !task.capability || snapshot.operator.capabilities.includes(task.capability))).toBe(true);
    expect(snapshot.tasks.map((task) => task.target.action)).not.toContain("publish-results");
    expect(snapshot.content.inReview).toBe(0);
    expect(snapshot.content.recent).toHaveLength(0);
    expect(snapshot.warnings).toHaveLength(0);
    expect(snapshot.media.total).toBeLessThan(5);
    expect(snapshot.portal).toBeNull();
  });

  it("scopes center-visible content and assessment records to the current center", async () => {
    useSessionStore().signIn("media-admin", { requireAdmin: true });
    const content = usePortalContentStore();
    content.records.push(
      { ...content.records[0]!, id: "owned-content", createdBy: "media-admin", status: "in-review", publishedState: "unpublished" },
      { ...content.records[0]!, id: "foreign-content", createdBy: "admin-alliance", status: "in-review", publishedState: "unpublished" },
    );
    useRecruitmentAssessmentStore().batches["batch-current"] = {
      batchId: "batch-current",
      batchVersion: 1,
      version: 1,
      currentRound: 1,
      status: "assessing",
      records: [
        {
          batchId: "batch-current",
          candidateId: "media-candidate",
          memberId: "media-member",
          center: "新媒体中心",
          acceptsAdjustment: true,
          roundOutcomes: { 1: "pending" },
        },
        {
          batchId: "batch-current",
          candidateId: "other-candidate",
          memberId: "other-member",
          center: "白泽开发中心",
          acceptsAdjustment: true,
          roundOutcomes: { 1: "pending" },
        },
      ],
      auditRecords: [],
    } satisfies RecruitmentAssessmentBatchState;

    const snapshot = await createMockDashboardGateway().getSnapshot({ now });

    expect(snapshot.content.recent.map((record) => record.id)).toContain("owned-content");
    expect(snapshot.content.recent.map((record) => record.id)).not.toContain("foreign-content");
    expect(snapshot.recruitment?.assessment).toMatchObject({ total: 1, pending: 1 });
  });

  it("does not initialize assessment state while deriving a dashboard snapshot", async () => {
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const assessment = useRecruitmentAssessmentStore();

    await createMockDashboardGateway().getSnapshot({ now });

    expect(Object.keys(assessment.batches)).toHaveLength(0);
  });

  it("routes the first actionable task instead of always sending work to recruitment", async () => {
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    const content = usePortalContentStore();
    content.records.push({
      ...content.records[0]!,
      id: "content-review-only",
      status: "in-review",
      publishedState: "unpublished",
    });
    useRecruitmentBatchStore().batches.forEach((batch) => { batch.lifecycleStatus = "archived"; });

    const snapshot = await createMockDashboardGateway().getSnapshot({ now });

    expect(snapshot.metrics.find((metric) => metric.id === "my-work")?.target).toMatchObject({
      module: "content",
      action: "review",
    });
  });

  it("selects an open or paused batch before unfinished closed work and an upcoming batch", () => {
    const batches = useRecruitmentBatchStore().batches;
    const selected = selectOperatingRecruitmentBatch(batches, () => ({
      pending: 1,
      canPublish: false,
    }), now);
    expect(selected).toMatchObject({ batch: { id: "batch-current" }, reason: "open" });

    batches.find((batch) => batch.id === "batch-current")!.manualOverride = "force-closed";
    const closed = selectOperatingRecruitmentBatch(batches, (batchId) => ({
      pending: batchId === "batch-closed" ? 1 : 0,
      canPublish: false,
    }), now);
    expect(closed).toMatchObject({ batch: { id: "batch-closed" }, reason: "unfinished-work" });

    const upcoming = selectOperatingRecruitmentBatch(batches, () => ({ pending: 0, canPublish: false }), now);
    expect(upcoming).toMatchObject({ batch: { id: "batch-next" }, reason: "upcoming" });
  });

  it("aggregates automation and persistence failures into actionable warnings", async () => {
    useSessionStore().signIn("admin-alliance", { requireAdmin: true });
    useRecruitmentBatchStore().automationFailures.push({
      batchId: "batch-current",
      errorCode: "AUTOMATION_FAILED",
      automationKey: "batch-key",
    });
    usePortalContentStore().persistenceError = "PORTAL_CONTENT_PERSISTENCE_FAILED";
    usePortalConfigStore().persistenceError = "PORTAL_CONFIG_STORAGE_UNAVAILABLE";
    useActivitiesStore().automationFailures.push({
      activityId: "harmonyos-salon",
      errorCode: "AUTOMATION_FAILED",
      automationKey: "activity-key",
    });

    const snapshot = await createMockDashboardGateway().getSnapshot({ now });

    expect(snapshot.warnings.map((warning) => warning.code)).toEqual([
      "RECRUITMENT_AUTOMATION_FAILURE",
      "ACTIVITY_AUTOMATION_FAILURE",
      "PORTAL_CONTENT_PERSISTENCE_FAILED",
      "PORTAL_CONFIG_STORAGE_UNAVAILABLE",
    ]);
  });
});

describe("API dashboard gateway", () => {
  it("accepts the checked-in owner and center dashboard examples as API contracts", () => {
    const ownerExample = JSON.parse(readFileSync("docs/contracts/examples/admin-dashboard-owner.json", "utf8"));
    const centerExample = JSON.parse(readFileSync("docs/contracts/examples/admin-dashboard-center-admin.json", "utf8"));

    expect(isAdminDashboardSnapshot(ownerExample)).toBe(true);
    expect(isAdminDashboardSnapshot(centerExample)).toBe(true);
  });

  it("requires portal visibility to follow portal capabilities", () => {
    const noPortalCapability = createSnapshot() as AdminDashboardSnapshot & {
      operator: { capabilities: string[] };
      portal: unknown;
    };
    noPortalCapability.operator.capabilities = ["content.publish"];
    expect(isAdminDashboardSnapshot(noPortalCapability)).toBe(false);

    noPortalCapability.portal = null;
    expect(isAdminDashboardSnapshot(noPortalCapability)).toBe(true);
  });

  it("accepts an authoritative empty portal summary before any revision exists", () => {
    const emptyPortal = createSnapshot();
    emptyPortal.portal = { draftRevision: 0, publishedRevision: 0, isDirty: false };

    expect(isAdminDashboardSnapshot(emptyPortal)).toBe(true);
  });

  it("rejects an invalid API response instead of treating it as a dashboard snapshot", async () => {
    const gateway = new ApiDashboardGateway(async () => ({ schemaVersion: 1 }));

    await expect(gateway.getSnapshot()).rejects.toThrow("ADMIN_DASHBOARD_API_INVALID_RESPONSE");
  });

  it("rejects malformed nested API data before the page can dereference it", async () => {
    const malformedRecruitment = createSnapshot() as AdminDashboardSnapshot & { recruitment: unknown };
    malformedRecruitment.recruitment = {};
    const malformedRecent = createSnapshot() as AdminDashboardSnapshot & { content: { recent: unknown[] } };
    malformedRecent.content.recent = [{}];

    await expect(new ApiDashboardGateway(async () => malformedRecruitment).getSnapshot())
      .rejects.toThrow("ADMIN_DASHBOARD_API_INVALID_RESPONSE");
    await expect(new ApiDashboardGateway(async () => malformedRecent).getSnapshot())
      .rejects.toThrow("ADMIN_DASHBOARD_API_INVALID_RESPONSE");
  });

  it("rejects non-UTC timestamps, fractional counters, invalid optional types, and invalid revisions", async () => {
    const malformedSnapshots: unknown[] = [];
    const localTimestamp = createSnapshot();
    localTimestamp.generatedAt = "2026-08-05T15:00:00+08:00";
    malformedSnapshots.push(localTimestamp);

    const fractionalCounter = createSnapshot();
    (fractionalCounter as unknown as { metrics: Array<{ value: number }> }).metrics = [{
      id: "metric",
      label: "bad",
      value: 1.5,
      target: { module: "media", action: "health" },
    }];
    malformedSnapshots.push(fractionalCounter);

    const invalidTarget = createSnapshot();
    (invalidTarget as unknown as { metrics: Array<{ target: unknown }> }).metrics = [{
      id: "metric",
      label: "bad",
      value: 1,
      target: { module: "media", action: "health", resourceId: 42 },
    }];
    malformedSnapshots.push(invalidTarget);

    const invalidTaskCapability = createSnapshot();
    (invalidTaskCapability as unknown as { tasks: unknown[] }).tasks = [{
      id: "task",
      title: "bad",
      priority: "urgent",
      capability: "admin.superpower",
      target: { module: "media", action: "health" },
    }];
    malformedSnapshots.push(invalidTaskCapability);

    const invalidAction = createSnapshot();
    (invalidAction as unknown as { metrics: unknown[] }).metrics = [{
      id: "metric",
      label: "bad",
      value: 1,
      target: { module: "media", action: "unknown" },
    }];
    malformedSnapshots.push(invalidAction);

    const unauthorizedTaskCapability = createSnapshot();
    (unauthorizedTaskCapability as unknown as { tasks: unknown[] }).tasks = [{
      id: "task",
      title: "bad",
      priority: "urgent",
      capability: "content.review",
      target: { module: "media", action: "health" },
    }];
    malformedSnapshots.push(unauthorizedTaskCapability);

    const invalidRevision = createSnapshot();
    invalidRevision.portal.draftRevision = -1;
    malformedSnapshots.push(invalidRevision);

    for (const malformed of malformedSnapshots) {
      await expect(new ApiDashboardGateway(async () => malformed).getSnapshot())
        .rejects.toThrow("ADMIN_DASHBOARD_API_INVALID_RESPONSE");
    }
  });

  it("clears a previously loaded snapshot when refresh fails", async () => {
    let shouldFail = false;
    const expected = createSnapshot();
    const dashboard = useAdminDashboard({
      gateway: {
        async getSnapshot() {
          if (shouldFail) throw new Error("network unavailable");
          return expected;
        },
      },
    });

    await dashboard.refresh();
    expect(dashboard.snapshot.value).toEqual(expected);
    shouldFail = true;
    await dashboard.refresh();
    expect(dashboard.snapshot.value).toBeUndefined();
    expect(dashboard.error.value?.message).toBe("network unavailable");
  });

  it("propagates API failures without falling back to mock data", async () => {
    const gateway = new ApiDashboardGateway(async () => {
      throw new Error("network unavailable");
    });

    await expect(gateway.getSnapshot()).rejects.toThrow("network unavailable");
  });

  it("returns a validated API snapshot", async () => {
    const expected = createSnapshot();
    const gateway = new ApiDashboardGateway(async (path, options) => {
      expect(path).toBe("/api/v1/admin/dashboard");
      expect(options).toEqual({ method: "GET" });
      return expected;
    });

    await expect(gateway.getSnapshot()).resolves.toEqual(expected);
  });
});
