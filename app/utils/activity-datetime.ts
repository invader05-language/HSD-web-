const BEIJING_TIME_ZONE = "Asia/Shanghai";
const BEIJING_OFFSET_MINUTES = 8 * 60;

export function isoToDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BEIJING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) return "";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function dateTimeLocalToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0"] = match;
  const year = Number(yearText); const month = Number(monthText); const day = Number(dayText);
  const hour = Number(hourText); const minute = Number(minuteText); const second = Number(secondText);
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return null;

  const localAsUtc = new Date(0);
  localAsUtc.setUTCFullYear(year, month - 1, day);
  localAsUtc.setUTCHours(hour, minute, second, 0);
  if (localAsUtc.getUTCFullYear() !== year || localAsUtc.getUTCMonth() !== month - 1 || localAsUtc.getUTCDate() !== day
    || localAsUtc.getUTCHours() !== hour || localAsUtc.getUTCMinutes() !== minute || localAsUtc.getUTCSeconds() !== second) return null;
  return new Date(localAsUtc.getTime() - BEIJING_OFFSET_MINUTES * 60_000).toISOString();
}
