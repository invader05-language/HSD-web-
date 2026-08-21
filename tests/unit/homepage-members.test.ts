import { describe, expect, it } from "vitest";
import type { PublicPerson } from "../../app/data/people";
import { selectHomepageMembers } from "../../app/utils/homepage-members";

const HOMEPAGE_MEMBER_IDS = [
  "7f348c64dca58cb8c683e46401b79916",
  "9b20dc18af4c93473ddc40826de0972a",
  "960ed92955726195b5dbf55c6b0307b5",
] as const;

function person(overrides: Partial<PublicPerson> = {}): PublicPerson {
  return {
    id: "unrelated-member",
    name: "Unrelated member",
    memberDuty: "ordinary" as PublicPerson["memberDuty"],
    centerSlug: "baize-development",
    centerName: "Baize Development Center",
    bio: "",
    isCore: false,
    order: 1,
    honors: [],
    positions: [],
    avatarVisible: false,
    ...overrides,
  };
}

describe("homepage member projection", () => {
  it("keeps the approved leadership roster in its explicit public-id order", () => {
    const cards = selectHomepageMembers([
      person({
        id: HOMEPAGE_MEMBER_IDS[2],
        name: "Li Jingbiao",
        centerName: "Baize Development Center",
        isCore: true,
        positions: ["CENTER_MINISTER"],
      }),
      person({ id: "ordinary-first", name: "Ordinary first", order: 0 }),
      person({
        id: HOMEPAGE_MEMBER_IDS[1],
        name: "Guo Zhanliang",
        centerName: "Alliance",
        isCore: true,
        positions: ["ALLIANCE_OWNER"],
      }),
      person({
        id: HOMEPAGE_MEMBER_IDS[0],
        name: "Xu Yiming",
        centerName: "Alliance",
        isCore: true,
        positions: ["ALLIANCE_OWNER"],
      }),
    ]);

    expect(cards.map((card) => card.id)).toEqual(HOMEPAGE_MEMBER_IDS);
    expect(cards.map((card) => card.name)).toEqual(["Xu Yiming", "Guo Zhanliang", "Li Jingbiao"]);
    expect(cards.map((card) => card.summary)).toEqual([
      "\u8054\u76df\u8d1f\u8d23\u4eba \u00b7 Alliance",
      "\u8054\u76df\u8d1f\u8d23\u4eba \u00b7 Alliance",
      "\u90e8\u957f \u00b7 Baize Development Center",
    ]);
  });

  it("does not replace an unavailable approved member with an unrelated person", () => {
    const cards = selectHomepageMembers([
      person({ id: HOMEPAGE_MEMBER_IDS[0], name: "Xu Yiming", isCore: true, positions: ["ALLIANCE_OWNER"] }),
      person({ id: HOMEPAGE_MEMBER_IDS[2], name: "Li Jingbiao", isCore: true, positions: ["CENTER_MINISTER"] }),
      person({ id: "ordinary-first", name: "Ordinary first", order: 0 }),
    ]);

    expect(cards.map((card) => card.id)).toEqual([HOMEPAGE_MEMBER_IDS[0], HOMEPAGE_MEMBER_IDS[2]]);
  });
});
