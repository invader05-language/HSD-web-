import type { AdminCandidate } from "~/data/recruitment-admin";

const RECRUITMENT_CSV_HEADERS = [
  "姓名",
  "学号",
  "联系方式",
  "第一志愿",
  "第二志愿",
  "第三志愿",
  "白泽方向",
  "接受调剂",
  "报名时间"
] as const;

function protectFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCsvCell(value: string): string {
  const protectedValue = protectFormula(value);
  return /[",\n\r]/.test(protectedValue)
    ? `"${protectedValue.replaceAll('"', '""')}"`
    : protectedValue;
}

function formatSubmittedAt(submittedAt: string): string {
  return submittedAt.slice(0, 16).replace("T", " ");
}

/**
 * Serializes the current, already-authorized recruitment application view.
 *
 * Backend replacement contract: generate an `.xlsx` file using the same
 * filters, columns, authorization scope, and date cells as this CSV export.
 */
export function serializeRecruitmentCsv(records: readonly AdminCandidate[]): string {
  const rows = records.map((record) => [
    record.name,
    record.studentId,
    record.contact,
    record.preferences[0],
    record.preferences[1] ?? "",
    record.preferences[2] ?? "",
    record.baizeDirection ?? "",
    record.acceptsAdjustment ? "接受调剂" : "不接受调剂",
    formatSubmittedAt(record.submittedAt)
  ].map((cell) => escapeCsvCell(cell)).join(","));

  return `\uFEFF${[RECRUITMENT_CSV_HEADERS.join(","), ...rows].join("\r\n")}`;
}

export function buildRecruitmentExportName(batchName: string, now: Date): string {
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("") + "-" + [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0")
  ].join("");

  return `HSD-${batchName.replaceAll(/\s+/g, "")}-报名名单-${timestamp}.csv`;
}
