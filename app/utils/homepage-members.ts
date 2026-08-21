import type { PublicPerson } from "../data/people";

export const HOMEPAGE_MEMBER_PUBLIC_IDS = [
  "7f348c64dca58cb8c683e46401b79916", // 徐一鸣：联盟负责人
  "9b20dc18af4c93473ddc40826de0972a", // 郭展良：联盟负责人
  "960ed92955726195b5dbf55c6b0307b5", // 李靖镖：白泽开发中心部长
] as const;

const POSITION_LABELS: Record<string, string> = {
  ALLIANCE_OWNER: "联盟负责人",
  CENTER_MINISTER: "部长",
  PROJECT_LEAD: "项目负责人",
};

export interface HomepageMemberCard {
  id: string;
  name: string;
  centerName: string;
  grade: string;
  summary: string;
  avatarUrl?: string;
}

export function selectHomepageMembers(
  people: readonly PublicPerson[],
  limit = 3,
): HomepageMemberCard[] {
  const allowedIds = new Set<string>(HOMEPAGE_MEMBER_PUBLIC_IDS.slice(0, Math.max(0, limit)));
  const byId = new Map(people.map((person) => [person.id, person]));
  return HOMEPAGE_MEMBER_PUBLIC_IDS
    .slice(0, Math.max(0, limit))
    .map((id) => byId.get(id))
    .filter((person): person is PublicPerson => Boolean(person && allowedIds.has(person.id)))
    .map((person) => ({
      id: person.id,
      name: person.name,
      centerName: person.centerName,
      grade: person.grade ?? "",
      summary: `${person.positions?.map((position) => POSITION_LABELS[position] ?? position).filter(Boolean).join(" · ") || person.memberDuty} · ${person.centerName}`,
      ...(person.avatarVisible ? { avatarUrl: person.avatarUrl } : {}),
    }));
}
