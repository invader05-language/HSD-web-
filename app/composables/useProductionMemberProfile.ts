import { computed, reactive, ref } from "vue";
import type { MemberProfileResponseDto, UpdateMyProfileDto } from "../../packages/api-client/src";
import {
  mapMemberProfileResponse,
  mapMemberProfileUpdatePayload,
  type ProductionMemberProfile,
} from "../services/recruitment/recruitment-view-models";
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
    publicId: profile.publicId,
    baizeDirection: profile.baizeDirection,
  });
  if (!profile.avatarUrl) delete draft.avatarUrl;
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

  async function save() {
    const current = profile.value;
    if (!current) {
      status.value = "error";
      error.value = "资料尚未加载，无法保存。";
      return false;
    }
    status.value = "saving";
    error.value = "";
    try {
      await input.gateway.updateCurrentProfile(mapMemberProfileUpdatePayload(current, draft));
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

  function resetDraft() {
    if (profile.value) assignDraft(draft, profile.value);
    error.value = "";
    status.value = "idle";
  }

  return { profile, draft, status, error, avatarSource, load, save, resetDraft };
}
