import { ref } from "vue";
import type { AdminResourceResponseDto, AdminResourceVersionListResponseDto, AdminResourceVersionResponseDto } from "../../../packages/api-client/src";
import type { AdminResourceListStatus } from "./admin-resource-list";

export interface AdminResourceDetailGateway {
  detail(id: string): Promise<AdminResourceResponseDto>;
  versions(id: string): Promise<AdminResourceVersionListResponseDto>;
}

export interface AdminResourceDetailRecord {
  id: string; centerId: string; title: string; summary: string; kind: string; format: string; access: string; availability: string; status: string; versionLabel: string; version: number; content: string; attachmentId: string | null; revisionNumber: number; createdAt: string; updatedAt: string; publishedAt: string | null; offlineAt: string | null; offlineReason: string | null;
}
export interface AdminResourceVersionRecord { versionLabel: string; access: string; availability: string; content: string; attachmentId: string | null; revisionNumber: number; createdAt: string; }

const kindLabels = { article: "文章", pdf: "PDF", docx: "DOCX", archive: "归档包", external: "外部链接" } as const;
const formatLabels = { web: "网页", pdf: "PDF", docx: "DOCX", zip: "ZIP", external: "外部链接" } as const;
const accessLabels = { public: "公开访问", member: "登录成员" } as const;
const availabilityLabels = { available: "可用", unavailable: "暂不可用" } as const;
const statusLabels = { draft: "草稿", published: "已发布", offline: "已下架" } as const;

export function mapAdminResourceDetail(item: AdminResourceResponseDto): AdminResourceDetailRecord {
  return { id: item.id, centerId: item.centerId, title: item.title, summary: item.summary, kind: kindLabels[item.kind], format: formatLabels[item.format], access: accessLabels[item.access], availability: availabilityLabels[item.availability], status: statusLabels[item.status], versionLabel: item.versionLabel, version: item.version, content: item.content, attachmentId: item.attachmentId, revisionNumber: item.revisionNumber, createdAt: item.createdAt, updatedAt: item.updatedAt, publishedAt: item.publishedAt, offlineAt: item.offlineAt, offlineReason: item.offlineReason };
}
export function mapAdminResourceVersion(item: AdminResourceVersionResponseDto): AdminResourceVersionRecord { return { versionLabel: item.versionLabel, access: accessLabels[item.access], availability: availabilityLabels[item.availability], content: item.content, attachmentId: item.attachmentId, revisionNumber: item.revisionNumber, createdAt: item.createdAt }; }

export function createAdminResourceDetailController(gateway: AdminResourceDetailGateway) {
  const resource = ref<AdminResourceDetailRecord>(); const versions = ref<AdminResourceVersionRecord[]>([]); const loading = ref(false); const error = ref(""); const status = ref<AdminResourceListStatus>("idle"); let requestGeneration = 0;
  async function load(id: string) {
    const generation = ++requestGeneration; loading.value = true; error.value = ""; resource.value = undefined; versions.value = []; status.value = "loading";
    try { const [detail, history] = await Promise.all([gateway.detail(id), gateway.versions(id)]); if (generation !== requestGeneration) return; resource.value = mapAdminResourceDetail(detail); versions.value = history.items.map(mapAdminResourceVersion); status.value = "success"; }
    catch (cause) { if (generation !== requestGeneration) return; const apiError = cause as { status?: number; message?: string }; error.value = apiError.message || "学习资料详情读取失败，请稍后重试。"; status.value = apiError.status === 401 ? "unauthorized" : apiError.status === 403 ? "forbidden" : apiError.status === 404 ? "notFound" : "error"; }
    finally { if (generation === requestGeneration) loading.value = false; }
  }
  return { resource, versions, loading, error, status, load };
}
