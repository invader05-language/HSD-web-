import type { RecruitmentBatch } from "../types/recruitment-batch";

export const RECRUITMENT_BATCHES: RecruitmentBatch[] = [
  {
    id: "batch-current",
    name: "2026 秋季招新",
    startAt: "2026-08-01T00:00:00.000Z",
    endAt: "2026-09-18T00:00:00.000Z",
    timezone: "Asia/Shanghai",
    openCenterIds: [
      "baize-development",
      "new-media",
      "tuowei-planning",
      "talent-development",
    ],
    responsibleAccountIds: ["admin-alliance"],
    lifecycleStatus: "published",
    manualOverride: "none",
    version: 1,
    publishedAt: "2026-07-30T00:00:00.000Z",
    createdAt: "2026-07-29T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
  },
  {
    id: "batch-next",
    name: "2027 春季补招",
    startAt: "2027-02-01T00:00:00.000Z",
    endAt: "2027-03-01T00:00:00.000Z",
    timezone: "Asia/Shanghai",
    openCenterIds: ["new-media", "tuowei-planning", "talent-development"],
    responsibleAccountIds: ["admin-alliance"],
    lifecycleStatus: "published",
    manualOverride: "none",
    version: 1,
    publishedAt: "2026-12-15T00:00:00.000Z",
    createdAt: "2026-12-14T00:00:00.000Z",
    updatedAt: "2026-12-15T00:00:00.000Z",
  },
  {
    id: "batch-closed",
    name: "2025 秋季招新",
    startAt: "2025-08-22T00:00:00.000Z",
    endAt: "2025-09-20T00:00:00.000Z",
    timezone: "Asia/Shanghai",
    openCenterIds: [
      "baize-development",
      "new-media",
      "tuowei-planning",
      "talent-development",
    ],
    responsibleAccountIds: ["admin-alliance"],
    lifecycleStatus: "closed",
    manualOverride: "force-closed",
    version: 3,
    publishedAt: "2025-08-01T00:00:00.000Z",
    closedAt: "2025-09-20T00:00:00.000Z",
    createdAt: "2025-07-30T00:00:00.000Z",
    updatedAt: "2025-09-20T00:00:00.000Z",
  },
];

export function cloneRecruitmentBatches(
  batches: readonly RecruitmentBatch[] = RECRUITMENT_BATCHES,
): RecruitmentBatch[] {
  return batches.map((batch) => ({
    ...batch,
    openCenterIds: [...batch.openCenterIds],
    responsibleAccountIds: [...batch.responsibleAccountIds],
  }));
}
