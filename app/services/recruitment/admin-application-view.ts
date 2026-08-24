import type { AdminRecruitmentApplicationDto } from "../../../packages/api-client/src";

export interface AdminApplicationView {
  id: string;
  batchId: string;
  name: string;
  studentId: string;
  grade: string;
  className: string;
  contact: string;
  preferences: string[];
  baizeDirection: string | null;
  acceptsAdjustment: boolean;
  status: string;
  version: number;
  submittedAt: string;
  withdrawnAt: string | null;
}

const BAIZE_LABELS: Record<NonNullable<AdminRecruitmentApplicationDto["baizeDirection"]>, string> = {
  HARMONYOS_DEVELOPMENT: "鸿蒙开发",
  BACKEND_ARCHITECTURE: "后端架构",
  AIGC_LARGE_MODEL: "大模型 AIGC",
  UI_UX_DESIGN: "UI/UX 设计",
  EMBEDDED_DEVELOPMENT: "嵌入式开发",
};

const STATUS_LABELS: Record<AdminRecruitmentApplicationDto["status"], string> = {
  SUBMITTED: "已提交",
  WITHDRAWN: "已撤回",
  PROCESSING: "处理中",
  COMPLETED: "已完成",
};

export function mapAdminApplication(dto: AdminRecruitmentApplicationDto): AdminApplicationView {
  return {
    id: dto.id,
    batchId: dto.batchId,
    name: dto.applicantProfileSnapshot.name,
    studentId: dto.applicantProfileSnapshot.studentId,
    grade: dto.applicantProfileSnapshot.grade,
    className: dto.applicantProfileSnapshot.className,
    contact: dto.contact,
    preferences: dto.preferences.slice().sort((a, b) => a.rank - b.rank).map((item) => item.center.name),
    baizeDirection: dto.baizeDirection ? BAIZE_LABELS[dto.baizeDirection] : null,
    acceptsAdjustment: dto.acceptsAdjustment,
    status: STATUS_LABELS[dto.status],
    version: dto.version,
    submittedAt: dto.submittedAt,
    withdrawnAt: dto.withdrawnAt,
  };
}

export function formatAdminApplicationSubmittedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}
