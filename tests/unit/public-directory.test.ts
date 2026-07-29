import { describe, expect, it } from "vitest";
import { CENTERS as homeCenters } from "../../app/data/home";
import { CENTER_OPTIONS, CENTERS, getCenterBySlug } from "../../app/data/centers";
import {
  CORE_PEOPLE,
  getPeopleByCenter,
  resolvePublicAvatar,
  type PublicPerson
} from "../../app/data/people";

describe("public people and center directory", () => {
  it("publishes the four approved centers in collaboration order", () => {
    expect(CENTERS.map((center) => center.slug)).toEqual([
      "baize-development",
      "new-media",
      "tuowei-planning",
      "talent-development"
    ]);
    expect(getCenterBySlug("new-media")?.title).toBe("新媒体中心");
    expect(getCenterBySlug("missing")).toBeUndefined();
  });

  it("provides center filter options in the approved center order", () => {
    expect(CENTER_OPTIONS).toEqual([
      { value: "baize-development", label: "白泽开发中心" },
      { value: "new-media", label: "新媒体中心" },
      { value: "tuowei-planning", label: "拓维策划中心" },
      { value: "talent-development", label: "人才发展中心" }
    ]);
  });

  it("keeps the homepage center import compatible", () => {
    expect(homeCenters).toBe(CENTERS);
  });

  it("keeps the core directory populated with core people", () => {
    expect(CORE_PEOPLE).not.toHaveLength(0);
    expect(CORE_PEOPLE.every((person) => person.isCore)).toBe(true);
  });

  it("returns the approved public people for each center", () => {
    expect(getPeopleByCenter("baize-development").map((person) => person.id)).toEqual([
      "lin-development",
      "guo-development"
    ]);
    expect(getPeopleByCenter("new-media").map((person) => person.id)).toEqual([
      "chen-media",
      "he-media"
    ]);
    expect(getPeopleByCenter("tuowei-planning").map((person) => person.id)).toEqual([
      "zhou-planning",
      "fang-planning"
    ]);
    expect(getPeopleByCenter("talent-development").map((person) => person.id)).toEqual([
      "wu-talent",
      "sun-talent"
    ]);
  });

  it("never exposes a private avatar URL", () => {
    const privatePerson: PublicPerson = {
      id: "private-avatar",
      name: "测试成员",
      role: "成员",
      centerSlug: "new-media",
      centerName: "新媒体中心",
      direction: "影像记录",
      bio: "该头像选择不公开。",
      avatarUrl: "/avatars/private-avatar.jpg",
      avatarVisible: false,
      isCore: false,
      order: 99
    };

    expect(resolvePublicAvatar(privatePerson)).toBeUndefined();
  });
});
