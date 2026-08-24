export type RecruitmentCompatibilitySection = "applications" | "assessment" | "publish";

export function resolveLegacyRecruitmentBatchId(
  value: unknown,
  useMockApi: boolean,
): string | undefined {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (candidate && (useMockApi || candidate !== "batch-current")) return candidate;
  return useMockApi ? "batch-current" : undefined;
}

export function buildRecruitmentCompatibilityRoute(
  section: RecruitmentCompatibilitySection,
  batchId?: string,
  applicationId?: string,
): string {
  if (!batchId) return "/admin/recruitment/batches";
  const base = `/admin/recruitment/batches/${encodeURIComponent(batchId)}/${section}`;
  return applicationId === undefined ? base : `${base}/${encodeURIComponent(applicationId)}`;
}
