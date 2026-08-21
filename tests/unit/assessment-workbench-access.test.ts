import { describe, expect, it } from "vitest";
import {
  canEditAssessmentCandidate,
  canPublishAssessmentBatch,
} from "../../app/utils/assessment-workbench-access";

describe("assessment workbench production authorization", () => {
  it("uses the live assessment capability in API mode instead of Mock center-role fixtures", () => {
    expect(canEditAssessmentCandidate({
      apiMode: true,
      canAccessAdmin: true,
      adminLevel: "admin",
      hasCapability: (capability) => capability === "recruitment.assessment.edit",
      adminCenterRole: undefined,
      candidateCenter: "新媒体中心",
    })).toBe(true);
    expect(canEditAssessmentCandidate({
      apiMode: true,
      canAccessAdmin: true,
      adminLevel: "admin",
      hasCapability: () => false,
      adminCenterRole: "新媒体中心负责人",
      candidateCenter: "新媒体中心",
    })).toBe(false);
  });

  it("preserves the center-role fixture boundary only in explicit Mock mode", () => {
    expect(canEditAssessmentCandidate({
      apiMode: false,
      canAccessAdmin: true,
      adminLevel: "admin",
      hasCapability: () => false,
      adminCenterRole: "新媒体中心负责人",
      candidateCenter: "新媒体中心",
    })).toBe(true);
  });

  it("requires the live publication capability in API mode", () => {
    expect(canPublishAssessmentBatch({
      apiMode: true,
      canManageAdminAccounts: true,
      hasCapability: (capability) => capability === "recruitment.result.publish",
    })).toBe(true);
    expect(canPublishAssessmentBatch({
      apiMode: true,
      canManageAdminAccounts: true,
      hasCapability: () => false,
    })).toBe(false);
    expect(canPublishAssessmentBatch({
      apiMode: false,
      canManageAdminAccounts: true,
      hasCapability: () => false,
    })).toBe(true);
  });
});
