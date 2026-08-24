import { describe, expect, it } from "vitest";
import {
  buildRecruitmentCompatibilityRoute,
  resolveLegacyRecruitmentBatchId,
} from "../../app/utils/recruitment-compatibility-routes";

describe("legacy recruitment compatibility routes", () => {
  it("does not manufacture a batch identity in production", () => {
    expect(resolveLegacyRecruitmentBatchId(undefined, false)).toBeUndefined();
    expect(resolveLegacyRecruitmentBatchId("batch-current", false)).toBeUndefined();
    expect(resolveLegacyRecruitmentBatchId("real-batch-id", false)).toBe("real-batch-id");
  });

  it("retains the batch-current fixture only in Mock mode", () => {
    expect(resolveLegacyRecruitmentBatchId(undefined, true)).toBe("batch-current");
    expect(resolveLegacyRecruitmentBatchId("batch-current", true)).toBe("batch-current");
  });

  it("routes missing production context to the batch list and known context to a canonical workspace", () => {
    expect(buildRecruitmentCompatibilityRoute("applications", undefined)).toBe(
      "/admin/recruitment/batches",
    );
    expect(buildRecruitmentCompatibilityRoute("assessment", "batch api/1")).toBe(
      "/admin/recruitment/batches/batch%20api%2F1/assessment",
    );
    expect(buildRecruitmentCompatibilityRoute("publish", "batch-2")).toBe(
      "/admin/recruitment/batches/batch-2/publish",
    );
    expect(buildRecruitmentCompatibilityRoute("applications", "batch-3", "candidate/4")).toBe(
      "/admin/recruitment/batches/batch-3/applications/candidate%2F4",
    );
  });
});
