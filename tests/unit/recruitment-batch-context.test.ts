import { describe, expect, it } from "vitest";
import {
  buildRecruitmentBatchRoute,
  buildRecruitmentBatchSectionRoute,
  filterAdminCandidatesByBatch,
  canManageRecruitmentBatch,
  createRecruitmentLifecycleAudit,
  type RecruitmentBatchAdminActor
} from "../../app/data/recruitment-admin-context";
import type { AdminCandidate } from "../../app/data/recruitment-admin";

const candidate = (id: string, batchId: string): AdminCandidate & { batchId: string } => ({
  id,
  batchId,
  name: id,
  studentId: id,
  grade: "2026 级",
  className: "软件工程 1 班",
  contact: `${id}@example.com`,
  identity: "预备成员",
  preferences: ["新媒体中心"],
  acceptsAdjustment: true,
  stage: "面试",
  result: "待公布",
  submittedAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01 08:00"
});

describe("admin recruitment batch context", () => {
  it("builds stable batch-scoped routes for overview and workflow sections", () => {
    expect(buildRecruitmentBatchRoute("2026-autumn")).toBe(
      "/admin/recruitment/batches/2026-autumn"
    );
    expect(buildRecruitmentBatchSectionRoute("2026-autumn", "applications")).toBe(
      "/admin/recruitment/batches/2026-autumn/applications"
    );
    expect(buildRecruitmentBatchSectionRoute("2026-autumn", "assessment")).toBe(
      "/admin/recruitment/batches/2026-autumn/assessment"
    );
    expect(buildRecruitmentBatchSectionRoute("2026-autumn", "publish")).toBe(
      "/admin/recruitment/batches/2026-autumn/publish"
    );
  });

  it("keeps roster records isolated to the requested batch id", () => {
    const records = [candidate("current-lin", "2026-autumn"), candidate("old-chen", "2025-autumn")];

    expect(filterAdminCandidatesByBatch(records, "2026-autumn").map((item) => item.id)).toEqual([
      "current-lin"
    ]);
    expect(filterAdminCandidatesByBatch(records, "2025-autumn").map((item) => item.id)).toEqual([
      "old-chen"
    ]);
  });

  it("allows lifecycle mutations only for the authenticated owner", () => {
    const owner: RecruitmentBatchAdminActor = {
      account: "admin-alliance",
      name: "张同学",
      level: "owner"
    };
    const admin: RecruitmentBatchAdminActor = {
      account: "media-admin",
      name: "李同学",
      level: "admin"
    };

    expect(canManageRecruitmentBatch(owner)).toBe(true);
    expect(canManageRecruitmentBatch(admin)).toBe(false);
  });

  it("records early-open audit context including original plan, actor and actual time", () => {
    const audit = createRecruitmentLifecycleAudit({
      action: "open-now",
      actor: {
        account: "admin-alliance",
        name: "张同学",
        level: "owner"
      },
      originalStartAt: "2026-08-20T00:00:00.000Z",
      actualAt: "2026-08-04T08:30:00.000Z",
      before: "待开始",
      after: "报名中",
      reason: "应业务负责人要求提前开放"
    });

    expect(audit).toMatchObject({
      action: "open-now",
      actor: "张同学",
      originalStartAt: "2026-08-20T00:00:00.000Z",
      actualAt: "2026-08-04T08:30:00.000Z",
      before: "待开始",
      after: "报名中",
      reason: "应业务负责人要求提前开放"
    });
  });
});
