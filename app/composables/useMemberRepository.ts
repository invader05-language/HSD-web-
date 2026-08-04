import { computed } from "vue";
import { ADMIN_MEMBERS, type AdminMember } from "../data/admin-members";
import {
  CORE_PEOPLE,
  findStaticPublicPersonForMember,
  getStaticMemberIdForPublicPerson,
  getStaticPublicIdForMember,
  PUBLIC_MEMBERS,
  type PublicPerson,
} from "../data/people";
import {
  isFormalMemberProfile,
  projectMemberToAdmin,
  projectMemberToPublic,
} from "../data/member-profile";
import { useCurrentMember } from "./useCurrentMember";
import { useMemberProfileStore } from "../stores/member-profile";
import { useAdminAccessStore } from "../stores/admin-access";
import { getCenterSlug } from "../utils/member-account-form";

function deriveAdminMemberCoreState(member: AdminMember): AdminMember {
  const linkedStaticPerson = findStaticPublicPersonForMember(member.id);
  const isCore = member.memberDuty === "核心人员"
    || Boolean(member.centerLeadership)
    || linkedStaticPerson?.memberDuty === "核心人员";

  return {
    ...member,
    memberDuty: isCore ? "核心人员" : "普通成员",
    isCore,
  };
}

export function useMemberRepository() {
  const { profile: currentProfile } = useCurrentMember();
  const profileStore = useMemberProfileStore();
  const adminAccessStore = useAdminAccessStore();
  const storedProfiles = computed(() => Object.values(profileStore.profiles));
  const formalProfiles = computed(() =>
    storedProfiles.value.filter(isFormalMemberProfile)
  );
  const adminMembers = computed(() => {
    const addCenterLeadership = (member: AdminMember): AdminMember => {
      const qualification = adminAccessStore.accounts.find((account) => (
        account.memberId === member.id
        && account.adminLevel === "admin"
        && account.adminAccessEnabled
        && account.adminCenterRole
      ));
      const qualifiedMember = {
        ...member,
        centerLeadership: qualification?.adminCenterRole,
      };
      if (!qualifiedMember.centerLeadership) delete qualifiedMember.centerLeadership;

      return qualifiedMember;
    };

    const staticMembers = ADMIN_MEMBERS.map((member) => {
      const qualifiedMember = addCenterLeadership(member);

      const profile = formalProfiles.value.find((item) => item.id === member.id);
      return deriveAdminMemberCoreState(
        profile ? projectMemberToAdmin(profile, qualifiedMember) : qualifiedMember,
      );
    });
    const staticMemberIds = new Set(ADMIN_MEMBERS.map((member) => member.id));
    const createdMembers = formalProfiles.value
      .filter((profile) => !staticMemberIds.has(profile.id))
      .map((profile) => deriveAdminMemberCoreState(projectMemberToAdmin(profile, addCenterLeadership({
          id: profile.id,
          name: profile.name,
          studentId: profile.studentId,
          center: profile.center as AdminMember["center"],
          identity: "正式成员",
          grade: profile.grade,
          memberDuty: profile.memberDuty,
          ...(profile.baizeDirection ? { baizeDirection: profile.baizeDirection } : {}),
          avatarUrl: profile.avatarUrl ?? null,
          profileSummary: profile.bio,
          updatedAt: "刚刚更新",
        }))));

    return [...staticMembers, ...createdMembers];
  });
  const allPublicPeople = computed<readonly PublicPerson[]>(() => {
    const staticPeople = [...CORE_PEOPLE, ...PUBLIC_MEMBERS];
    const projectedStaticPeople = staticPeople.flatMap((person) => {
      const linkedMemberId = getStaticMemberIdForPublicPerson(person.id);
      const storedProfile = linkedMemberId
        ? storedProfiles.value.find((item) => item.id === linkedMemberId)
        : storedProfiles.value.find((item) => item.publicId === person.id);
      if (!storedProfile) {
        const linkedAdminMember = linkedMemberId
          ? adminMembers.value.find((member) => member.id === linkedMemberId)
          : undefined;

        const isCore = linkedAdminMember?.isCore ?? person.memberDuty === "核心人员";
        return [{
          ...person,
          memberDuty: isCore ? ("核心人员" as const) : ("普通成员" as const),
          isCore,
        }];
      }
      if (!isFormalMemberProfile(storedProfile)) return [];
      const adminMember = adminMembers.value.find((item) => item.id === storedProfile.id);
      return [projectMemberToPublic(
        { ...storedProfile, publicId: person.id },
        person,
        adminMember?.centerLeadership,
        adminMember?.isCore,
      )];
    });
    const staticIds = new Set(staticPeople.map((person) => person.id));
    const newFormalPeople = formalProfiles.value
      .filter((profile) => (
        !staticIds.has(profile.publicId)
        && !getStaticPublicIdForMember(profile.id)
      ))
      .map((profile) => {
        const adminMember = adminMembers.value.find((item) => item.id === profile.id);
        return projectMemberToPublic(
          profile,
          undefined,
          adminMember?.centerLeadership,
          adminMember?.isCore,
        );
      });

    const representedMemberIds = new Set([
      ...formalProfiles.value.map((profile) => profile.id),
      ...staticPeople
        .map((person) => getStaticMemberIdForPublicPerson(person.id))
        .filter((memberId): memberId is string => Boolean(memberId)),
    ]);
    const projectedCenterLeads = adminMembers.value
      .filter((member) => (
        member.identity === "正式成员"
        && Boolean(member.centerLeadership)
        && !representedMemberIds.has(member.id)
      ))
      .map((member): PublicPerson => {
        const base = {
          id: `platform-${member.id}`,
          name: member.name,
          memberDuty: "核心人员" as const,
          centerSlug: getCenterSlug(member.center),
          centerName: member.center,
          bio: member.profileSummary,
          isCore: true,
          order: Number.MAX_SAFE_INTEGER,
          honors: [],
          ...(member.center === "白泽开发中心" && member.baizeDirection
            ? { baizeDirection: member.baizeDirection }
            : {}),
        };

        return member.avatarUrl
          ? { ...base, avatarVisible: true, avatarUrl: member.avatarUrl }
          : { ...base, avatarVisible: false };
      });

    return [...projectedStaticPeople, ...newFormalPeople, ...projectedCenterLeads];
  });
  const publicCorePeople = computed(() =>
    allPublicPeople.value.filter((person) => person.isCore)
  );
  const publicMembers = computed(() =>
    allPublicPeople.value.filter((person) => !person.isCore)
  );

  function findPublicPerson(id: string) {
    return allPublicPeople.value.find((person) => person.id === id);
  }

  function getPeopleByCenter(slug: string) {
    return allPublicPeople.value.filter((person) => person.centerSlug === slug);
  }

  function findAdminMember(id: string) {
    return adminMembers.value.find((member) => member.id === id);
  }

  return {
    currentProfile,
    publicCorePeople,
    publicMembers,
    allPublicPeople,
    adminMembers,
    findPublicPerson,
    getPeopleByCenter,
    findAdminMember,
  };
}
