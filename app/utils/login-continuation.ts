export function buildLoginTarget(target: string): string {
  return `/login?redirect=${encodeURIComponent(target)}`;
}

export function resolveLoginAwareTarget(target: string, isAuthenticated: boolean): string {
  return isAuthenticated ? target : buildLoginTarget(target);
}

export function normalizeRedirectTarget(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/member";
  }
  return value;
}
