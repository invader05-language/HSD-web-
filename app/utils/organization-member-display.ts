import type { AdminMember } from "../data/admin-members";
import { getOrganizationPositionLabel, type OrganizationPositionType } from "./organization-positions";

export interface OrganizationMemberDisplay {
  dutyLabel: AdminMember["memberDuty"];
  isCore: boolean;
  positionLabels: string[];
}

/**
 * Keep membership grade and organization positions as separate concepts.
 * `centerLeadership` is accepted only for legacy mock fixtures; API records
 * must supply `organizationPositions` from the authoritative center response.
 */
export function describeOrganizationMember(member: AdminMember): OrganizationMemberDisplay {
  const positions: OrganizationPositionType[] = member.organizationPositions
    ?? (member.centerLeadership ? ["CENTER_MINISTER"] : []);
  return {
    dutyLabel: member.memberDuty,
    isCore: member.isCore ?? member.memberDuty === "核心人员",
    positionLabels: positions.map(getOrganizationPositionLabel),
  };
}

export function organizationMemberLabel(member: AdminMember): string {
  const display = describeOrganizationMember(member);
  return [display.dutyLabel, ...display.positionLabels].join(" · ");
}

export function hasOrganizationPosition(member: AdminMember, position: OrganizationPositionType): boolean {
  return (member.organizationPositions ?? (member.centerLeadership ? ["CENTER_MINISTER"] : [])).includes(position);
}
