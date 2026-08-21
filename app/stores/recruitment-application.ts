import { defineStore } from "pinia";
import {
  cloneRecruitmentApplicationDraft,
  createRecruitmentApplicationDraft,
  PREPARATORY_MEMBER_STATUS,
  type CenterConfigurationSnapshot,
  type RecruitmentApplicationDraft,
  type RegistrationProfileDraft,
  type RecruitmentCenter,
  type RecruitmentPreference,
  type SubmittedRecruitmentApplication,
} from "../data/recruitment-application";
import { useMemberProfileStore } from "./member-profile";
import { useSessionStore } from "./session";
import { useRecruitmentBatchStore } from "./recruitment-batch";
import {
  getCurrentOpenBatch,
  getEffectiveRecruitmentBatchStatus,
} from "../utils/recruitment-batch-rules";
import type { RecruitmentBatch } from "../types/recruitment-batch";
import {
  validateApplicationDraft,
  validateConfirmation,
  validateRegistrationStep,
} from "../utils/recruitment-application-form";

const CENTER_IDS: Record<RecruitmentCenter, string> = {
  "白泽开发中心": "baize-development",
  "新媒体中心": "new-media",
  "拓维策划中心": "tuowei-planning",
  "人才发展中心": "talent-development",
};

type SubmitApplicationOptions = {
  batchId?: string;
  now?: Date;
  allowExistingUpdate?: boolean;
};

function applicationKey(batchId: string, memberId: string): string {
  return `${batchId}::${memberId}`;
}

function isActiveApplication(application: SubmittedRecruitmentApplication | undefined): boolean {
  return Boolean(application && application.status !== "withdrawn");
}

function cloneApplication(application: SubmittedRecruitmentApplication): SubmittedRecruitmentApplication {
  return {
    ...application,
    applicantProfileSnapshot: { ...application.applicantProfileSnapshot },
    preferences: application.preferences.map((preference) => ({ ...preference })),
    centerConfigurationSnapshot: application.centerConfigurationSnapshot.map((center) => ({ ...center })),
  };
}

export type RecruitmentApplicationStoreSnapshot = Record<string, SubmittedRecruitmentApplication>;

function centerConfigurationSnapshot(batch: RecruitmentBatch): CenterConfigurationSnapshot[] {
  return Object.entries(CENTER_IDS).map(([center, id]) => ({
    center: center as RecruitmentCenter,
    availableAtSubmission: batch.openCenterIds.includes(id),
    currentlyAvailable: batch.openCenterIds.includes(id),
  }));
}

function preferencesFromDraft(draft: RecruitmentApplicationDraft): RecruitmentPreference[] {
  return [draft.firstChoice, draft.secondChoice, draft.thirdChoice]
    .filter((center): center is RecruitmentCenter => Boolean(center))
    .map((center, index) => ({ rank: (index + 1) as 1 | 2 | 3, center }));
}

function getBatchForSubmission(batchId: string | undefined, now: Date): RecruitmentBatch {
  const batchStore = useRecruitmentBatchStore();
  const currentOpenBatch = getCurrentOpenBatch(batchStore.batches, now);
  const batch = batchId
    ? batchStore.getBatch(batchId)
    : currentOpenBatch;
  if (!batch) throw new Error("NO_OPEN_RECRUITMENT_BATCH");
  if (currentOpenBatch && currentOpenBatch.id !== batch.id) {
    throw new Error("BATCH_ALREADY_OPEN");
  }
  if (getEffectiveRecruitmentBatchStatus(batch, now).status !== "open") {
    throw new Error("BATCH_NOT_OPEN");
  }
  return batch;
}

export const useRecruitmentApplicationStore = defineStore("recruitment-application", {
  state: () => ({
    applicationsByBatchAndMember: {} as Record<string, SubmittedRecruitmentApplication>,
  }),
  getters: {
    applicationsByMemberId(state): Record<string, SubmittedRecruitmentApplication> {
      const latest: Record<string, SubmittedRecruitmentApplication> = {};
      Object.values(state.applicationsByBatchAndMember).forEach((application) => {
        const existing = latest[application.memberId];
        if (!existing || Date.parse(application.updatedAt) >= Date.parse(existing.updatedAt)) {
          latest[application.memberId] = application;
        }
      });
      return latest;
    },
    getApplication: (state) => (
      batchId: string,
      memberId: string,
    ): SubmittedRecruitmentApplication | undefined => {
      const application = state.applicationsByBatchAndMember[applicationKey(batchId, memberId)];
      return application ? cloneApplication(application) : undefined;
    },
    currentApplication(): SubmittedRecruitmentApplication | undefined {
      const session = useSessionStore();
      const batch = useRecruitmentBatchStore().currentOpenBatch;
      if (!batch) return undefined;
      return this.getApplication(batch.id, session.currentMemberId);
    },
    latestApplication(state): SubmittedRecruitmentApplication | undefined {
      const memberId = useSessionStore().currentMemberId;
      return Object.values(state.applicationsByBatchAndMember)
        .filter((application) => application.memberId === memberId)
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
    },
    submittedApplication(): SubmittedRecruitmentApplication | undefined {
      const application = this.currentApplication ?? this.latestApplication;
      return isActiveApplication(application) ? application : undefined;
    },
    isSubmitted(): boolean {
      return Boolean(this.submittedApplication);
    },
    memberStatus(state) {
      const memberId = useSessionStore().currentMemberId;
      return Object.values(state.applicationsByBatchAndMember).some((application) => (
        application.memberId === memberId && isActiveApplication(application)
      )) ? PREPARATORY_MEMBER_STATUS : undefined;
    },
  },
  actions: {
    captureSnapshot(): RecruitmentApplicationStoreSnapshot {
      return Object.fromEntries(
        Object.entries(this.applicationsByBatchAndMember).map(([key, application]) => [key, cloneApplication(application)]),
      );
    },
    restoreSnapshot(snapshot: RecruitmentApplicationStoreSnapshot) {
      this.applicationsByBatchAndMember = Object.fromEntries(
        Object.entries(snapshot).map(([key, application]) => [key, cloneApplication(application)]),
      );
    },
    createDraft(): RecruitmentApplicationDraft {
      return createRecruitmentApplicationDraft();
    },
    cloneDraft(draft: RecruitmentApplicationDraft): RecruitmentApplicationDraft {
      return cloneRecruitmentApplicationDraft(draft);
    },
    setFirstChoice(draft: RecruitmentApplicationDraft, firstChoice?: RecruitmentCenter) {
      draft.firstChoice = firstChoice;
      if (![draft.firstChoice, draft.secondChoice, draft.thirdChoice].includes("白泽开发中心")) {
        draft.baizeDirection = undefined;
      }
    },
    getApplicationsForBatch(batchId: string): SubmittedRecruitmentApplication[] {
      return Object.values(this.applicationsByBatchAndMember)
        .filter((application) => application.batchId === batchId)
        .map(cloneApplication);
    },
    submitApplication(
      profileDraft: RegistrationProfileDraft,
      applicationDraft: RecruitmentApplicationDraft,
      confirmed: boolean,
      options: SubmitApplicationOptions = {},
    ) {
      const session = useSessionStore();
      const now = options.now ?? new Date();
      const batch = getBatchForSubmission(options.batchId, now);
      const memberId = session.currentMemberId;
      const key = applicationKey(batch.id, memberId);
      const existing = this.applicationsByBatchAndMember[key];
      if (existing?.status === "locked") {
        throw new Error("APPLICATION_LOCKED");
      }
      if (existing && existing.status !== "withdrawn" && !options.allowExistingUpdate) {
        throw new Error("当前账号已提交报名，请勿重复提交。");
      }
      const profileStore = useMemberProfileStore();
      const currentProfile = profileStore.getProfile(memberId);
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
      const selectedCenters = preferencesFromDraft(applicationDraft);
      if (selectedCenters.some((preference) => (
        !batch.openCenterIds.includes(CENTER_IDS[preference.center])
      ))) {
        throw new Error("CENTER_NOT_AVAILABLE");
      }

      profileStore.registerProfile(memberId, profileDraft);
      const timestamp = now.toISOString();
      this.applicationsByBatchAndMember[key] = {
        id: existing?.id ?? `application-${batch.id}-${memberId}`,
        batchId: batch.id,
        memberId,
        batchVersionAtSubmission: batch.version,
        batchNameSnapshot: batch.name,
        applicantProfileSnapshot: {
          name: profileDraft.name,
          studentId: profileDraft.studentId,
          grade: profileDraft.grade,
          className: profileDraft.className,
          bio: profileDraft.bio,
          avatarUrl: profileDraft.avatarUrl,
        },
        contact: applicationDraft.contact.trim(),
        firstChoice,
        secondChoice: applicationDraft.secondChoice,
        thirdChoice: applicationDraft.thirdChoice,
        baizeDirection: selectedCenters.some((preference) => preference.center === "白泽开发中心")
          ? applicationDraft.baizeDirection
          : undefined,
        preferences: selectedCenters,
        centerConfigurationSnapshot: centerConfigurationSnapshot(batch),
        acceptsAdjustment,
        status: "submitted",
        submittedAt: timestamp,
        updatedAt: timestamp,
        withdrawnAt: undefined,
        lockedAt: undefined,
      };
      return cloneApplication(this.applicationsByBatchAndMember[key]);
    },
    withdrawApplication(
      batchId?: string,
      memberId = useSessionStore().currentMemberId,
      now: Date = new Date(),
    ) {
      const batch = batchId
        ? useRecruitmentBatchStore().getBatch(batchId)
        : useRecruitmentBatchStore().currentOpenBatch;
      if (!batch) throw new Error("NO_OPEN_RECRUITMENT_BATCH");
      if (getEffectiveRecruitmentBatchStatus(batch, now).status !== "open") {
        throw new Error("APPLICATION_LOCKED");
      }
      const key = applicationKey(batch.id, memberId);
      const application = this.applicationsByBatchAndMember[key];
      if (application?.status === "locked") throw new Error("APPLICATION_LOCKED");
      if (!application || application.status !== "submitted") throw new Error("APPLICATION_NOT_FOUND");
      const timestamp = now.toISOString();
      application.status = "withdrawn";
      application.withdrawnAt = timestamp;
      application.updatedAt = timestamp;
      return cloneApplication(application);
    },
    lockApplicationForAssessment(
      batchId: string,
      memberId: string,
      now: Date,
    ) {
      const application = this.applicationsByBatchAndMember[applicationKey(batchId, memberId)];
      if (!application || application.status === "withdrawn") return undefined;
      const timestamp = now.toISOString();
      if (application.status === "locked") {
        // A closed batch locks submitted applications before assessment starts.
        // Once a result is recorded, retain the lock and refine its reason so
        // reopening can never unlock an application already touched by review.
        if (application.lockReason === "early-close") {
          application.lockReason = "assessment";
          application.updatedAt = timestamp;
        }
        return cloneApplication(application);
      }
      application.status = "locked";
      application.lockedAt = application.lockedAt ?? timestamp;
      application.lockReason = "assessment";
      application.updatedAt = timestamp;
      return cloneApplication(application);
    },
    lockExpiredApplications(now: Date = new Date()) {
      Object.values(this.applicationsByBatchAndMember).forEach((application) => {
        if (application.status !== "submitted") return;
        const batch = useRecruitmentBatchStore().getBatch(application.batchId);
        if (!batch || Date.parse(batch.endAt) > now.getTime()) return;
        application.status = "locked";
        application.lockedAt = now.toISOString();
        application.lockReason = "deadline";
        application.updatedAt = now.toISOString();
      });
    },
    lockApplicationsForBatch(
      batchId: string,
      now: Date = new Date(),
      reason: "early-close" | "deadline" = "early-close",
    ) {
      const timestamp = now.toISOString();
      Object.values(this.applicationsByBatchAndMember)
        .filter((application) => application.batchId === batchId && application.status === "submitted")
        .forEach((application) => {
          application.status = "locked";
          application.lockedAt = timestamp;
          application.lockReason = reason;
          application.updatedAt = timestamp;
        });
    },
    unlockApplicationsForBatch(batchId: string, reason: "early-close", now: Date = new Date()) {
      Object.values(this.applicationsByBatchAndMember)
        .filter((application) => (
          application.batchId === batchId
          && application.status === "locked"
          && application.lockReason === reason
        ))
        .forEach((application) => {
          application.status = "submitted";
          application.lockedAt = undefined;
          application.lockReason = undefined;
          application.updatedAt = now.toISOString();
        });
    },
    markCenterAvailability(batchId: string, openCenterIds: readonly string[]) {
      Object.values(this.applicationsByBatchAndMember)
        .filter((application) => application.batchId === batchId)
        .forEach((application) => {
          application.centerConfigurationSnapshot.forEach((center) => {
            center.currentlyAvailable = openCenterIds.includes(CENTER_IDS[center.center]);
          });
        });
    },
    replaceApplications(applications: readonly SubmittedRecruitmentApplication[]) {
      this.applicationsByBatchAndMember = Object.fromEntries(
        applications.map((application) => [applicationKey(application.batchId, application.memberId), cloneApplication(application)]),
      );
    },
  },
});
