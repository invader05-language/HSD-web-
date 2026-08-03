import { defineStore } from "pinia";
import { ADMIN_ACCESS_STORAGE_KEY, type MockAccount } from "../data/admin-system";
import { ADMIN_MEMBERS } from "../data/admin-members";
import { findStaticPublicPersonForMember } from "../data/people";
import type { MemberProfile } from "../data/member-profile";
import {
  MEMBER_PROFILE_STORAGE_KEY,
  useMemberProfileStore,
} from "./member-profile";
import { useAdminAccessStore } from "./admin-access";
import {
  getCenterSlug,
  normalizeCreateFormalMemberInput,
  validateCreateFormalMemberInput,
  type CreateFormalMemberInput,
  type CreateFormalMemberResult,
} from "../utils/member-account-form";

export type { CreateFormalMemberInput, CreateFormalMemberResult } from "../utils/member-account-form";

export type PromoteFormalMemberToCoreResult =
  | { status: "success" }
  | { status: "already_core" }
  | { status: "not_eligible" }
  | { status: "storage_unavailable" };

function getRequiredStorage(): Storage {
  try {
    if (typeof localStorage === "undefined") throw new Error("storage unavailable");
    return localStorage;
  } catch {
    throw new Error("storage unavailable");
  }
}

function restoreStoredValue(storage: Storage, key: string, value: string | null) {
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, value);
}

function createPublicMemberId(profiles: Record<string, MemberProfile>): string {
  const existingPublicIds = new Set(
    Object.values(profiles)
      .map((profile) => profile.publicId)
      .filter((publicId): publicId is string => Boolean(publicId))
  );
  let sequence = 1;
  let candidate = "";
  do {
    candidate = `formal-member-${String(sequence).padStart(4, "0")}`;
    sequence += 1;
  } while (existingPublicIds.has(candidate));
  return candidate;
}

export const useMemberAdministrationStore = defineStore("member-administration", () => {
  function createFormalMember(input: CreateFormalMemberInput): CreateFormalMemberResult {
    const errors = validateCreateFormalMemberInput(input);
    if (Object.keys(errors).length) return { status: "invalid_input", errors };

    const normalized = normalizeCreateFormalMemberInput(input);
    const access = useAdminAccessStore();
    const profiles = useMemberProfileStore();
    const duplicatesExistingStudentId = access.accounts.some(
      (account) => account.account === normalized.studentId
    ) || Object.values(profiles.profiles).some(
      (profile) => profile.studentId === normalized.studentId
    );
    if (duplicatesExistingStudentId) return { status: "duplicate_student_id" };

    let storage: Storage;
    let previousAccessState: string | null;
    let previousProfileState: string | null;
    try {
      storage = getRequiredStorage();
      previousAccessState = storage.getItem(ADMIN_ACCESS_STORAGE_KEY);
      previousProfileState = storage.getItem(MEMBER_PROFILE_STORAGE_KEY);
    } catch {
      return { status: "storage_unavailable" };
    }

    const previousAccounts = access.accounts.map((account) => ({ ...account }));
    const previousQualificationDetails = Object.fromEntries(
      Object.entries(access.qualificationDetails).map(([account, details]) => [
        account,
        { ...details },
      ])
    );
    const previousAuditRecords = access.auditRecords.map((record) => ({ ...record }));
    const previousProfiles = Object.fromEntries(
      Object.entries(profiles.profiles).map(([memberId, profile]) => [
        memberId,
        { ...profile },
      ])
    );

    const memberId = `member-${normalized.studentId}`;
    const publicId = createPublicMemberId(profiles.profiles);
    const account: MockAccount = {
      account: normalized.studentId,
      memberId,
      name: normalized.name,
      adminLevel: "member",
      adminAccessEnabled: true,
      mustChangePassword: true,
    };
    const profile: MemberProfile = {
      id: memberId,
      publicId,
      name: normalized.name,
      studentId: normalized.studentId,
      grade: normalized.grade,
      className: normalized.className,
      center: normalized.center,
      centerSlug: getCenterSlug(normalized.center),
      memberDuty: normalized.memberDuty,
      identity: "正式成员",
      ...(normalized.baizeDirection ? { baizeDirection: normalized.baizeDirection } : {}),
      bio: normalized.bio,
      ...(normalized.avatarUrl ? { avatarUrl: normalized.avatarUrl } : {}),
    };

    try {
      if (!access.registerFormalMemberAccount(account) || !profiles.addFormalProfile(profile)) {
        throw new Error("member creation conflict");
      }
      access.persistAccessState();
      profiles.persistProfileState();
      return { status: "success", memberId, accountId: normalized.studentId };
    } catch {
      access.accounts.splice(0, access.accounts.length, ...previousAccounts);
      access.qualificationDetails = previousQualificationDetails;
      access.auditRecords.splice(0, access.auditRecords.length, ...previousAuditRecords);
      profiles.replaceProfiles(previousProfiles);
      try {
        restoreStoredValue(storage, ADMIN_ACCESS_STORAGE_KEY, previousAccessState);
        restoreStoredValue(storage, MEMBER_PROFILE_STORAGE_KEY, previousProfileState);
      } catch {
        // The stores are already rolled back. The caller receives the storage error below.
      }
      return { status: "storage_unavailable" };
    }
  }

  function promoteFormalMemberToCore(memberId: string): PromoteFormalMemberToCoreResult {
    const profiles = useMemberProfileStore();
    const access = useAdminAccessStore();
    const storedProfile = profiles.profiles[memberId];
    const staticMember = ADMIN_MEMBERS.find((member) => member.id === memberId);
    const staticPublicPerson = findStaticPublicPersonForMember(memberId);
    const identity = storedProfile?.identity ?? staticMember?.identity;

    if (identity !== "正式成员" || (!storedProfile && !staticMember)) {
      return { status: "not_eligible" };
    }

    const enabledCenterLead = access.accounts.some((account) => (
      account.memberId === memberId
      && account.adminLevel === "admin"
      && account.adminAccessEnabled
      && Boolean(account.adminCenterRole)
    ));
    const publicIdentityNeedsRepair = Boolean(
      storedProfile
      && staticPublicPerson
      && storedProfile.publicId !== staticPublicPerson.id
    );
    if (!publicIdentityNeedsRepair && (storedProfile?.memberDuty === "核心人员"
      || staticMember?.memberDuty === "核心人员"
      || enabledCenterLead)) {
      return { status: "already_core" };
    }

    let storage: Storage;
    let previousProfileState: string | null;
    try {
      storage = getRequiredStorage();
      previousProfileState = storage.getItem(MEMBER_PROFILE_STORAGE_KEY);
    } catch {
      return { status: "storage_unavailable" };
    }

    const previousProfiles = Object.fromEntries(
      Object.entries(profiles.profiles).map(([profileId, profile]) => [
        profileId,
        { ...profile },
      ])
    );

    try {
      if (storedProfile) {
        profiles.profiles[memberId] = {
          ...storedProfile,
          ...(staticPublicPerson ? {
            publicId: staticPublicPerson.id,
            name: staticPublicPerson.name,
            center: staticPublicPerson.centerName,
            centerSlug: staticPublicPerson.centerSlug,
            bio: staticPublicPerson.bio,
            baizeDirection: staticPublicPerson.baizeDirection,
            avatarUrl: staticPublicPerson.avatarVisible
              ? staticPublicPerson.avatarUrl
              : undefined,
          } : {}),
          memberDuty: "核心人员",
        };
      } else if (staticMember) {
        const publicId = staticPublicPerson?.id ?? createPublicMemberId(profiles.profiles);
        const profile: MemberProfile = {
          id: staticMember.id,
          publicId,
          name: staticPublicPerson?.name ?? staticMember.name,
          studentId: staticMember.studentId,
          grade: staticMember.grade,
          className: "暂未录入",
          center: staticPublicPerson?.centerName ?? staticMember.center,
          centerSlug: staticPublicPerson?.centerSlug ?? getCenterSlug(staticMember.center),
          memberDuty: "核心人员",
          identity: "正式成员",
          ...((staticPublicPerson?.baizeDirection ?? staticMember.baizeDirection)
            ? { baizeDirection: staticPublicPerson?.baizeDirection ?? staticMember.baizeDirection }
            : {}),
          bio: staticPublicPerson?.bio ?? staticMember.profileSummary,
          ...((staticPublicPerson?.avatarVisible ? staticPublicPerson.avatarUrl : staticMember.avatarUrl)
            ? { avatarUrl: staticPublicPerson?.avatarVisible
              ? staticPublicPerson.avatarUrl
              : staticMember.avatarUrl! }
            : {}),
        };
        if (!profiles.addFormalProfile(profile)) throw new Error("core member conflict");
      }
      profiles.persistProfileState();
      return { status: "success" };
    } catch {
      profiles.replaceProfiles(previousProfiles);
      try {
        restoreStoredValue(storage, MEMBER_PROFILE_STORAGE_KEY, previousProfileState);
      } catch {
        // The in-memory profile state has already been restored.
      }
      return { status: "storage_unavailable" };
    }
  }

  return { createFormalMember, promoteFormalMemberToCore };
});
