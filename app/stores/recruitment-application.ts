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
import {
  validateApplicationDraft,
  validateConfirmation,
  validateRegistrationStep,
} from "../utils/recruitment-application-form";

export const useRecruitmentApplicationStore = defineStore("recruitment-application", {
  state: () => ({
    submittedApplication: undefined as SubmittedRecruitmentApplication | undefined,
  }),
  getters: {
    isSubmitted: (state) => Boolean(state.submittedApplication),
    memberStatus(state) {
      return state.submittedApplication
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
      if (this.submittedApplication) throw new Error("当前账号已提交报名，请勿重复提交。");
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

      const profileStore = useMemberProfileStore();
      profileStore.registerOwnProfile(profileDraft);
      this.submittedApplication = {
        memberId: profileStore.currentMember.id,
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
