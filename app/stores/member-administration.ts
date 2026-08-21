import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  AdminCenterResponseDto,
  ManagedMemberResponseDto,
} from "../../packages/api-client/src";
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
import type { AdminCenter, AdminMember } from "../data/admin-members";
import type { BaizeDirection } from "../data/recruitment-application";
import { BAIZE_DIRECTION_LABELS, baizeDirectionLabel, type BaizeDirectionCode } from "../utils/baize-direction-label";
import type { OrganizationGateway } from "../services/organization/organization-gateway";

export type { CreateFormalMemberInput, CreateFormalMemberResult } from "../utils/member-account-form";

export type PromoteFormalMemberToCoreResult =
  | { status: "success" }
  | { status: "already_core" }
  | { status: "not_eligible" }
  | { status: "storage_unavailable" };

export type PromoteMemberToFormalResult =
  | { status: "success" }
  | { status: "already_formal" }
  | { status: "not_eligible" }
  | { status: "storage_unavailable" };

export interface PromoteMemberToFormalOptions {
  center?: AdminCenter;
  baizeDirection?: BaizeDirection;
}

export interface OrganizationStoreError {
  status?: number;
  code: string;
  message: string;
  requestId?: string;
}

export type ApiCreateFormalMemberResult = CreateFormalMemberResult | { status: "api_error" };
export type ApiPromoteMemberToFormalResult = PromoteMemberToFormalResult | { status: "api_error" };
export type ApiPromoteFormalMemberToCoreResult = PromoteFormalMemberToCoreResult | { status: "api_error" };

export interface PromoteMemberToFormalApiInput {
  centerId: string;
  duty: "REGULAR" | "CORE";
  baizeDirection?: BaizeDirectionCode;
}

function apiError(cause: unknown): OrganizationStoreError {
  if (cause instanceof Error) {
    const error = cause as Error & { status?: number; code?: string; requestId?: string };
    return {
      ...(error.status === undefined ? {} : { status: error.status }),
      code: error.code ?? "ORGANIZATION_API_REQUEST_FAILED",
      message: error.message,
      ...(error.requestId ? { requestId: error.requestId } : {}),
    };
  }
  return { code: "ORGANIZATION_API_REQUEST_FAILED", message: "Organization API request failed" };
}

function baizeDirectionCode(label: BaizeDirection | undefined): BaizeDirectionCode | undefined {
  return (Object.entries(BAIZE_DIRECTION_LABELS) as Array<[BaizeDirectionCode, BaizeDirection]>)
    .find(([, candidate]) => candidate === label)?.[0];
}

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
  const apiModeActive = ref(false);
  const apiLoading = ref(false);
  const apiErrorState = ref<OrganizationStoreError | null>(null);
  const apiManagedMembers = ref<ManagedMemberResponseDto[]>([]);
  const apiCenters = ref<AdminCenterResponseDto[]>([]);
  const apiAdminMembers = computed<AdminMember[]>(() => apiManagedMembers.value.map((member) => {
    const isCore = member.membership?.duty === "CORE";
    const center = (member.membership?.center.name ?? "未分配中心") as AdminCenter;
    const organizationPositions = positionsForPerson(member.id).map((position) => position.type);
    const baizeDirection = baizeDirectionLabel(member.baizeDirection);
    return {
      id: member.id,
      name: member.name,
      studentId: member.studentId,
      center,
      identity: member.status === "FORMAL_MEMBER" ? "正式成员" : "预备成员",
      grade: member.grade,
      memberDuty: isCore ? "核心人员" : "普通成员",
      isCore,
      ...(baizeDirection ? { baizeDirection } : {}),
      ...(organizationPositions.length ? { organizationPositions } : {}),
      avatarUrl: null,
      profileSummary: member.biography ?? member.bio ?? "",
      updatedAt: "API",
    };
  }));

  function activateApiMode() {
    apiModeActive.value = true;
    apiErrorState.value = null;
    apiManagedMembers.value = [];
    apiCenters.value = [];
  }

  async function refreshFromApi(gateway: OrganizationGateway): Promise<boolean> {
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      const [members, centers] = await Promise.all([
        gateway.listManagedMembers(),
        gateway.listCenters(),
      ]);
      apiManagedMembers.value = members.items;
      apiCenters.value = centers.items;
      return true;
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      return false;
    } finally {
      apiLoading.value = false;
    }
  }

  async function createFormalMemberFromApi(
    input: CreateFormalMemberInput,
    gateway: OrganizationGateway,
  ): Promise<ApiCreateFormalMemberResult> {
    const errors = validateCreateFormalMemberInput(input);
    if (Object.keys(errors).length) return { status: "invalid_input", errors };
    const normalized = normalizeCreateFormalMemberInput(input);
    const center = apiCenters.value.find((candidate) => candidate.name === normalized.center);
    if (!center) {
      apiErrorState.value = { code: "CENTER_NOT_FOUND", message: "Selected center is not available" };
      return { status: "api_error" };
    }
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      const created = await gateway.createManagedMember({
        name: normalized.name,
        studentId: normalized.studentId,
        grade: normalized.grade,
        className: normalized.className,
        identity: "formal-member",
        centerId: center.id,
        duty: normalized.memberDuty === "核心人员" ? "CORE" : "REGULAR",
        ...(normalized.baizeDirection ? { baizeDirection: baizeDirectionCode(normalized.baizeDirection) } : {}),
      });
      await refreshFromApi(gateway);
      return { status: "success", memberId: created.personId, accountId: created.accountId };
    } catch (cause) {
      const error = apiError(cause);
      apiErrorState.value = error;
      return error.code === "ACCOUNT_ALREADY_EXISTS"
        ? { status: "duplicate_student_id" }
        : { status: "api_error" };
    } finally {
      apiLoading.value = false;
    }
  }

  async function promoteFormalMemberToCoreFromApi(
    personId: string,
    gateway: OrganizationGateway,
  ): Promise<ApiPromoteFormalMemberToCoreResult> {
    const member = apiManagedMembers.value.find((candidate) => candidate.id === personId);
    if (!member || member.status !== "FORMAL_MEMBER" || !member.membership) return { status: "not_eligible" };
    if (member.membership.duty === "CORE") return { status: "already_core" };
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      await gateway.setCoreMembership(personId, { core: true, expectedMembershipVersion: member.membership.version });
      await refreshFromApi(gateway);
      return { status: "success" };
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      return { status: "api_error" };
    } finally {
      apiLoading.value = false;
    }
  }

  function positionsForPerson(personId: string) {
    const memberPositions = apiManagedMembers.value
      .find((member) => member.id === personId)?.positions ?? [];
    const centerPositions = apiCenters.value.flatMap((center) => (center.positions ?? [])
      .filter((position) => position.personId === personId)
      .map((position) => ({ ...position, center })));
    const seen = new Set<string>();
    return [...memberPositions, ...centerPositions].filter((position) => {
      if (seen.has(position.id)) return false;
      seen.add(position.id);
      return true;
    });
  }

  function centerForPosition(centerId: string | null): AdminCenterResponseDto | undefined {
    return centerId ? apiCenters.value.find((center) => center.id === centerId) : undefined;
  }

  async function setCoreMembershipFromApi(personId: string, core: boolean, gateway: OrganizationGateway): Promise<boolean> {
    const member = apiManagedMembers.value.find((candidate) => candidate.id === personId);
    if (!member?.membership || member.status !== "FORMAL_MEMBER") return false;
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      await gateway.setCoreMembership(personId, { core, expectedMembershipVersion: member.membership.version });
      await refreshFromApi(gateway);
      return true;
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      await refreshFromApi(gateway);
      return false;
    } finally {
      apiLoading.value = false;
    }
  }

  async function appointAllianceOwnerFromApi(personId: string, gateway: OrganizationGateway): Promise<boolean> {
    const member = apiManagedMembers.value.find((candidate) => candidate.id === personId);
    if (!member?.membership || member.status !== "FORMAL_MEMBER") return false;
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      const account = (await gateway.listAccounts()).items.find((candidate) => candidate.person.id === personId);
      if (!account) return false;
      await gateway.appointAllianceOwner(personId, {
        expectedAccountVersion: account.version,
        expectedMembershipVersion: member.membership.version,
      });
      await refreshFromApi(gateway);
      return true;
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      await refreshFromApi(gateway);
      return false;
    } finally {
      apiLoading.value = false;
    }
  }

  async function revokeAllianceOwnerFromApi(personId: string, positionVersion: number, gateway: OrganizationGateway): Promise<boolean> {
    const position = positionsForPerson(personId).find((item) => item.type === "ALLIANCE_OWNER" && item.version === positionVersion);
    if (!position) return false;
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      await gateway.revokeAllianceOwner(personId, { expectedPositionVersion: positionVersion });
      await refreshFromApi(gateway);
      return true;
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      await refreshFromApi(gateway);
      return false;
    } finally {
      apiLoading.value = false;
    }
  }

  async function grantProjectLeadFromApi(personId: string, gateway: OrganizationGateway): Promise<boolean> {
    const member = apiManagedMembers.value.find((candidate) => candidate.id === personId);
    if (!member?.membership || member.status !== "FORMAL_MEMBER") return false;
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      const account = (await gateway.listAccounts()).items.find((candidate) => candidate.person.id === personId);
      if (!account) return false;
      await gateway.grantProjectLead(personId, {
        expectedAccountVersion: account.version,
        expectedMembershipVersion: member.membership.version,
      });
      await refreshFromApi(gateway);
      return true;
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      await refreshFromApi(gateway);
      return false;
    } finally {
      apiLoading.value = false;
    }
  }

  async function revokeProjectLeadFromApi(personId: string, positionVersion: number, gateway: OrganizationGateway): Promise<boolean> {
    const position = positionsForPerson(personId).find((item) => item.type === "PROJECT_LEAD" && item.version === positionVersion);
    if (!position) return false;
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      await gateway.revokeProjectLead(personId, { expectedPositionVersion: positionVersion });
      await refreshFromApi(gateway);
      return true;
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      await refreshFromApi(gateway);
      return false;
    } finally {
      apiLoading.value = false;
    }
  }

  async function appointCenterMinisterFromApi(personId: string, gateway: OrganizationGateway): Promise<boolean> {
    const member = apiManagedMembers.value.find((candidate) => candidate.id === personId);
    if (!member?.membership || !member.account) return false;
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      const account = (await gateway.listAccounts()).items.find((candidate) => candidate.person.id === personId);
      if (!account) return false;
      await gateway.appointCenterMinister(member.membership.center.id, personId, {
        expectedAccountVersion: account.version,
        expectedMembershipVersion: member.membership.version,
      });
      await refreshFromApi(gateway);
      return true;
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      await refreshFromApi(gateway);
      return false;
    } finally {
      apiLoading.value = false;
    }
  }

  async function revokeCenterMinisterFromApi(personId: string, positionVersion: number, gateway: OrganizationGateway): Promise<boolean> {
    const position = positionsForPerson(personId).find((item) => item.type === "CENTER_MINISTER" && item.version === positionVersion);
    const center = position ? centerForPosition(position.centerId) : undefined;
    if (!position || !center) return false;
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      await gateway.revokeCenterMinister(center.id, personId, { expectedPositionVersion: positionVersion });
      await refreshFromApi(gateway);
      return true;
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      await refreshFromApi(gateway);
      return false;
    } finally {
      apiLoading.value = false;
    }
  }

  async function handoverCenterMinisterFromApi(
    outgoingPersonId: string,
    incomingPersonId: string,
    outgoingPositionVersion: number,
    gateway: OrganizationGateway,
  ): Promise<boolean> {
    const outgoing = positionsForPerson(outgoingPersonId).find((position) => position.type === "CENTER_MINISTER" && position.version === outgoingPositionVersion);
    const incoming = apiManagedMembers.value.find((member) => member.id === incomingPersonId);
    const center = outgoing ? centerForPosition(outgoing.centerId) : undefined;
    if (!outgoing || !center || !incoming?.membership?.center || incoming.membership.center.id !== center.id) return false;
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      const incomingAccount = (await gateway.listAccounts()).items.find((account) => account.person.id === incomingPersonId);
      if (!incomingAccount) return false;
      await gateway.handoverCenterMinister(center.id, outgoingPersonId, incomingPersonId, {
        expectedOutgoingPositionVersion: outgoingPositionVersion,
        expectedIncomingAccountVersion: incomingAccount.version,
        expectedIncomingMembershipVersion: incoming.membership.version,
      });
      await refreshFromApi(gateway);
      return true;
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      await refreshFromApi(gateway);
      return false;
    } finally {
      apiLoading.value = false;
    }
  }

  async function promoteMemberToFormalFromApi(
    personId: string,
    input: PromoteMemberToFormalApiInput,
    gateway: OrganizationGateway,
  ): Promise<ApiPromoteMemberToFormalResult> {
    const member = apiManagedMembers.value.find((candidate) => candidate.id === personId);
    if (!member || member.status === "NOT_ADMITTED") return { status: "not_eligible" };
    if (member.status === "FORMAL_MEMBER") return { status: "already_formal" };
    const center = apiCenters.value.find((candidate) => candidate.id === input.centerId);
    if (!center) {
      apiErrorState.value = { code: "CENTER_NOT_FOUND", message: "Selected center is not available" };
      return { status: "api_error" };
    }
    if (center.slug === "baize-development" && !input.baizeDirection) {
      apiErrorState.value = { code: "BAIZE_DIRECTION_REQUIRED", message: "Baize promotion requires a practice direction" };
      return { status: "api_error" };
    }
    apiLoading.value = true;
    apiErrorState.value = null;
    try {
      await gateway.promoteMemberToFormal(personId, {
        confirmed: true,
        expectedVersion: member.version,
        centerId: center.id,
        duty: input.duty,
        ...(center.slug === "baize-development" && input.baizeDirection
          ? { baizeDirection: input.baizeDirection }
          : {}),
      });
      await refreshFromApi(gateway);
      return { status: "success" };
    } catch (cause) {
      apiErrorState.value = apiError(cause);
      return { status: "api_error" };
    } finally {
      apiLoading.value = false;
    }
  }

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

  function promoteMemberToFormal(
    memberId: string,
    options: PromoteMemberToFormalOptions = {},
  ): PromoteMemberToFormalResult {
    const profiles = useMemberProfileStore();
    const access = useAdminAccessStore();
    const storedProfile = profiles.profiles[memberId];
    const staticMember = ADMIN_MEMBERS.find((member) => member.id === memberId);
    const identity = storedProfile?.identity ?? staticMember?.identity;

    if (identity === "正式成员") return { status: "already_formal" };
    if (identity !== "预备成员" || !staticMember) return { status: "not_eligible" };
    if (!access.accounts.some((account) => account.memberId === memberId)) {
      return { status: "not_eligible" };
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
    const staticPublicPerson = findStaticPublicPersonForMember(memberId);
    const requestedPublicId = storedProfile?.publicId ?? staticPublicPerson?.id;
    const publicId = requestedPublicId && !Object.entries(profiles.profiles).some(([profileId, profile]) => (
      profileId !== memberId && profile.publicId === requestedPublicId
    ))
      ? requestedPublicId
      : createPublicMemberId(profiles.profiles);
    const center = options.center ?? staticMember.center;
    const baizeDirection = options.baizeDirection
      ?? storedProfile?.baizeDirection
      ?? staticMember.baizeDirection;
    const profile: MemberProfile = {
      ...(storedProfile ?? {}),
      id: staticMember.id,
      publicId,
      name: storedProfile?.name ?? staticPublicPerson?.name ?? staticMember.name,
      studentId: storedProfile?.studentId ?? staticMember.studentId,
      grade: storedProfile?.grade ?? staticMember.grade,
      className: storedProfile?.className ?? "暂未录入",
      center,
      centerSlug: getCenterSlug(center),
      memberDuty: storedProfile?.memberDuty ?? staticMember.memberDuty,
      identity: "正式成员",
      ...((center === "白泽开发中心" && baizeDirection)
        ? { baizeDirection }
        : {}),
      bio: storedProfile?.bio ?? staticPublicPerson?.bio ?? staticMember.profileSummary,
      ...((staticPublicPerson?.avatarVisible ? staticPublicPerson.avatarUrl : staticMember.avatarUrl)
        ? { avatarUrl: storedProfile?.avatarUrl
          ?? (staticPublicPerson?.avatarVisible ? staticPublicPerson.avatarUrl : staticMember.avatarUrl!) }
        : {}),
    };
    if (profile.center !== "白泽开发中心") delete profile.baizeDirection;

    try {
      if (storedProfile) {
        profiles.profiles[memberId] = {
          ...storedProfile,
          ...profile,
        };
      } else if (!profiles.addFormalProfile(profile)) {
        throw new Error("formal member promotion conflict");
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

  return {
    apiModeActive,
    apiLoading,
    apiError: apiErrorState,
    apiManagedMembers,
    apiCenters,
    apiAdminMembers,
    activateApiMode,
    refreshFromApi,
    createFormalMemberFromApi,
    promoteMemberToFormalFromApi,
    promoteFormalMemberToCoreFromApi,
    setCoreMembershipFromApi,
    positionsForPerson,
    appointAllianceOwnerFromApi,
    revokeAllianceOwnerFromApi,
    appointCenterMinisterFromApi,
    revokeCenterMinisterFromApi,
    handoverCenterMinisterFromApi,
    grantProjectLeadFromApi,
    revokeProjectLeadFromApi,
    createFormalMember,
    promoteMemberToFormal,
    promoteFormalMemberToCore,
  };
});
