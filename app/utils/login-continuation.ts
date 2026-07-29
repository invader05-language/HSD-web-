export function buildLoginTarget(target: string): string {
  return `/login?redirect=${encodeURIComponent(target)}`;
}

export function normalizeRedirectTarget(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/member";
  }
  return value;
}

