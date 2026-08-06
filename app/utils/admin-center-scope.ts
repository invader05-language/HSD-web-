import { RECRUITMENT_CENTERS, type RecruitmentCenter } from "../data/recruitment-application";

const CENTER_IDS: Record<RecruitmentCenter, string> = {
  "白泽开发中心": "baize-development",
  "新媒体中心": "new-media",
  "拓维策划中心": "tuowei-planning",
  "人才发展中心": "talent-development",
};

export function getAdminCenterScope(centerRole?: string | null): RecruitmentCenter | undefined {
  return RECRUITMENT_CENTERS.find((center) => centerRole === `${center}负责人`);
}

export function getRecruitmentCenterId(center: RecruitmentCenter): string {
  return CENTER_IDS[center];
}

export function canAccessRecruitmentCandidate(
  candidate: Pick<{ preferences: readonly (RecruitmentCenter | undefined)[] }, "preferences">,
  centerScope?: RecruitmentCenter,
): boolean {
  return !centerScope || candidate.preferences[0] === centerScope;
}

export function canAccessPortalContent(
  record: Pick<{ createdBy: string }, "createdBy">,
  operator: { operatorId?: string; centerRole?: string | null },
): boolean {
  const centerScope = getAdminCenterScope(operator.centerRole);
  return !centerScope || record.createdBy === operator.operatorId;
}
