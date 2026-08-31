import { describe, expect, it } from "vitest";
import { dateTimeLocalToIso, isoToDateTimeLocal } from "../../app/utils/activity-datetime";

describe("activity deadline datetime conversion", () => {
  it("converts Beijing datetime-local values to UTC ISO values", () => {
    expect(dateTimeLocalToIso("2026-09-01T12:52")).toBe("2026-09-01T04:52:00.000Z");
  });

  it("converts persisted UTC values back to the Beijing form value", () => {
    expect(isoToDateTimeLocal("2026-09-01T04:52:00.000Z")).toBe("2026-09-01T12:52");
  });

  it("uses an empty value for missing or invalid deadlines", () => {
    expect(isoToDateTimeLocal(null)).toBe("");
    expect(isoToDateTimeLocal("not-a-date")).toBe("");
    expect(dateTimeLocalToIso("")).toBeNull();
  });
});
