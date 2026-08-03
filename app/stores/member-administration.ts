import { defineStore } from "pinia";
import { ADMIN_ACCESS_STORAGE_KEY, type MockAccount } from "../data/admin-system";
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
      publicId: memberId,
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

  return { createFormalMember };
});
