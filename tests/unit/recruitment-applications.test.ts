import { describe, expect, it } from "vitest";
import {
  ADMIN_CANDIDATES,
  filterAndSortRecruitmentApplications,
  findRecruitmentApplication
} from "../../app/data/recruitment-admin";

describe("recruitment application directory", () => {
  it("filters applications by applicant and first-choice center", () => {
    expect(filterAndSortRecruitmentApplications(ADMIN_CANDIDATES, {
      query: "林",
      firstChoice: "全部中心",
      sort: "submittedAt.desc"
    }).map((item) => item.id)).toEqual(["candidate-lin"]);
  });

  it("sorts applications by their ISO submission timestamp without mutating the source", () => {
    const sourceIds = ADMIN_CANDIDATES.map((candidate) => candidate.id);
    const result = filterAndSortRecruitmentApplications(ADMIN_CANDIDATES, {
      query: "",
      firstChoice: "全部中心",
      sort: "submittedAt.asc"
    });

    expect(result[0]?.id).toBe("candidate-wu");
    expect(ADMIN_CANDIDATES.map((candidate) => candidate.id)).toEqual(sourceIds);
  });

  it("finds a known application and returns undefined for an unknown id", () => {
    expect(findRecruitmentApplication("candidate-lin")?.name).toBe("林同学");
    expect(findRecruitmentApplication("missing")).toBeUndefined();
  });
});
