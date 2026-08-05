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
