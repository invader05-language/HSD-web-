import { describe, expect, it } from "vitest";
import { HOME_SECTIONS, PROJECTS } from "../../app/data/home";

describe("homepage content", () => {
  it("keeps the approved section and project order", () => {
    expect(HOME_SECTIONS).toEqual([
      "hero",
      "flash",
      "stats",
      "news",
      "centers",
      "projects",
      "activities",
      "gallery",
      "members",
      "resources",
      "recruitment"
    ]);
    expect(PROJECTS[0]?.title).toBe("智巡先锋");
    expect(PROJECTS[1]?.title).toBe("智学领航");
    expect(PROJECTS[2]?.title).toBe("小白云");
  });
});
