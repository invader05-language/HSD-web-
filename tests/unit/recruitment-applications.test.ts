import { describe, expect, expectTypeOf, it } from "vitest";
import {
  ADMIN_CANDIDATES,
  type AdminCandidate,
  filterAndSortRecruitmentApplications,
  findRecruitmentApplication,
  formatRecruitmentApplicationSubmittedAt,
  requireRecruitmentApplication
} from "../../app/data/recruitment-admin";
import {
  BAIZE_DIRECTIONS,
  isBaizeDirection,
  type BaizeDirection,
} from "../../app/data/recruitment-application";

describe("recruitment application directory", () => {
  it("uses the shared five-value Baize direction contract", () => {
    expectTypeOf<AdminCandidate["baizeDirection"]>()
      .toEqualTypeOf<BaizeDirection | undefined>();
    expect(ADMIN_CANDIDATES.every((candidate) => (
      candidate.baizeDirection === undefined
      || BAIZE_DIRECTIONS.includes(candidate.baizeDirection)
    ))).toBe(true);
    expect(isBaizeDirection("鸿蒙开发")).toBe(true);
    expect(isBaizeDirection("任意方向")).toBe(false);
  });

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

  it("formats the submitted timestamp instead of the mutable workflow timestamp", () => {
    expect(formatRecruitmentApplicationSubmittedAt({
      submittedAt: "2026-07-30T14:28:00.000Z"
    })).toBe("2026-07-30 14:28");
  });

  it("requires an existing application with the specified 404 error details", () => {
    expect(requireRecruitmentApplication("candidate-lin").name).toBe("林同学");
    let error: unknown;
    try {
      requireRecruitmentApplication("missing");
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      statusCode: 404,
      statusMessage: "报名记录不存在"
    });
  });
});
