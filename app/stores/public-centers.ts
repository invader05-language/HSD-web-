import { defineStore } from "pinia";
import type {
  PublicCenterDetailResponseDto,
  PublicCenterListResponseDto,
} from "../../packages/api-client/src";
import type { PublicPerson } from "../data/people";
import { toPublicPerson } from "./public-members";

type PublicCentersGateway = {
  publicCenters(): Promise<PublicCenterListResponseDto>;
  publicCenter(publicSlug: string): Promise<PublicCenterDetailResponseDto>;
};

export interface PublicCenterDetailView {
  publicSlug: string;
  name: string;
  publicMemberCount: number;
  publicCoreMemberCount: number;
  ministers: PublicPerson[];
  members: PublicPerson[];
  coreMembers: PublicPerson[];
}

function normalizeCenterName(name: string): string {
  return name.replace(/^QA\s+/i, "").trim();
}

export const usePublicCentersStore = defineStore("public-centers-api", {
  state: () => ({
    allianceOwners: [] as PublicPerson[],
    items: [] as PublicCenterListResponseDto["items"],
    detail: undefined as PublicCenterDetailView | undefined,
    apiLoading: false,
    apiError: null as Error | null,
  }),
  actions: {
    async refreshList(gateway: PublicCentersGateway) {
      this.apiLoading = true;
      this.apiError = null;
      try {
        const response = await gateway.publicCenters();
        this.items = response.items ?? [];
        this.allianceOwners = response.allianceOwners.map(toPublicPerson);
      } catch (error) {
        this.items = [];
        this.allianceOwners = [];
        this.apiError = error as Error;
      } finally {
        this.apiLoading = false;
      }
    },
    resolvePublicSlug(centerSlug: string, centerName: string): string {
      const direct = this.items.find((item) => item.publicSlug === centerSlug);
      if (direct) return direct.publicSlug;
      const normalizedName = normalizeCenterName(centerName);
      return this.items.find((item) => normalizeCenterName(item.name) === normalizedName)?.publicSlug ?? centerSlug;
    },
    async refreshDetail(gateway: PublicCentersGateway, publicSlug: string) {
      this.apiLoading = true;
      this.apiError = null;
      try {
        const detail = await gateway.publicCenter(publicSlug);
        this.detail = {
          publicSlug: detail.publicSlug,
          name: detail.name,
          publicMemberCount: detail.publicMemberCount,
          publicCoreMemberCount: detail.publicCoreMemberCount,
          ministers: detail.ministers.map(toPublicPerson),
          members: detail.members.map(toPublicPerson),
          coreMembers: detail.coreMembers.map(toPublicPerson),
        };
        return this.detail;
      } catch (error) {
        this.detail = undefined;
        this.apiError = error as Error;
        return undefined;
      } finally {
        this.apiLoading = false;
      }
    },
  },
});
