import { computed } from "vue";
import { ADMIN_MEMBERS } from "../data/admin-members";
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
  const adminMembers = computed(() =>
    ADMIN_MEMBERS.map((member) => {
      const qualification = adminAccessStore.accounts.find((account) => (
        account.memberId === member.id
        && account.adminLevel === "admin"
        && account.adminCenterRole
      ));
      const qualifiedMember = {
        ...member,
        centerLeadership: qualification?.adminCenterRole,
      };
      if (!qualifiedMember.centerLeadership) delete qualifiedMember.centerLeadership;

      const profile = formalProfiles.value.find((item) => item.id === member.id);
      return profile ? projectMemberToAdmin(profile, qualifiedMember) : qualifiedMember;
    })
  );
  const allPublicPeople = computed<readonly PublicPerson[]>(() => {
    const staticPeople = [...CORE_PEOPLE, ...PUBLIC_MEMBERS];
    const projectedStaticPeople = staticPeople.flatMap((person) => {
      const storedProfile = storedProfiles.value.find((item) => item.publicId === person.id);
      if (!storedProfile) return [person];
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
