import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePublicCentersStore } from "../../app/stores/public-centers";

const member = (publicId: string, name: string, duty: "CORE" | "REGULAR") => ({
  publicId,
  name,
  grade: "2025",
  className: "计算机科学与技术 1 班",
  avatar: { kind: "default", variant: "white-hsd" },
  center: { publicSlug: "new-media", name: "新媒体中心" },
  duty,
  honors: [],
  positions: [],
});

describe("public centers store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("keeps the full public center member snapshot, including core members", async () => {
    const gateway = {
      publicCenter: vi.fn(async () => ({
        publicSlug: "new-media",
        name: "新媒体中心",
        publicMemberCount: 2,
        publicCoreMemberCount: 1,
        ministers: [member("minister-1", "李泽宇", "CORE")],
        members: [member("minister-1", "李泽宇", "CORE"), member("member-1", "普通成员1", "REGULAR")],
        coreMembers: [member("minister-1", "李泽宇", "CORE")],
      })),
    };

    const store = usePublicCentersStore();
    await store.refreshDetail(gateway, "new-media");

    expect(store.detail?.members.map((item) => item.name)).toEqual(["李泽宇", "普通成员1"]);
    expect(store.detail?.coreMembers.map((item) => item.name)).toEqual(["李泽宇"]);
    expect(store.detail?.ministers.map((item) => item.name)).toEqual(["李泽宇"]);
  });
});
