import { describe, expect, it } from "vitest";
import type { AdminMember } from "../../app/data/admin-members";
import { describeOrganizationMember } from "../../app/utils/organization-member-display";

const baseMember: AdminMember = {
  id: "member-1",
  name: "成员",
  studentId: "2026001001",
  center: "新媒体中心",
  identity: "正式成员",
  grade: "2026",
  memberDuty: "普通成员",
  avatarUrl: null,
  profileSummary: "",
  updatedAt: "API",
};

describe("organization member display", () => {
  it("does not invent a center minister when the member has no organization position", () => {
    expect(describeOrganizationMember(baseMember)).toEqual({
      dutyLabel: "普通成员",
      isCore: false,
      positionLabels: [],
    });
  });

  it("renders membership duty independently from all organization positions", () => {
    expect(describeOrganizationMember({
      ...baseMember,
      memberDuty: "核心人员",
      organizationPositions: ["ALLIANCE_OWNER", "CENTER_MINISTER", "PROJECT_LEAD"],
    })).toEqual({
      dutyLabel: "核心人员",
      isCore: true,
      positionLabels: ["联盟负责人", "部长", "项目负责人"],
    });
  });

  it("keeps legacy mock center leadership displayable as a minister position only in mock data", () => {
    expect(describeOrganizationMember({ ...baseMember, centerLeadership: "新媒体中心负责人" })).toEqual({
      dutyLabel: "普通成员",
      isCore: false,
      positionLabels: ["部长"],
    });
  });
});
