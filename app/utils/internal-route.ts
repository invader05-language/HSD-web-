const INTERNAL_ROUTE_ORIGIN = "https://baiyun-hsd.invalid";
const UNSAFE_ROUTE_CHARACTERS = /[\s\u0000-\u001f\u007f\\]/u;

export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string" || !value || value !== value.trim()) return false;
  if (!value.startsWith("/") || value.startsWith("//") || UNSAFE_ROUTE_CHARACTERS.test(value)) return false;

  try {
    const parsed = new URL(value, INTERNAL_ROUTE_ORIGIN);
    return parsed.origin === INTERNAL_ROUTE_ORIGIN
      && `${parsed.pathname}${parsed.search}${parsed.hash}` === value;
  } catch {
    return false;
  }
}
