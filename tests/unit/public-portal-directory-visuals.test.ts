import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(`${process.cwd()}/${path}`, "utf8");
}

describe("public portal directory and visual rules", () => {
  it("uses a plain HSD fallback mark that fits compact navigation avatars", () => {
    const avatar = source("app/components/HsdAvatar.vue");
    const styles = source("app/assets/css/main.css");

    expect(avatar).toContain("<span>HSD</span>");
    expect(avatar).not.toContain("&lt; HSD &gt;");
    expect(styles).toContain(".hsd-avatar__fallback");
    expect(styles).not.toContain("letter-spacing: -0.05em");
  });

  it("paginates both public people directories with a shared page size", () => {
    const core = source("app/pages/people/core.vue");
    const members = source("app/pages/people/members.vue");

    expect(core).toContain("const pageSize = 12;");
    expect(members).toContain("const pageSize = 12;");
    expect(core).toContain("<PaginationControls");
    expect(members).toContain("<PaginationControls");
    expect(core).toContain("currentPage.value = 1");
    expect(members).toContain("currentPage.value = 1");
  });

  it("anchors member detail actions to the bottom of every directory card", () => {
    const styles = source("app/assets/css/main.css");

    expect(styles).toContain(".people-member-card__content .directory-card__action");
    expect(styles).toMatch(/\.people-member-card__content \.directory-card__action\s*\{[^}]*margin-top:\s*auto;/s);
  });

  it("removes the standalone center collaboration flow block", () => {
    const centers = source("app/pages/centers.vue");

    expect(centers).not.toContain("一个项目如何跨中心推进");
    expect(centers).not.toContain("collaboration-flow");
  });

  it("uses a restrained center-row hover treatment", () => {
    const styles = source("app/assets/css/main.css");

    expect(styles).toContain(".center-detail-row:hover");
    expect(styles).toContain("inset 4px 0 0 var(--brand-red)");
    expect(styles).toMatch(/\.center-detail-row\s*\{[^}]*padding-left:\s*24px;/s);
    expect(styles).not.toContain(".center-detail-row:hover,\n.center-detail-row:focus-visible {\n  background: #fff;");
  });

  it("uses a project-specific empty state with a reset action", () => {
    const projects = source("app/pages/projects/index.vue");

    expect(projects).toContain("projects-empty-state");
    expect(projects).toContain("该分类暂未收录项目");
    expect(projects).toContain("查看全部项目");
  });
});
