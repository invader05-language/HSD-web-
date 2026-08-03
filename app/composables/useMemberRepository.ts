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

export function useMemberRepository() {
  const { profile: currentProfile } = useCurrentMember();
  const profileStore = useMemberProfileStore();
  const formalProfiles = computed(() =>
    Object.values(profileStore.profiles).filter(isFormalMemberProfile)
  );
  const allPublicPeople = computed<readonly PublicPerson[]>(() => {
    const staticPeople = [...CORE_PEOPLE, ...PUBLIC_MEMBERS];
    const projectedStaticPeople = staticPeople.map((person) => {
      const profile = formalProfiles.value.find((item) => item.publicId === person.id);
      return profile ? projectMemberToPublic(profile, person) : person;
    });
    const staticIds = new Set(staticPeople.map((person) => person.id));
    const newFormalPeople = formalProfiles.value
      .filter((profile) => !staticIds.has(profile.publicId))
      .map((profile) => projectMemberToPublic(profile));

    return [...projectedStaticPeople, ...newFormalPeople];
  });
  const publicCorePeople = computed(() =>
    allPublicPeople.value.filter((person) => person.isCore)
  );
  const publicMembers = computed(() =>
    allPublicPeople.value.filter((person) => !person.isCore)
  );
  const adminMembers = computed(() =>
    ADMIN_MEMBERS.map((member) => {
      const profile = formalProfiles.value.find((item) => item.id === member.id);
      return profile ? projectMemberToAdmin(profile, member) : member;
    })
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
