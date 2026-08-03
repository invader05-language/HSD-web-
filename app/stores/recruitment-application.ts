import { defineStore } from "pinia";
import {
  cloneRecruitmentApplicationDraft,
  createRecruitmentApplicationDraft,
  PREPARATORY_MEMBER_STATUS,
  type RecruitmentApplicationDraft,
  type RegistrationProfileDraft,
  type RecruitmentCenter,
  type SubmittedRecruitmentApplication,
} from "../data/recruitment-application";
import { useMemberProfileStore } from "./member-profile";
import { useSessionStore } from "./session";
import {
  validateApplicationDraft,
  validateConfirmation,
  validateRegistrationStep,
} from "../utils/recruitment-application-form";

export const useRecruitmentApplicationStore = defineStore("recruitment-application", {
  state: () => ({
    applicationsByMemberId: {} as Record<string, SubmittedRecruitmentApplication>,
  }),
  getters: {
    submittedApplication(state): SubmittedRecruitmentApplication | undefined {
      return state.applicationsByMemberId[useSessionStore().currentMemberId];
    },
    isSubmitted(): boolean {
      return Boolean(this.submittedApplication);
    },
    memberStatus(state) {
      return state.applicationsByMemberId[useSessionStore().currentMemberId]
        ? PREPARATORY_MEMBER_STATUS
        : undefined;
    },
  },
  actions: {
    createDraft(): RecruitmentApplicationDraft {
      return createRecruitmentApplicationDraft();
    },
    cloneDraft(draft: RecruitmentApplicationDraft): RecruitmentApplicationDraft {
      return cloneRecruitmentApplicationDraft(draft);
    },
    setFirstChoice(draft: RecruitmentApplicationDraft, firstChoice?: RecruitmentCenter) {
      draft.firstChoice = firstChoice;
      if (firstChoice !== "白泽开发中心") draft.baizeDirection = undefined;
    },
    submitApplication(
      profileDraft: RegistrationProfileDraft,
      applicationDraft: RecruitmentApplicationDraft,
      confirmed: boolean,
    ) {
      const session = useSessionStore();
      if (this.applicationsByMemberId[session.currentMemberId]) {
        throw new Error("当前账号已提交报名，请勿重复提交。");
      }
      const profileStore = useMemberProfileStore();
      const currentProfile = profileStore.getProfile(session.currentMemberId);
      if (currentProfile.identity !== "预备成员") {
        throw new Error("仅预备成员账号可提交招新报名。");
      }
      const errors = {
        ...validateRegistrationStep(profileDraft, applicationDraft),
        ...validateApplicationDraft(applicationDraft),
        ...validateConfirmation(confirmed),
      };
      if (Object.keys(errors).length) {
        throw new Error("报名信息校验失败，请检查后重试。");
      }
      const firstChoice = applicationDraft.firstChoice;
      const acceptsAdjustment = applicationDraft.acceptsAdjustment;
      if (!firstChoice || acceptsAdjustment === undefined) {
        throw new Error("报名信息校验失败，请检查后重试。");
      }

      profileStore.registerProfile(session.currentMemberId, profileDraft);
      this.applicationsByMemberId[session.currentMemberId] = {
        memberId: session.currentMemberId,
        contact: applicationDraft.contact.trim(),
        firstChoice,
        secondChoice: applicationDraft.secondChoice,
        thirdChoice: applicationDraft.thirdChoice,
        baizeDirection: applicationDraft.baizeDirection,
        acceptsAdjustment,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      };
    },
  },
});
