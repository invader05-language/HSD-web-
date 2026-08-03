import { computed } from "vue";
import { ADMIN_MEMBERS, type AdminMember } from "../data/admin-members";
import {
  CORE_PEOPLE,
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
      return profile ? projectMemberToAdmin(profile, qualifiedMember) : qualifiedMember;
    });
    const staticMemberIds = new Set(ADMIN_MEMBERS.map((member) => member.id));
    const createdMembers = formalProfiles.value
      .filter((profile) => !staticMemberIds.has(profile.id))
      .map((profile) => projectMemberToAdmin(profile, addCenterLeadership({
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
      })));

    return [...staticMembers, ...createdMembers];
  });
  const allPublicPeople = computed<readonly PublicPerson[]>(() => {
    const staticPeople = [...CORE_PEOPLE, ...PUBLIC_MEMBERS];
    const projectedStaticPeople = staticPeople.flatMap((person) => {
      const storedProfile = storedProfiles.value.find((item) => item.publicId === person.id);
      if (!storedProfile) {
        const matchingAdminMembers = adminMembers.value.filter((member) => (
          member.identity === "正式成员"
          && member.name === person.name
          && member.center === person.centerName
        ));
        const centerLeadership = matchingAdminMembers.length === 1
          ? matchingAdminMembers[0]?.centerLeadership
          : undefined;

        return [{
          ...person,
          isCore: person.memberDuty === "核心人员" || Boolean(centerLeadership),
        }];
      }
      if (!isFormalMemberProfile(storedProfile)) return [];
      const adminMember = adminMembers.value.find((item) => item.id === storedProfile.id);
      return [projectMemberToPublic(storedProfile, person, adminMember?.centerLeadership)];
    });
    const staticIds = new Set(staticPeople.map((person) => person.id));
    const newFormalPeople = formalProfiles.value
      .filter((profile) => !staticIds.has(profile.publicId))
      .map((profile) => {
        const adminMember = adminMembers.value.find((item) => item.id === profile.id);
        return projectMemberToPublic(profile, undefined, adminMember?.centerLeadership);
      });

    return [...projectedStaticPeople, ...newFormalPeople];
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
