export const ORGANIZATION_POSITION_LABELS = {
  ALLIANCE_OWNER: "联盟负责人",
  CENTER_MINISTER: "部长",
  PROJECT_LEAD: "项目负责人",
} as const;

export type OrganizationPositionType = keyof typeof ORGANIZATION_POSITION_LABELS;

export function getOrganizationPositionLabel(position: OrganizationPositionType): string {
  return ORGANIZATION_POSITION_LABELS[position];
}
