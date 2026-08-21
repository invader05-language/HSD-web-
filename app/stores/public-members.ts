import { defineStore } from "pinia";
import type { PublicMemberResponseDto } from "../../packages/api-client/src";
import type { PublicPerson } from "../data/people";
import { getOrganizationPositionLabel } from "../utils/organization-positions";

const directions: Record<string, string> = {
  HARMONYOS_DEVELOPMENT: "HarmonyOS 开发",
  BACKEND_ARCHITECTURE: "后端架构",
  AIGC_LARGE_MODEL: "大模型 AIGC",
  UI_UX_DESIGN: "UI/UX 设计",
  EMBEDDED_DEVELOPMENT: "嵌入式开发",
};

export const toPublicPerson = (member: PublicMemberResponseDto): PublicPerson => ({
  id: member.publicId,
  name: member.name,
  grade: member.grade,
  memberDuty: member.duty === "CORE" ? "核心人员" : "普通成员",
  centerSlug: member.center.publicSlug as PublicPerson["centerSlug"],
  centerName: member.center.name,
  ...(member.baizeDirection ? { baizeDirection: directions[member.baizeDirection] as PublicPerson["baizeDirection"] } : {}),
  bio: member.bio ?? member.biography ?? "",
  isCore: member.duty === "CORE",
  order: member.coreRole?.order ?? Number.MAX_SAFE_INTEGER,
  honors: member.honors.map((honor, order) => ({ ...honor, visible: true, approved: true, order })),
  ...(member.positions.length ? { positions: member.positions.map((position) => getOrganizationPositionLabel(position.type)) } : {}),
  ...(member.avatar.kind === "asset"
    ? { avatarVisible: true, avatarUrl: `/api/v1/public/media/${member.avatar.publicToken}` }
    : { avatarVisible: false }),
});

type Gateway = {
  list(): Promise<{ items: PublicMemberResponseDto[] }>;
  detail(id: string): Promise<PublicMemberResponseDto>;
};

export const usePublicMembersStore = defineStore("public-members-api", {
  state: () => ({
    items: [] as PublicPerson[],
    detail: undefined as PublicPerson | undefined,
    apiModeActive: false,
    apiLoading: false,
    apiError: null as Error | null,
  }),
  actions: {
    async refresh(gateway: Gateway) {
      this.apiModeActive = true;
      this.items = [];
      this.apiLoading = true;
      this.apiError = null;
      try {
        this.items = (await gateway.list()).items.map(toPublicPerson);
      } catch (error) {
        this.apiError = error as Error;
      } finally {
        this.apiLoading = false;
      }
    },
    async refreshDetail(gateway: Gateway, id: string) {
      this.apiModeActive = true;
      this.detail = undefined;
      this.apiLoading = true;
      this.apiError = null;
      try {
        this.detail = toPublicPerson(await gateway.detail(id));
        return this.detail;
      } catch (error) {
        this.apiError = error as Error;
        return undefined;
      } finally {
        this.apiLoading = false;
      }
    },
  },
});
