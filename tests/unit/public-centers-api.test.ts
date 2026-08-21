import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePublicCentersStore } from "../../app/stores/public-centers";

const owner = {
  publicId: "owner-xu",
  name: "徐一鸣",
  grade: "2024",
  className: "计算机科学与技术 1 班",
  avatar: { kind: "default" as const, variant: "white-hsd" as const },
  center: { publicSlug: "baize-development", name: "白泽开发中心" },
  duty: "CORE" as const,
  honors: [],
  positions: [{ type: "ALLIANCE_OWNER" as const }],
};

const ministerOne = {
  ...owner,
  publicId: "minister-li",
  name: "李泽宇",
  positions: [{ type: "CENTER_MINISTER" as const, centerPublicSlug: "new-media" }],
};

const ministerTwo = {
  ...owner,
  publicId: "minister-chen",
  name: "陈奕伟",
  positions: [{ type: "CENTER_MINISTER" as const, centerPublicSlug: "new-media" }],
};

describe("public center API projections", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("keeps every public alliance owner and every center minister from the live organization responses", async () => {
    const store = usePublicCentersStore();
    const gateway = {
      publicCenters: vi.fn(async () => ({
        allianceOwners: [owner],
        items: [{ publicSlug: "new-media", name: "新媒体中心", publicMemberCount: 2, publicCoreMemberCount: 2 }],
      })),
      publicCenter: vi.fn(async () => ({
        publicSlug: "new-media",
        name: "新媒体中心",
        publicMemberCount: 2,
        publicCoreMemberCount: 2,
        ministers: [ministerOne, ministerTwo],
        members: [ministerOne, ministerTwo],
        coreMembers: [ministerOne, ministerTwo],
      })),
    };

    await store.refreshList(gateway);
    await store.refreshDetail(gateway, "new-media");

    expect(store.allianceOwners.map((person) => ({ name: person.name, positions: person.positions }))).toEqual([
      { name: "徐一鸣", positions: ["联盟负责人"] },
    ]);
    expect(store.detail?.ministers.map((person) => person.name)).toEqual(["李泽宇", "陈奕伟"]);
    expect(store.detail?.ministers.every((person) => person.positions?.includes("部长"))).toBe(true);
  });
});
