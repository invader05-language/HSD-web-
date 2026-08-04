import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { CENTERS as homeCenters } from "../../app/data/home";
import { CENTER_OPTIONS, CENTERS, getCenterBySlug } from "../../app/data/centers";
import {
  CORE_PEOPLE,
  findPublicPerson,
  getFeaturedHonors,
  getPeopleByCenter,
  PUBLIC_MEMBERS,
  resolvePublicAvatar,
} from "../../app/data/people";
import { DEMO_MEMBER_PROFILE } from "../../app/data/member-profile";
import { useMemberRepository } from "../../app/composables/useMemberRepository";
import { useMemberProfileStore } from "../../app/stores/member-profile";
import { useAdminAccessStore } from "../../app/stores/admin-access";

describe("public people and center directory", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

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

  it("publishes six explicitly named mock core people in display order", () => {
    expect(CORE_PEOPLE.map((person) => person.id)).toEqual([
      "lin-development",
      "chen-media",
      "zhou-planning",
      "wu-talent",
      "zheng-development",
      "luo-talent"
    ]);
    expect(CORE_PEOPLE.every((person) => person.isCore)).toBe(true);
  });

  it("publishes six explicitly named mock members in display order", () => {
    expect(PUBLIC_MEMBERS.map((person) => person.id)).toEqual([
      "guo-development",
      "he-media",
      "fang-planning",
      "sun-talent",
      "xu-media",
      "tang-planning"
    ]);
    expect(PUBLIC_MEMBERS.every((person) => !person.isCore)).toBe(true);
  });

  it("publishes only normalized member duties and Baize-only directions", () => {
    const people = [...CORE_PEOPLE, ...PUBLIC_MEMBERS];
    expect(people.every((person) => ["普通成员", "核心人员"].includes(person.memberDuty))).toBe(true);
    expect(people.filter((person) => person.centerSlug === "baize-development")
      .every((person) => person.baizeDirection)).toBe(true);
    expect(people.filter((person) => person.centerSlug !== "baize-development")
      .every((person) => person.baizeDirection === undefined)).toBe(true);
    expect(people.every((person) => !Object.hasOwn(person, "direction"))).toBe(true);
  });

  it("removes a stored member from the public directory as soon as they become preparatory", () => {
    const profileStore = useMemberProfileStore();
    const repository = useMemberRepository();
    const publicId = DEMO_MEMBER_PROFILE.publicId!;

    expect(repository.findPublicPerson(publicId)).toBeDefined();
    profileStore.profiles[DEMO_MEMBER_PROFILE.id] = {
      ...profileStore.getProfile(DEMO_MEMBER_PROFILE.id),
      identity: "预备成员",
    };

    expect(repository.findPublicPerson(publicId)).toBeUndefined();
  });

  it("derives a static public person's core state from member duty instead of legacy isCore", () => {
    const person = CORE_PEOPLE.find((item) => item.id === "chen-media")!;
    const originalDuty = person.memberDuty;

    try {
      person.memberDuty = "普通成员";
      expect(person.isCore).toBe(true);

      const repository = useMemberRepository();

      expect(repository.findPublicPerson(person.id)?.isCore).toBe(false);
    } finally {
      person.memberDuty = originalDuty;
    }
  });

  it("adds a uniquely matched static center lead to the public core projection", () => {
    const person = CORE_PEOPLE.find((item) => item.id === "wu-talent")!;
    const originalDuty = person.memberDuty;
    const accessStore = useAdminAccessStore();
    const owner = { account: "admin-alliance", name: "张同学", level: "owner" } as const;

    try {
      person.memberDuty = "普通成员";
      const repository = useMemberRepository();

      expect(repository.findPublicPerson(person.id)?.isCore).toBe(false);
      expect(accessStore.assignAdminCenterRole(
        "member-wu",
        "人才发展中心负责人",
        owner,
      )).toBe(true);
      expect(repository.findPublicPerson(person.id)?.isCore).toBe(true);
    } finally {
      person.memberDuty = originalDuty;
    }
  });

  it("returns the approved public people for each center", () => {
    expect(getPeopleByCenter("baize-development").map((person) => person.id)).toEqual([
      "lin-development",
      "zheng-development",
      "guo-development"
    ]);
    expect(getPeopleByCenter("new-media").map((person) => person.id)).toEqual([
      "chen-media",
      "he-media",
      "xu-media"
    ]);
    expect(getPeopleByCenter("tuowei-planning").map((person) => person.id)).toEqual([
      "zhou-planning",
      "fang-planning",
      "tang-planning"
    ]);
    expect(getPeopleByCenter("talent-development").map((person) => person.id)).toEqual([
      "wu-talent",
      "luo-talent",
      "sun-talent"
    ]);
  });

  it("ships hidden-avatar public records without an avatar URL", () => {
    const hiddenPeople = [...CORE_PEOPLE, ...PUBLIC_MEMBERS].filter(
      (person) => !person.avatarVisible
    );

    expect(hiddenPeople).toHaveLength(12);
    expect(hiddenPeople.every((person) => !Object.hasOwn(person, "avatarUrl"))).toBe(true);
    expect(hiddenPeople.every((person) => resolvePublicAvatar(person) === undefined)).toBe(true);
  });

  it("limits public directory cards to three featured honors", () => {
    const person = findPublicPerson("lin-development");

    expect(person).toBeDefined();
    expect(getFeaturedHonors(person!)).toHaveLength(3);
    expect(getFeaturedHonors(person!).every((honor) => honor.featured)).toBe(true);
  });

  it("keeps every published honor approved and public", () => {
    for (const person of [...CORE_PEOPLE, ...PUBLIC_MEMBERS]) {
      expect(person.honors.every((honor) => honor.approved && honor.visible)).toBe(true);
      expect(getFeaturedHonors(person).length).toBeLessThanOrEqual(3);
      for (const honor of person.honors) {
        expect(Object.keys(honor).sort()).toEqual([
          "approved",
          "awardedAt",
          "description",
          "featured",
          "id",
          "order",
          "title",
          "visible"
        ]);
      }
    }

    expect(findPublicPerson("missing")).toBeUndefined();
  });
});
