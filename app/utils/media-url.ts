/**
 * Convert API-owned relative media paths into URLs that the browser can fetch
 * when the web app and API are served from different origins.
 */
export function resolveApiMediaUrl(value: string | undefined, apiBase: string | undefined): string | undefined {
  if (!value) return value;
  if (!apiBase || !value.startsWith("/api/")) return value;
  return `${apiBase.replace(/\/+$/, "")}${value}`;
}
