import { computed, reactive, ref } from "vue";
import type { MemberProfileResponseDto, UpdateMyProfileDto } from "../../packages/api-client/src";
import {
  mapMemberProfileResponse,
  mapMemberProfileUpdatePayload,
  type ProductionMemberProfile,
} from "../services/recruitment/recruitment-view-models";
import type { MemberAvatarGateway } from "../services/member-avatar/api-member-avatar.gateway";
import { resolveApiMediaUrl } from "../utils/media-url";

interface MemberProfileGateway {
  getCurrentProfile(): Promise<MemberProfileResponseDto>;
  updateCurrentProfile(payload: UpdateMyProfileDto): Promise<MemberProfileResponseDto>;
}

export interface ProductionMemberProfileDraft {
  name: string;
  studentId: string;
  grade: string;
  className: string;
  center: string;
  memberDuty: ProductionMemberProfile["memberDuty"];
  baizeDirection?: ProductionMemberProfile["baizeDirection"];
  bio: string;
  contact: string;
  avatarUrl?: string;
  avatarAssetId?: string;
  publicId?: string;
}

function emptyDraft(): ProductionMemberProfileDraft {
  return {
    name: "",
    studentId: "",
    grade: "",
    className: "",
    center: "待确定",
    memberDuty: "普通成员",
    bio: "",
    contact: "",
  };
}

function assignDraft(draft: ProductionMemberProfileDraft, profile: ProductionMemberProfile) {
  Object.assign(draft, {
    name: profile.name,
    studentId: profile.studentId,
    grade: profile.grade,
    className: profile.className,
    center: profile.center,
    memberDuty: profile.memberDuty,
    bio: profile.bio,
    contact: profile.contact,
    avatarUrl: profile.avatarUrl,
    avatarAssetId: profile.avatarAssetId,
    publicId: profile.publicId,
    baizeDirection: profile.baizeDirection,
  });
  if (!profile.avatarUrl) delete draft.avatarUrl;
  if (!profile.avatarAssetId) delete draft.avatarAssetId;
  if (!profile.publicId) delete draft.publicId;
  if (!profile.baizeDirection) delete draft.baizeDirection;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "资料请求失败，请稍后重试。";
}

function readFieldErrors(error: unknown): Record<string, string> {
  const candidate = error as { fieldErrors?: unknown };
  if (!candidate.fieldErrors || typeof candidate.fieldErrors !== "object" || Array.isArray(candidate.fieldErrors)) return {};
  return Object.fromEntries(Object.entries(candidate.fieldErrors).filter(([, value]) => typeof value === "string"));
}

export function createProductionMemberProfileController(input: {
  gateway: MemberProfileGateway;
  apiBase: string;
  avatarGateway?: MemberAvatarGateway;
}) {
  const profile = ref<ProductionMemberProfile>();
  const draft = reactive<ProductionMemberProfileDraft>(emptyDraft());
  const status = ref<"idle" | "loading" | "saving" | "success" | "error" | "conflict">("idle");
  const error = ref("");
  const fieldErrors = ref<Record<string, string>>({});
  const avatarSource = computed(() => resolveApiMediaUrl(profile.value?.avatarUrl, input.apiBase));
  let stagedAvatarFile: File | undefined;
  let stagedAvatarAssetId: string | undefined;

  async function load() {
    status.value = "loading";
    error.value = "";
    fieldErrors.value = {};
    try {
      const loaded = mapMemberProfileResponse(await input.gateway.getCurrentProfile());
      profile.value = loaded;
      assignDraft(draft, loaded);
      stagedAvatarFile = undefined;
      stagedAvatarAssetId = undefined;
      status.value = "idle";
      return loaded;
    } catch (cause) {
      profile.value = undefined;
      status.value = "error";
      error.value = errorMessage(cause);
      fieldErrors.value = readFieldErrors(cause);
      return undefined;
    }
  }

  async function save(options: { avatarFile?: File; avatarCenterId?: string; removeAvatar?: boolean } = {}) {
    const current = profile.value;
    if (!current) {
      status.value = "error";
      error.value = "资料尚未加载，无法保存。";
      return false;
    }
    status.value = "saving";
    error.value = "";
    fieldErrors.value = {};
    try {
      let avatarAssetId: string | undefined;
      const avatarChanged = Boolean(options.avatarFile || options.removeAvatar);
      if (options.avatarFile) {
        if (!input.avatarGateway) throw new Error("头像上传服务暂不可用，请刷新后重试。");
        avatarAssetId = stagedAvatarFile === options.avatarFile && stagedAvatarAssetId
          ? stagedAvatarAssetId
          : (await input.avatarGateway.upload(options.avatarFile, options.avatarCenterId)).assetId;
        stagedAvatarFile = options.avatarFile;
        stagedAvatarAssetId = avatarAssetId;
        draft.avatarAssetId = avatarAssetId;
      }
      if (options.removeAvatar) {
        if (!input.avatarGateway) throw new Error("头像删除服务暂不可用，请稍后重试。");
        await input.avatarGateway.remove();
        avatarAssetId = undefined;
        delete draft.avatarAssetId;
        stagedAvatarFile = undefined;
        stagedAvatarAssetId = undefined;
      }
      const { avatarAssetId: _currentAvatarAssetId, ...profileDraft } = draft;
      const payloadDraft = avatarChanged ? { ...profileDraft, avatarAssetId } : profileDraft;
      await input.gateway.updateCurrentProfile(mapMemberProfileUpdatePayload(current, payloadDraft));
      const reloaded = mapMemberProfileResponse(await input.gateway.getCurrentProfile());
      profile.value = reloaded;
      assignDraft(draft, reloaded);
      stagedAvatarFile = undefined;
      stagedAvatarAssetId = undefined;
      status.value = "success";
      return true;
    } catch (cause) {
      const apiError = cause as { status?: number; code?: string };
      if (apiError?.status === 409 || apiError?.code?.includes("CONFLICT")) {
        status.value = "conflict";
        error.value = "资料已被其他修改，请重新加载后再保存。";
      } else {
        status.value = "error";
        error.value = errorMessage(cause);
      }
      fieldErrors.value = readFieldErrors(cause);
      return false;
    }
  }

  async function removeAvatar() {
    if (!input.avatarGateway) {
      error.value = "头像删除服务暂不可用，请稍后重试。";
      status.value = "error";
      return false;
    }
    status.value = "saving";
    error.value = "";
    fieldErrors.value = {};
    try {
      await input.avatarGateway.remove();
      const reloaded = mapMemberProfileResponse(await input.gateway.getCurrentProfile());
      profile.value = reloaded;
      assignDraft(draft, reloaded);
      status.value = "success";
      return true;
    } catch (cause) {
      status.value = "error";
      error.value = errorMessage(cause);
      fieldErrors.value = readFieldErrors(cause);
      return false;
    }
  }

  function resetDraft() {
    if (profile.value) assignDraft(draft, profile.value);
    stagedAvatarFile = undefined;
    stagedAvatarAssetId = undefined;
    error.value = "";
    fieldErrors.value = {};
    status.value = "idle";
  }

  return { profile, draft, status, error, fieldErrors, avatarSource, load, save, removeAvatar, resetDraft };
}
