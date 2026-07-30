import { describe, expect, it } from "vitest";
import {
  ADMIN_CANDIDATES,
  filterRecruitmentCandidates,
  getRecruitmentCounts
} from "../../app/data/recruitment-admin";

describe("recruitment administration prototype data", () => {
  it("groups candidates by first preference", () => {
    const result = filterRecruitmentCandidates(ADMIN_CANDIDATES, {
      center: "白泽开发中心",
      query: "",
      stage: "全部阶段",
      result: "全部结果",
      adjustment: "全部"
    });

    expect(result).toHaveLength(3);
    expect(result.every((candidate) => candidate.preferences[0] === "白泽开发中心")).toBe(true);
  });

  it("combines search and status filters", () => {
    const result = filterRecruitmentCandidates(ADMIN_CANDIDATES, {
      center: "全部人员",
      query: "陈",
      stage: "线下结果待录入",
      result: "待处理",
      adjustment: "接受调剂"
    });

    expect(result.map((candidate) => candidate.name)).toEqual(["陈同学"]);
  });

  it("reports the four overview counts used by the workbench", () => {
    expect(getRecruitmentCounts(ADMIN_CANDIDATES)).toEqual({
      preparatory: 8,
      assessing: 5,
      admitted: 2,
      notAdmitted: 1
    });
  });
});
