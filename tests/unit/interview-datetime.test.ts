import { describe, expect, it } from "vitest";
import { interviewPickerDateToIso, parseInterviewDraftDate } from "../../app/utils/interview-datetime";

describe("interview datetime", () => {
  it("keeps an existing instant including seconds and milliseconds", () => {
    const value = "2026-09-20T01:00:12.345Z";
    expect(parseInterviewDraftDate(value)?.toISOString()).toBe(value);
  });

  it("converts a selected instant without applying UTC+8 twice", () => {
    expect(interviewPickerDateToIso(new Date("2026-09-20T09:07:00+08:00")))
      .toBe("2026-09-20T01:07:00.000Z");
  });

  it("converts only the known legacy CST format", () => {
    expect(parseInterviewDraftDate("2026-09-20 09:00")?.toISOString())
      .toBe("2026-09-20T01:00:00.000Z");
  });

  it.each([
    "", "2026-02-30 09:00", "2026-02-30T09:00:00+08:00",
    "2026-09-20 25:00", "09/20/2026 09:00", "2026-09-20T09:00:00",
  ])("rejects invalid or ambiguous value %s", (value) => {
    expect(parseInterviewDraftDate(value)).toBeNull();
  });

  it("clears to an empty form value", () => {
    expect(interviewPickerDateToIso(null)).toBe("");
  });
});
