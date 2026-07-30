import { describe, expect, it } from "vitest";
import {
  ADMIN_MEMBERS,
  filterAdminMembers,
  getPublicProfilePreview
} from "../../app/data/admin-members";

describe("administration member directory", () => {
  it("combines center identity and public-state filters", () => {
    const result = filterAdminMembers(ADMIN_MEMBERS, {
      query: "",
      center: "白泽开发中心",
      identity: "正式成员",
      publicState: "已公开"
    });

    expect(result.map((member) => member.name)).toEqual(["林同学", "高同学"]);
  });

  it("searches by member name or student id", () => {
    expect(
      filterAdminMembers(ADMIN_MEMBERS, {
        query: "20260004",
        center: "全部中心",
        identity: "全部身份",
        publicState: "全部状态"
      }).map((member) => member.name)
    ).toEqual(["王同学"]);
  });

  it("never exposes a private avatar through public preview", () => {
    const privateMember = ADMIN_MEMBERS.find((member) => member.name === "王同学");
    expect(privateMember).toBeTruthy();
    expect(getPublicProfilePreview(privateMember!).avatarUrl).toBeNull();
    expect(getPublicProfilePreview(privateMember!).usesDefaultAvatar).toBe(true);
  });
});
