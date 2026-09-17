import { describe, expect, it } from "vitest";
import {
  formatInterviewSlotRange,
  getInterviewSlotAvailability,
  hasPublishReadyInterviewSlots,
  interviewSlotCapacityLabel,
  validateInterviewSlotDrafts,
} from "../../app/utils/recruitment-interview-slots";

const now = new Date("2026-09-15T00:00:00.000Z");
const slot = {
  id: "slot-1",
  startAt: "2026-09-20T01:00:00.000Z",
  endAt: "2026-09-20T01:30:00.000Z",
  timezone: "Asia/Shanghai" as const,
  capacity: 3,
  confirmedCount: 1,
  status: "ACTIVE" as const,
  version: 1,
};

describe("recruitment interview slots", () => {
  it("formats instants in China Standard Time and exposes capacity labels", () => {
    expect(formatInterviewSlotRange(slot)).toBe("2026-09-20 09:00—09:30（中国标准时间）");
    expect(interviewSlotCapacityLabel(slot)).toBe("剩余 2 位");
    expect(interviewSlotCapacityLabel({ ...slot, remainingCapacity: 1 })).toBe("剩余 1 位");
    expect(interviewSlotCapacityLabel({ ...slot, capacity: null })).toBe("不限人数");
    expect(interviewSlotCapacityLabel({ ...slot, confirmedCount: 3 })).toBe("已满");
  });

  it("only allows active, future and non-full slots", () => {
    expect(getInterviewSlotAvailability(slot, now)).toMatchObject({ selectable: true, remainingCapacity: 2 });
    expect(getInterviewSlotAvailability({ ...slot, confirmedCount: 3 }, now).selectable).toBe(false);
    expect(getInterviewSlotAvailability({ ...slot, status: "RETIRED" }, now).selectable).toBe(false);
    expect(getInterviewSlotAvailability({ ...slot, startAt: "2026-09-14T01:00:00.000Z" }, now).selectable).toBe(false);
  });

  it("allows a future active slot before registration closes", () => {
    expect(hasPublishReadyInterviewSlots([
      { ...slot, startAt: "2026-09-18T01:00:00.000Z" },
    ], now.toISOString())).toBe(true);
  });

  it("does not treat started slots as publish-ready", () => {
    expect(hasPublishReadyInterviewSlots([
      { ...slot, startAt: "2026-09-14T01:00:00.000Z" },
    ], now.toISOString())).toBe(false);
  });

  it("validates repeatable editor rows and positive integer capacity", () => {
    expect(validateInterviewSlotDrafts([
      { startAt: "2026-09-20 09:00", endAt: "2026-09-20 09:30", capacity: "20" },
    ])).toEqual([]);
    expect(validateInterviewSlotDrafts([
      { startAt: "", endAt: "2026-09-20 09:30", capacity: "0" },
    ])).toEqual([
      "第 1 个时段请选择有效的开始时间。",
      "第 1 个时段名额必须为正整数，留空表示不限人数。",
    ]);
  });

  it("distinguishes an end time that is not after the start", () => {
    expect(validateInterviewSlotDrafts([
      { startAt: "2026-09-20T01:30:00.000Z", endAt: "2026-09-20T01:30:00.000Z", capacity: "" },
    ])).toEqual(["第 1 个时段结束时间必须晚于开始时间。"]);
    expect(validateInterviewSlotDrafts([
      { startAt: "2026-09-20T02:00:00.000Z", endAt: "2026-09-20T01:30:00.000Z", capacity: "" },
    ])).toEqual(["第 1 个时段结束时间必须晚于开始时间。"]);
  });

  it("allows a valid cross-midnight slot and a slot before registration close", () => {
    expect(validateInterviewSlotDrafts([
      { startAt: "2026-09-20T23:30:00.000Z", endAt: "2026-09-21T00:30:00.000Z", capacity: "" },
    ])).toEqual([]);
  });
});
