import { computed } from "vue";
import type { MemberProfilePatch } from "../data/member-profile";
import { useMemberProfileStore } from "../stores/member-profile";
import { useSessionStore } from "../stores/session";

export function useCurrentMember() {
  const session = useSessionStore();
  const profileStore = useMemberProfileStore();
  const profile = computed(() => profileStore.getProfile(session.currentMemberId));

  return {
    session,
    profileStore,
    profile,
    createDraft: () => profileStore.createDraft(session.currentMemberId),
    updateProfile: (patch: MemberProfilePatch) =>
      profileStore.updateProfile(session.currentMemberId, patch),
  };
}
