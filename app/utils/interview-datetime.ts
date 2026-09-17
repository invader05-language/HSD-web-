import { isValid, parseISO } from "date-fns";
import { dateTimeLocalToIso } from "./activity-datetime";

const INTERVIEW_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const LEGACY_CST_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** Parse only canonical ISO values or the pre-picker CST draft format. */
export function parseInterviewDraftDate(value: string): Date | null {
  const normalized = value.trim();
  if (!normalized) return null;

  if (LEGACY_CST_PATTERN.test(normalized)) {
    const iso = dateTimeLocalToIso(normalized.replace(" ", "T"));
    if (!iso) return null;
    const parsed = parseISO(iso);
    return isValid(parsed) ? parsed : null;
  }

  if (!INTERVIEW_ISO_PATTERN.test(normalized)) return null;
  const parsed = parseISO(normalized);
  return isValid(parsed) ? parsed : null;
}

/** Serialize a selected picker value to a minute-precision UTC instant. */
export function interviewPickerDateToIso(value: Date | null): string {
  if (value === null) return "";
  if (!Number.isFinite(value.getTime())) throw new Error("请选择有效的日期和时间。");
  return new Date(Math.floor(value.getTime() / 60_000) * 60_000).toISOString();
}
