import { computed } from "vue";
import { ADMIN_MEMBERS } from "~/data/admin-members";
import {
  CORE_PEOPLE,
  PUBLIC_MEMBERS,
  type PublicPerson,
} from "~/data/people";
import {
  projectMemberToAdmin,
  projectMemberToPublic,
} from "~/data/member-profile";
import { useMemberProfileStore } from "~/stores/member-profile";

export function useMemberRepository() {
  const profileStore = useMemberProfileStore();
  const currentProfile = computed(() => profileStore.currentMember);
  const publicCorePeople = computed(() =>
    CORE_PEOPLE.map((person) =>
      person.id === currentProfile.value.publicId
        ? projectMemberToPublic(currentProfile.value, person)
        : person
    )
  );
  const publicMembers = computed(() =>
    PUBLIC_MEMBERS.map((person) =>
      person.id === currentProfile.value.publicId
        ? projectMemberToPublic(currentProfile.value, person)
        : person
    )
  );
  const allPublicPeople = computed<readonly PublicPerson[]>(() => [
    ...publicCorePeople.value,
    ...publicMembers.value,
  ]);
  const adminMembers = computed(() =>
    ADMIN_MEMBERS.map((member) =>
      member.id === currentProfile.value.id
        ? projectMemberToAdmin(currentProfile.value, member)
        : member
    )
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
