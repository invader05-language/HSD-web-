import { describe, expect, it } from "vitest";
import { CENTERS as homeCenters } from "../../app/data/home";
import { CENTERS, getCenterBySlug } from "../../app/data/centers";
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

  it("keeps the homepage center import compatible", () => {
    expect(homeCenters).toBe(CENTERS);
  });

  it("returns only core people for a center and keeps their core status", () => {
    expect(CORE_PEOPLE.every((person) => person.isCore)).toBe(true);
    expect(getPeopleByCenter("baize-development").every(
      (person) => person.centerSlug === "baize-development"
    )).toBe(true);
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
