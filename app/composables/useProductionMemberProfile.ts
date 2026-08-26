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

export function createProductionMemberProfileController(input: {
  gateway: MemberProfileGateway;
  apiBase: string;
  avatarGateway?: MemberAvatarGateway;
}) {
  const profile = ref<ProductionMemberProfile>();
  const draft = reactive<ProductionMemberProfileDraft>(emptyDraft());
  const status = ref<"idle" | "loading" | "saving" | "success" | "error" | "conflict">("idle");
  const error = ref("");
  const avatarSource = computed(() => resolveApiMediaUrl(profile.value?.avatarUrl, input.apiBase));

  async function load() {
    status.value = "loading";
    error.value = "";
    try {
      const loaded = mapMemberProfileResponse(await input.gateway.getCurrentProfile());
      profile.value = loaded;
      assignDraft(draft, loaded);
      status.value = "idle";
      return loaded;
    } catch (cause) {
      profile.value = undefined;
      status.value = "error";
      error.value = errorMessage(cause);
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
    try {
      let avatarAssetId: string | undefined;
      const avatarChanged = Boolean(options.avatarFile || options.removeAvatar);
      if (options.avatarFile) {
        if (!input.avatarGateway) throw new Error("头像上传服务暂不可用，请刷新后重试。");
        avatarAssetId = (await input.avatarGateway.upload(options.avatarFile, options.avatarCenterId)).assetId;
        draft.avatarAssetId = avatarAssetId;
      }
      if (options.removeAvatar) {
        if (!input.avatarGateway) throw new Error("头像删除服务暂不可用，请稍后重试。");
        await input.avatarGateway.remove();
        avatarAssetId = undefined;
        delete draft.avatarAssetId;
      }
      const { avatarAssetId: _currentAvatarAssetId, ...profileDraft } = draft;
      const payloadDraft = avatarChanged ? { ...profileDraft, avatarAssetId } : profileDraft;
      await input.gateway.updateCurrentProfile(mapMemberProfileUpdatePayload(current, payloadDraft));
      const reloaded = mapMemberProfileResponse(await input.gateway.getCurrentProfile());
      profile.value = reloaded;
      assignDraft(draft, reloaded);
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
      return false;
    }
  }

  function resetDraft() {
    if (profile.value) assignDraft(draft, profile.value);
    error.value = "";
    status.value = "idle";
  }

  return { profile, draft, status, error, avatarSource, load, save, removeAvatar, resetDraft };
}
