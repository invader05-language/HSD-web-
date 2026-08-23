import { ref } from "vue";
import type {
  AdminRecruitmentBatchDto,
  ArchiveRecruitmentBatchPayload,
  RecruitmentBatchLifecycleEventListDto,
} from "../../packages/api-client/src";
import {
  mapAdminRecruitmentBatch,
  mapRecruitmentBatchLifecycleEvent,
  type AdminRecruitmentBatchView,
  type RecruitmentBatchLifecycleEventView,
} from "../services/recruitment/recruitment-view-models";

interface AdminBatchGateway {
  getAdminBatch(batchId: string): Promise<AdminRecruitmentBatchDto>;
  listAdminBatchLifecycleEvents?(batchId: string, page?: number, pageSize?: number): Promise<RecruitmentBatchLifecycleEventListDto>;
  archiveAdminBatch?(batchId: string, payload: ArchiveRecruitmentBatchPayload): Promise<AdminRecruitmentBatchDto>;
}

type DetailStatus = "idle" | "loading" | "success" | "unauthorized" | "forbidden" | "notFound" | "error";
type LifecycleStatus = DetailStatus | "empty" | "unavailable";
type ArchiveStatus = "idle" | "loading" | "success" | "unauthorized" | "forbidden" | "notFound" | "conflict" | "error" | "unavailable";

function requestStatus(cause: unknown): Exclude<DetailStatus, "idle" | "loading" | "success"> {
  const status = (cause as { status?: number })?.status;
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  return "error";
}

function errorMessage(cause: unknown, fallback: string): string {
  return (cause as { message?: string })?.message || fallback;
}

export function createProductionRecruitmentBatchController(gateway: AdminBatchGateway) {
  const batch = ref<AdminRecruitmentBatchView>();
  const lifecycleEvents = ref<RecruitmentBatchLifecycleEventView[]>([]);
  const loading = ref(false);
  const error = ref("");
  const notFound = ref(false);
  const detailStatus = ref<DetailStatus>("idle");
  const lifecycleStatus = ref<LifecycleStatus>("idle");
  const lifecycleError = ref("");
  const archiving = ref(false);
  const archiveStatus = ref<ArchiveStatus>("idle");
  const archiveError = ref("");
  let loadGeneration = 0;
  let currentBatchId = "";

  async function refresh(batchId: string, requestGeneration: number) {
    loading.value = true;
    detailStatus.value = "loading";
    lifecycleStatus.value = gateway.listAdminBatchLifecycleEvents ? "loading" : "unavailable";
    error.value = "";
    lifecycleError.value = "";
    notFound.value = false;
    batch.value = undefined;
    lifecycleEvents.value = [];

    const detailRequest = gateway.getAdminBatch(batchId);
    const lifecycleRequest = gateway.listAdminBatchLifecycleEvents
      ? gateway.listAdminBatchLifecycleEvents(batchId, 1, 50)
      : Promise.resolve(undefined);
    const [detailResult, lifecycleResult] = await Promise.allSettled([detailRequest, lifecycleRequest]);
    if (requestGeneration !== loadGeneration) return undefined;

    if (detailResult.status === "rejected") {
      detailStatus.value = requestStatus(detailResult.reason);
      notFound.value = detailStatus.value === "notFound";
      if (!notFound.value) {
        error.value = errorMessage(detailResult.reason, "招新批次读取失败，请稍后重试。");
      }
      lifecycleEvents.value = [];
      if (lifecycleResult.status === "rejected") {
        lifecycleStatus.value = requestStatus(lifecycleResult.reason);
        lifecycleError.value = errorMessage(lifecycleResult.reason, "生命周期记录读取失败，请稍后重试。");
      }
      return undefined;
    }

    batch.value = mapAdminRecruitmentBatch(detailResult.value);
    detailStatus.value = "success";
    if (!gateway.listAdminBatchLifecycleEvents) {
      lifecycleStatus.value = "unavailable";
      return batch.value;
    }
    if (lifecycleResult.status === "rejected") {
      lifecycleEvents.value = [];
      lifecycleStatus.value = requestStatus(lifecycleResult.reason);
      lifecycleError.value = errorMessage(lifecycleResult.reason, "生命周期记录读取失败，请稍后重试。");
      return batch.value;
    }

    const response = lifecycleResult.value as RecruitmentBatchLifecycleEventListDto;
    lifecycleEvents.value = response.items.map(mapRecruitmentBatchLifecycleEvent);
    lifecycleStatus.value = lifecycleEvents.value.length ? "success" : "empty";
    return batch.value;
  }

  async function load(batchId: string) {
    const requestGeneration = ++loadGeneration;
    currentBatchId = batchId;
    archiving.value = false;
    archiveStatus.value = "idle";
    archiveError.value = "";
    try {
      return await refresh(batchId, requestGeneration);
    } finally {
      if (requestGeneration === loadGeneration) loading.value = false;
    }
  }

  async function refreshLifecycle(batchId: string, requestGeneration: number) {
    if (!gateway.listAdminBatchLifecycleEvents) {
      lifecycleStatus.value = "unavailable";
      lifecycleEvents.value = [];
      return;
    }
    lifecycleStatus.value = "loading";
    lifecycleError.value = "";
    lifecycleEvents.value = [];
    try {
      const response = await gateway.listAdminBatchLifecycleEvents(batchId, 1, 50);
      if (requestGeneration !== loadGeneration) return;
      lifecycleEvents.value = response.items.map(mapRecruitmentBatchLifecycleEvent);
      lifecycleStatus.value = lifecycleEvents.value.length ? "success" : "empty";
    } catch (cause) {
      if (requestGeneration !== loadGeneration) return;
      lifecycleStatus.value = requestStatus(cause);
      lifecycleError.value = errorMessage(cause, "生命周期记录读取失败，请稍后重试。");
    }
  }

  async function archive(reason?: string): Promise<boolean> {
    if (!batch.value || !currentBatchId || !gateway.archiveAdminBatch) {
      archiveStatus.value = "unavailable";
      archiveError.value = "真实归档接口暂不可用。";
      return false;
    }
    const requestGeneration = loadGeneration;
    const payload: ArchiveRecruitmentBatchPayload = {
      expectedVersion: batch.value.version,
      confirmed: true,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    };
    archiving.value = true;
    archiveStatus.value = "loading";
    archiveError.value = "";
    try {
      const response = await gateway.archiveAdminBatch(currentBatchId, payload);
      if (requestGeneration !== loadGeneration) return false;
      batch.value = mapAdminRecruitmentBatch(response);
      archiveStatus.value = "success";
      await refreshLifecycle(currentBatchId, requestGeneration);
      return true;
    } catch (cause) {
      if (requestGeneration !== loadGeneration) return false;
      const status = (cause as { status?: number })?.status;
      if (status === 409) {
        archiveStatus.value = "conflict";
        archiveError.value = "批次版本已变化，已刷新最新状态与生命周期记录，请核对后再次确认。";
        try {
          await refresh(currentBatchId, requestGeneration);
        } finally {
          if (requestGeneration === loadGeneration) loading.value = false;
        }
      } else {
        archiveStatus.value = requestStatus(cause);
        archiveError.value = errorMessage(cause, "批次归档失败，请稍后重试。");
      }
      return false;
    } finally {
      if (requestGeneration === loadGeneration) archiving.value = false;
    }
  }

  return {
    batch,
    lifecycleEvents,
    loading,
    error,
    notFound,
    detailStatus,
    lifecycleStatus,
    lifecycleError,
    archiving,
    archiveStatus,
    archiveError,
    load,
    archive,
  };
}
