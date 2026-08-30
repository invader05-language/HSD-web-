export function splitActivityTime(value: string): [string, string] {
  const match = value.trim().match(/^(\d{2}:\d{2})\s*[-–—]\s*(\d{2}:\d{2})$/);
  if (match) return [match[1] ?? "", match[2] ?? ""];
  const legacy = value.trim().match(/^\d{2}:\d{2}$/);
  return legacy ? [legacy[0], ""] : ["", ""];
}

export function composeActivityTime(start: string, end: string): string {
  return start && end ? `${start}-${end}` : start || end;
}

export function isValidActivityTime(value: string): boolean {
  const [start, end] = splitActivityTime(value);
  return Boolean(start && (!end || start < end));
}
