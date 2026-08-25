import type {
  AdminRecruitmentBatchDto,
  MemberProfileResponseDto,
  MyRecruitmentApplicationResponseDto,
  PublicRecruitmentBatchDto,
  RecruitmentBatchLifecycleEventDto,
  RecruitmentBatchLifecycleSnapshotDto,
  SubmitApplicationDto,
  UpdateApplicationDto,
  UpdateMyProfileDto,
} from "../../../packages/api-client/src";
import {
  BAIZE_DIRECTIONS,
  RECRUITMENT_CENTERS,
  type BaizeDirection,
  type RecruitmentApplicationDraft,
  type RecruitmentCenter,
  type SubmittedRecruitmentApplication,
} from "../../data/recruitment-application";
import type { MemberProfile } from "../../data/member-profile";

const CENTER_ID_BY_NAME: Record<RecruitmentCenter, string> = {
  "白泽开发中心": "baize-development",
  "新媒体中心": "new-media",
  "拓维策划中心": "tuowei-planning",
  "人才发展中心": "talent-development",
};

const CENTER_NAME_BY_ID: Record<string, RecruitmentCenter> = Object.fromEntries(
  Object.entries(CENTER_ID_BY_NAME).map(([name, id]) => [id, name]),
) as Record<string, RecruitmentCenter>;

const BAIZE_DIRECTION_BY_API: Record<NonNullable<MyRecruitmentApplicationResponseDto["baizeDirection"]>, BaizeDirection> = {
  HARMONYOS_DEVELOPMENT: "鸿蒙开发",
  BACKEND_ARCHITECTURE: "后端架构",
  AIGC_LARGE_MODEL: "大模型 AIGC",
  UI_UX_DESIGN: "UI/UX 设计",
  EMBEDDED_DEVELOPMENT: "嵌入式开发",
};

const API_BAIZE_DIRECTION_BY_NAME: Record<BaizeDirection, NonNullable<SubmitApplicationDto["baizeDirection"]>> = {
  "鸿蒙开发": "HARMONYOS_DEVELOPMENT",
  "后端架构": "BACKEND_ARCHITECTURE",
  "大模型 AIGC": "AIGC_LARGE_MODEL",
  "UI/UX 设计": "UI_UX_DESIGN",
  "嵌入式开发": "EMBEDDED_DEVELOPMENT",
};

export interface PublicRecruitmentBatchView {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  timezone: "Asia/Shanghai";
  effectiveStatus: PublicRecruitmentBatchDto["effectiveStatus"];
  effectiveStatusReason: PublicRecruitmentBatchDto["effectiveStatusReason"];
  openCenterIds: string[];
  openCenters: Array<{ id: string; name: string }>;
}

export function getRecruitmentCenterOptions(
  batch: Pick<PublicRecruitmentBatchView, "openCenters">,
): Array<readonly [string, string]> {
  return batch.openCenters.map((center) => [center.id, center.name] as const);
}

export interface AdminRecruitmentBatchView {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  timezone: "Asia/Shanghai";
  effectiveStatus: AdminRecruitmentBatchDto["effectiveStatus"];
  effectiveStatusReason: AdminRecruitmentBatchDto["effectiveStatusReason"];
  lifecycleStatus: Lowercase<AdminRecruitmentBatchDto["lifecycleStatus"]>;
  manualOverride: Lowercase<AdminRecruitmentBatchDto["manualOverride"]>;
  version: number;
  applicants: number;
  applicationCount: number;
  publishedAt: string | null;
  actualOpenedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  openCenterIds: string[];
  openCenters: AdminRecruitmentBatchDto["openCenters"];
  owner: string | undefined;
  responsibleAccounts: AdminRecruitmentBatchDto["responsibleAccounts"];
}

export function mapAdminRecruitmentBatch(dto: AdminRecruitmentBatchDto): AdminRecruitmentBatchView {
  const responsibleAccount = dto.responsibleAccounts[0];
  const owner = responsibleAccount?.person.name.trim() || responsibleAccount?.username.trim() || undefined;
  return {
    id: dto.id,
    name: dto.name,
    startAt: dto.startAt,
    endAt: dto.endAt,
    timezone: dto.timezone,
    effectiveStatus: dto.effectiveStatus,
    effectiveStatusReason: dto.effectiveStatusReason,
    lifecycleStatus: dto.lifecycleStatus.toLowerCase() as AdminRecruitmentBatchView["lifecycleStatus"],
    manualOverride: dto.manualOverride.toLowerCase() as AdminRecruitmentBatchView["manualOverride"],
    version: dto.version,
    applicants: dto.applicationCount,
    applicationCount: dto.applicationCount,
    publishedAt: dto.publishedAt,
    actualOpenedAt: dto.actualOpenedAt,
    closedAt: dto.closedAt,
    archivedAt: dto.archivedAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    openCenterIds: dto.openCenters.map((center) => center.id),
    openCenters: dto.openCenters,
    owner,
    responsibleAccounts: dto.responsibleAccounts,
  };
}

const LIFECYCLE_SNAPSHOT_KEYS = [
  "name",
  "startAt",
  "endAt",
  "timezone",
  "lifecycleStatus",
  "manualOverride",
  "version",
  "openCenterIds",
  "responsibleAccountIds",
] as const satisfies ReadonlyArray<keyof RecruitmentBatchLifecycleSnapshotDto>;

type LifecycleSnapshotKey = (typeof LIFECYCLE_SNAPSHOT_KEYS)[number];

export type RecruitmentBatchLifecycleSnapshotView = Partial<Pick<
  RecruitmentBatchLifecycleSnapshotDto,
  LifecycleSnapshotKey
>>;

export interface RecruitmentBatchLifecycleEventView {
  id: string;
  actorDisplayName: string;
  action: RecruitmentBatchLifecycleEventDto["action"];
  target: RecruitmentBatchLifecycleEventDto["target"];
  before: RecruitmentBatchLifecycleSnapshotView | null;
  after: RecruitmentBatchLifecycleSnapshotView | null;
  reason: string | null;
  createdAt: string;
}

function isSnapshotScalar(value: unknown): value is string | number | boolean | null {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

export function mapRecruitmentBatchLifecycleSnapshot(
  snapshot: RecruitmentBatchLifecycleSnapshotDto | null,
): RecruitmentBatchLifecycleSnapshotView | null {
  if (!snapshot) return null;
  const safe: RecruitmentBatchLifecycleSnapshotView = {};
  for (const key of LIFECYCLE_SNAPSHOT_KEYS) {
    const value: unknown = snapshot[key];
    if (isSnapshotScalar(value)) safe[key] = value;
    else if (Array.isArray(value) && value.every(isSnapshotScalar)) safe[key] = [...value];
  }
  return safe;
}

export function mapRecruitmentBatchLifecycleEvent(
  event: RecruitmentBatchLifecycleEventDto,
): RecruitmentBatchLifecycleEventView {
  return {
    id: event.id,
    actorDisplayName: event.actor.displayName,
    action: event.action,
    target: { type: event.target.type, id: event.target.id },
    before: mapRecruitmentBatchLifecycleSnapshot(event.before),
    after: mapRecruitmentBatchLifecycleSnapshot(event.after),
    reason: event.reason,
    createdAt: event.createdAt,
  };
}

export interface ProductionMemberProfile extends MemberProfile {
  version: number;
  contact: string;
  biography: string;
  status: MemberProfileResponseDto["status"];
  publicProfileEnabled: boolean;
  avatarAssetId?: string;
}

export function mapPublicRecruitmentBatch(dto: PublicRecruitmentBatchDto): PublicRecruitmentBatchView {
  return {
    id: dto.id,
    name: dto.name,
    startAt: dto.startAt,
    endAt: dto.endAt,
    timezone: dto.timezone,
    effectiveStatus: dto.effectiveStatus,
    effectiveStatusReason: dto.effectiveStatusReason,
    openCenterIds: dto.openCenters.map((center) => center.slug),
    openCenters: dto.openCenters.map((center) => ({ id: center.slug, name: center.name })),
  };
}

function mapStatus(status: MemberProfileResponseDto["status"]): { identity: string; center: string; memberDuty: "普通成员" | "核心人员" } {
  if (status === "FORMAL_MEMBER") return { identity: "正式成员", center: "已分配", memberDuty: "普通成员" };
  if (status === "NOT_ADMITTED") return { identity: "未录取", center: "待确定", memberDuty: "普通成员" };
  return { identity: "预备成员", center: "待确定", memberDuty: "普通成员" };
}

function mapDirection(value: MemberProfileResponseDto["baizeDirection"]): BaizeDirection | undefined {
  if (!value) return undefined;
  return BAIZE_DIRECTION_BY_API[value];
}

export function mapMemberProfileResponse(dto: MemberProfileResponseDto): ProductionMemberProfile {
  const status = mapStatus(dto.status);
  const direction = mapDirection(dto.baizeDirection);
  const membershipCenter = dto.membership?.center;
  const avatarAssetId = dto.avatar.kind === "asset" ? dto.avatar.publicToken : undefined;
  return {
    id: dto.id,
    name: dto.name,
    studentId: dto.studentId,
    grade: dto.grade,
    className: dto.className,
    center: membershipCenter?.name ?? status.center,
    ...(membershipCenter?.slug ? { centerSlug: membershipCenter.slug as MemberProfile["centerSlug"] } : {}),
    memberDuty: dto.membership?.duty === "CORE" ? "核心人员" : status.memberDuty,
    identity: status.identity,
    ...(direction ? { baizeDirection: direction } : {}),
    bio: dto.bio ?? dto.biography ?? "",
    ...(avatarAssetId ? { avatarUrl: `/api/v1/public/media/${encodeURIComponent(avatarAssetId)}` } : {}),
    publicDirectoryVisible: dto.publicProfileEnabled,
    version: dto.version,
    contact: dto.contact ?? "",
    biography: dto.biography ?? "",
    status: dto.status,
    publicProfileEnabled: dto.publicProfileEnabled,
    ...(avatarAssetId ? { avatarAssetId } : {}),
  };
}

export function mapMemberProfileUpdatePayload(
  profile: ProductionMemberProfile,
  draft: Pick<ProductionMemberProfile, "name" | "grade" | "className" | "bio"> & { contact?: string },
): UpdateMyProfileDto {
  return {
    expectedVersion: profile.version,
    name: draft.name.trim(),
    grade: draft.grade.trim(),
    className: draft.className.trim(),
    bio: draft.bio.trim(),
    ...(draft.contact !== undefined ? { contact: draft.contact.trim() } : {}),
  };
}

export function isRecruitmentApplicantEligible(profile: Pick<ProductionMemberProfile, "status">): boolean {
  return profile.status === "PREPARATORY";
}

export function mapRecruitmentApplicationDraft(
  draft: RecruitmentApplicationDraft,
): SubmitApplicationDto {
  const centers = [draft.firstChoice, draft.secondChoice, draft.thirdChoice]
    .filter((center): center is RecruitmentCenter => Boolean(center));
  return {
    contact: draft.contact.trim(),
    preferences: centers.map((center, index) => ({
      rank: index + 1,
      centerId: CENTER_ID_BY_NAME[center],
    })),
    ...(draft.baizeDirection ? { baizeDirection: API_BAIZE_DIRECTION_BY_NAME[draft.baizeDirection] } : {}),
    acceptsAdjustment: draft.acceptsAdjustment === true,
  };
}

export function mapRecruitmentApplicationUpdatePayload(
  draft: RecruitmentApplicationDraft,
  expectedVersion: number,
): UpdateApplicationDto {
  return {
    ...mapRecruitmentApplicationDraft(draft),
    expectedVersion,
  };
}

function mapApplicationStatus(status: MyRecruitmentApplicationResponseDto["status"]): SubmittedRecruitmentApplication["status"] {
  if (status === "WITHDRAWN") return "withdrawn";
  if (status === "PROCESSING") return "processing";
  if (status === "COMPLETED") return "completed";
  return "submitted";
}

export function mapRecruitmentApplicationResponse(
  dto: MyRecruitmentApplicationResponseDto,
  profile: ProductionMemberProfile,
  batch: PublicRecruitmentBatchView,
): SubmittedRecruitmentApplication {
  const preferences = dto.preferences
    .map((preference) => ({
      rank: preference.rank,
      center: CENTER_NAME_BY_ID[preference.center.id] ?? preference.center.name as RecruitmentCenter,
    }))
    .filter((preference): preference is { rank: 1 | 2 | 3; center: RecruitmentCenter } => RECRUITMENT_CENTERS.includes(preference.center));
  const firstChoice = preferences.find((preference) => preference.rank === 1)?.center ?? RECRUITMENT_CENTERS[0];
  return {
    id: dto.id,
    batchId: dto.batchId,
    memberId: profile.id,
    batchVersionAtSubmission: 0,
    batchNameSnapshot: batch.name,
    applicantProfileSnapshot: {
      name: profile.name,
      studentId: profile.studentId,
      grade: profile.grade,
      className: profile.className,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
    },
    firstChoice,
    secondChoice: preferences.find((preference) => preference.rank === 2)?.center,
    thirdChoice: preferences.find((preference) => preference.rank === 3)?.center,
    baizeDirection: dto.baizeDirection ? BAIZE_DIRECTION_BY_API[dto.baizeDirection] : undefined,
    contact: dto.contact,
    preferences,
    centerConfigurationSnapshot: [],
    acceptsAdjustment: dto.acceptsAdjustment,
    status: mapApplicationStatus(dto.status),
    submittedAt: dto.submittedAt,
    updatedAt: dto.withdrawnAt ?? dto.submittedAt,
    withdrawnAt: dto.withdrawnAt ?? undefined,
    lockedAt: dto.locked ? dto.submittedAt : undefined,
  };
}

export function centerIdForRecruitmentCenter(center: RecruitmentCenter): string {
  return CENTER_ID_BY_NAME[center];
}

export function recruitmentCenterForId(centerId: string): RecruitmentCenter | undefined {
  return CENTER_NAME_BY_ID[centerId];
}

export { BAIZE_DIRECTIONS };
