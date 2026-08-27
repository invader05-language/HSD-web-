import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  normalizeMemberGrade,
  serializeMemberGrade,
} from "../../app/utils/member-profile-form";

const root = resolve(__dirname, "../..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("Task 3 member space layout and grade compatibility", () => {
  it("normalizes backend and legacy grade values for the member UI and API", () => {
    expect(normalizeMemberGrade("2026")).toBe("2026 级");
    expect(normalizeMemberGrade("2026级")).toBe("2026 级");
    expect(normalizeMemberGrade(" 2026 级 ")).toBe("2026 级");
    expect(serializeMemberGrade("2026 级")).toBe("2026");
    expect(serializeMemberGrade("2026级")).toBe("2026");
    expect(serializeMemberGrade("大二")).toBe("大二");
  });

  it("uses the shared content width at desktop and mobile member breakpoints", () => {
    const css = read("app/assets/css/main.css");

    expect(css).not.toContain("1050px");
    expect(css).toContain(".member-space__content > .shell");
    expect(css).toContain(".member-space:not(.member-space--subpage) > main");
    expect(css).toContain(".member-profile-main");
    expect(css).toMatch(/\.member-space__content > \.shell\s*\{[^}]*var\(--content-width\)/s);
    expect(css).toMatch(/\.member-space:not\(\.member-space--subpage\) > main\s*\{[^}]*var\(--content-width\)/s);
    expect(css).toMatch(/\.member-profile-main\s*\{[^}]*var\(--content-width\)/s);
  });

  it("keeps subpage content from inheriting the overview auto-margin width rule", () => {
    const css = read("app/assets/css/main.css");

    expect(css).toContain(".member-space:not(.member-space--subpage) > main");
    expect(css).toMatch(/\.member-space--subpage\s*>\s*\.member-space__content\s*\{[^}]*justify-self:\s*stretch/s);
    expect(css).toMatch(/\.member-space--subpage\s*>\s*\.member-space__content\s*\{[^}]*margin:\s*0/s);
    expect(css).not.toMatch(/\.member-space\s*>\s*main\s*\{/s);
  });

  it("keeps MemberSpaceNav styles self-contained, including the aligned sign-out action", () => {
    const nav = read("app/components/member/MemberSpaceNav.vue");
    const css = read("app/assets/css/main.css");

    expect(nav).toContain("<style scoped>");
    expect(nav).toContain(".member-space-nav");
    expect(nav).toContain(".member-space-nav > button");
    expect(nav).toContain("@media (max-width: 900px)");
    expect(css).not.toContain(".member-space > aside");
    expect(css).not.toContain(".member-space aside nav");
  });

  it("reserves an error slot for registration and profile grid fields", () => {
    const apply = read("app/pages/join/apply.vue");
    const profile = read("app/pages/member/profile.vue");
    const css = read("app/assets/css/main.css");

    expect(apply).toContain("registration-field-error");
    expect(apply).toContain("请选择年级");
    expect(profile).toContain("member-profile-error-slot");
    expect(css).toContain(".registration-field-error");
    expect(css).toContain(".member-profile-error-slot");
    expect(css).toMatch(/min-height:\s*[^;]+;/);
  });

  it("keeps growth and honors pages on the shared member navigation", () => {
    expect(read("app/pages/member/growth.vue")).toContain('active="growth"');
    expect(read("app/pages/member/honors.vue")).toContain('active="honors"');
    expect(read("app/pages/member/growth.vue")).toContain("member-space__content");
    expect(read("app/pages/member/honors.vue")).toContain("member-space__content");
  });
});
