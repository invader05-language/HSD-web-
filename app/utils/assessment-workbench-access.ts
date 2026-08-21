import type { AdminCenterRole, AdminLevel } from "../data/admin-system";

export interface AssessmentWorkbenchAccessInput {
  apiMode: boolean;
  canAccessAdmin: boolean;
  adminLevel: AdminLevel;
  hasCapability: (capability: string) => boolean;
  adminCenterRole: AdminCenterRole | undefined;
  candidateCenter: string;
}

export function canEditAssessmentCandidate(input: AssessmentWorkbenchAccessInput): boolean {
  if (!input.canAccessAdmin) return false;
  if (input.apiMode) return input.hasCapability("recruitment.assessment.edit");
  return input.adminLevel === "owner"
    || input.adminCenterRole === `${input.candidateCenter}负责人`;
}

export function canPublishAssessmentBatch(input: {
  apiMode: boolean;
  canManageAdminAccounts: boolean;
  hasCapability: (capability: string) => boolean;
}): boolean {
  return input.canManageAdminAccounts
    && (!input.apiMode || input.hasCapability("recruitment.result.publish"));
}
