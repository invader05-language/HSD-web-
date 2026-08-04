import type {
  RecruitmentBatch,
  RecruitmentBatchStatusResult,
} from "../types/recruitment-batch";

export function getEffectiveRecruitmentBatchStatus(
  batch: RecruitmentBatch,
  now: Date = new Date(),
): RecruitmentBatchStatusResult {
  if (batch.lifecycleStatus === "draft") {
    return { status: "draft", reason: "draft" };
  }

  if (batch.lifecycleStatus === "archived") {
    return { status: "archived", reason: "archived" };
  }

  if (batch.manualOverride === "paused") {
    return { status: "paused", reason: "paused" };
  }

  if (batch.manualOverride === "force-closed") {
    return { status: "closed", reason: "force-closed" };
  }

  if (batch.lifecycleStatus === "closed") {
    return { status: "closed", reason: "after-end" };
  }

  if (batch.manualOverride === "force-open") {
    return { status: "open", reason: "force-open" };
  }

  const timestamp = now.getTime();
  const start = Date.parse(batch.startAt);
  const end = Date.parse(batch.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { status: "closed", reason: "after-end" };
  }
  if (timestamp < start) return { status: "upcoming", reason: "before-start" };
  if (timestamp >= end) return { status: "closed", reason: "after-end" };
  return { status: "open", reason: "within-window" };
}

export function getCurrentOpenBatch(
  batches: readonly RecruitmentBatch[],
  now: Date = new Date(),
): RecruitmentBatch | undefined {
  const open = batches.filter((batch) => (
    getEffectiveRecruitmentBatchStatus(batch, now).status === "open"
  ));
  if (open.length > 1) throw new Error("BATCH_ALREADY_OPEN");
  return open[0];
}

export function getUpcomingRecruitmentBatch(
  batches: readonly RecruitmentBatch[],
  now: Date = new Date(),
): RecruitmentBatch | undefined {
  return batches
    .filter((batch) => getEffectiveRecruitmentBatchStatus(batch, now).status === "upcoming")
    .slice()
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt))[0];
}
