import {
  INTERVIEW_TIMEZONE,
  type RecruitmentInterviewSlot,
  type RecruitmentInterviewSlotAvailability,
  type RecruitmentInterviewSlotDraft,
} from "../types/recruitment-interview";
import { parseInterviewDraftDate } from "./interview-datetime";

const SHANGHAI_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  timeZone: INTERVIEW_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parseSlotInstant(value: string | Date): Date {
  if (value instanceof Date) return value;
  return parseInterviewDraftDate(value) ?? new Date(Number.NaN);
}

function formatShanghaiDate(value: string): string {
  const parts = SHANGHAI_FORMATTER.formatToParts(parseSlotInstant(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

function remainingCapacity(slot: Pick<RecruitmentInterviewSlot, "capacity" | "confirmedCount" | "remainingCapacity">): number | null {
  if (slot.capacity === null) return null;
  if (slot.remainingCapacity !== undefined) return slot.remainingCapacity;
  return Math.max(0, slot.capacity - (slot.confirmedCount ?? 0));
}

export function formatInterviewSlotRange(slot: Pick<RecruitmentInterviewSlot, "startAt" | "endAt">): string {
  const start = formatShanghaiDate(slot.startAt);
  const end = formatShanghaiDate(slot.endAt);
  return `${start}—${end.slice(0, 10) === start.slice(0, 10) ? end.slice(11) : end}（中国标准时间）`;
}

export function formatInterviewTimestamp(value: string): string {
  return formatShanghaiDate(value);
}

export function interviewSlotCapacityLabel(
  slot: Pick<RecruitmentInterviewSlot, "capacity" | "confirmedCount" | "remainingCapacity">,
): string {
  const remaining = remainingCapacity(slot);
  if (remaining === null) return "不限人数";
  return remaining === 0 ? "已满" : `剩余 ${remaining} 位`;
}

export function getInterviewSlotAvailability(
  slot: Pick<RecruitmentInterviewSlot, "startAt" | "capacity" | "confirmedCount" | "status">,
  now: Date = new Date(),
): RecruitmentInterviewSlotAvailability {
  if (slot.status !== "ACTIVE") return { selectable: false, remainingCapacity: remainingCapacity(slot), reason: "retired" };
  if (parseSlotInstant(slot.startAt).getTime() <= now.getTime()) return { selectable: false, remainingCapacity: remainingCapacity(slot), reason: "started" };
  const remaining = remainingCapacity(slot);
  if (remaining === 0) return { selectable: false, remainingCapacity: 0, reason: "full" };
  return { selectable: true, remainingCapacity: remaining };
}

export function hasPublishReadyInterviewSlots(
  slots: readonly Pick<RecruitmentInterviewSlot, "startAt" | "status">[],
  now: string | Date = new Date(),
): boolean {
  const currentTime = parseSlotInstant(now).getTime();
  return slots.some((slot) => slot.status === "ACTIVE" && parseSlotInstant(slot.startAt).getTime() > currentTime);
}

function parseCapacity(value: string): number | null | undefined {
  if (!value.trim()) return null;
  if (!/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function validateInterviewSlotDrafts(
  drafts: readonly Pick<RecruitmentInterviewSlotDraft, "startAt" | "endAt" | "capacity">[],
): string[] {
  const errors: string[] = [];
  drafts.forEach((draft, index) => {
    const label = `第 ${index + 1} 个时段`;
    const start = parseInterviewDraftDate(draft.startAt);
    const end = parseInterviewDraftDate(draft.endAt);
    if (!start) errors.push(`${label}请选择有效的开始时间。`);
    if (!end) errors.push(`${label}请选择有效的结束时间。`);
    if (start && end && end.getTime() <= start.getTime()) errors.push(`${label}结束时间必须晚于开始时间。`);
    if (parseCapacity(draft.capacity) === undefined) {
      errors.push(`${label}名额必须为正整数，留空表示不限人数。`);
    }
  });
  return errors;
}

export function createInterviewSlotDraft(): RecruitmentInterviewSlotDraft {
  return { startAt: "", endAt: "", capacity: "" };
}

export function parseInterviewSlotCapacity(value: string): number | null {
  return parseCapacity(value) ?? null;
}
