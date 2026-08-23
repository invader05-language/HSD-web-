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
type ArchiveStatus = "idle" | "loading" | "success" | "unauthorized" | "forbidden" | "notFound" | "conflict" | "stale" | "error" | "unavailable";

export interface ArchiveRecruitmentBatchConfirmation {
  batchId: string;
  expectedVersion: number;
  reason?: string;
}

export interface ArchiveRecruitmentBatchResult {
  archived: boolean;
  lifecycleRefreshed: boolean;
}

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
  const lifecyclePage = ref(1);
  const lifecyclePageSize = 50;
  const lifecycleTotal = ref(0);
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
  let lifecycleLoadGeneration = 0;
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
    lifecyclePage.value = 1;
    lifecycleTotal.value = 0;
    const lifecycleRequestGeneration = ++lifecycleLoadGeneration;

    const detailRequest = gateway.getAdminBatch(batchId);
    const lifecycleRequest = gateway.listAdminBatchLifecycleEvents
      ? gateway.listAdminBatchLifecycleEvents(batchId, 1, 50)
      : Promise.resolve(undefined);
    const [detailResult, lifecycleResult] = await Promise.allSettled([detailRequest, lifecycleRequest]);
    if (requestGeneration !== loadGeneration || lifecycleRequestGeneration !== lifecycleLoadGeneration) return undefined;

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
    lifecyclePage.value = response.page;
    lifecycleTotal.value = response.total;
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

  async function refreshLifecycle(batchId: string, requestGeneration: number, page = 1): Promise<boolean> {
    if (!gateway.listAdminBatchLifecycleEvents) {
      lifecycleStatus.value = "unavailable";
      lifecycleEvents.value = [];
      return false;
    }
    lifecycleStatus.value = "loading";
    lifecycleError.value = "";
    lifecycleEvents.value = [];
    lifecyclePage.value = page;
    const lifecycleRequestGeneration = ++lifecycleLoadGeneration;
    try {
      const response = await gateway.listAdminBatchLifecycleEvents(batchId, page, lifecyclePageSize);
      if (requestGeneration !== loadGeneration || lifecycleRequestGeneration !== lifecycleLoadGeneration) return false;
      lifecycleEvents.value = response.items.map(mapRecruitmentBatchLifecycleEvent);
      lifecyclePage.value = response.page;
      lifecycleTotal.value = response.total;
      lifecycleStatus.value = lifecycleEvents.value.length ? "success" : "empty";
      return true;
    } catch (cause) {
      if (requestGeneration !== loadGeneration || lifecycleRequestGeneration !== lifecycleLoadGeneration) return false;
      lifecycleStatus.value = requestStatus(cause);
      lifecycleError.value = errorMessage(cause, "生命周期记录读取失败，请稍后重试。");
      return false;
    }
  }

  async function loadLifecyclePage(page: number): Promise<boolean> {
    if (!currentBatchId || !Number.isInteger(page) || page < 1) return false;
    return refreshLifecycle(currentBatchId, loadGeneration, page);
  }

  async function archive(input: ArchiveRecruitmentBatchConfirmation): Promise<ArchiveRecruitmentBatchResult> {
    const failed = { archived: false, lifecycleRefreshed: false };
    if (!batch.value || !currentBatchId || !gateway.archiveAdminBatch) {
      archiveStatus.value = "unavailable";
      archiveError.value = "真实归档接口暂不可用。";
      return failed;
    }
    if (input.batchId !== currentBatchId || input.expectedVersion !== batch.value.version) {
      archiveStatus.value = "stale";
      archiveError.value = "归档确认已失效，请根据当前批次和版本重新确认。";
      return failed;
    }
    if (batch.value.effectiveStatus !== "closed" || batch.value.archivedAt) {
      archiveStatus.value = "stale";
      archiveError.value = "只有当前有效状态为已关闭的批次才能归档。";
      return failed;
    }
    const requestGeneration = loadGeneration;
    const payload: ArchiveRecruitmentBatchPayload = {
      expectedVersion: input.expectedVersion,
      confirmed: true,
      ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    };
    archiving.value = true;
    archiveStatus.value = "loading";
    archiveError.value = "";
    try {
      const response = await gateway.archiveAdminBatch(currentBatchId, payload);
      if (requestGeneration !== loadGeneration) return failed;
      batch.value = mapAdminRecruitmentBatch(response);
      archiveStatus.value = "success";
      const lifecycleRefreshed = await refreshLifecycle(currentBatchId, requestGeneration);
      return { archived: true, lifecycleRefreshed };
    } catch (cause) {
      if (requestGeneration !== loadGeneration) return failed;
      const status = (cause as { status?: number })?.status;
      if (status === 409) {
        archiveStatus.value = "conflict";
        archiveError.value = "批次版本已变化，已刷新最新状态与生命周期记录，请核对后再次确认。";
        try {
          await refresh(currentBatchId, requestGeneration);
        } finally {
          if (requestGeneration === loadGeneration) loading.value = false;
        }
        return {
          archived: false,
          lifecycleRefreshed: lifecycleStatus.value === "success" || lifecycleStatus.value === "empty",
        };
      } else {
        archiveStatus.value = requestStatus(cause);
        archiveError.value = errorMessage(cause, "批次归档失败，请稍后重试。");
      }
      return failed;
    } finally {
      if (requestGeneration === loadGeneration) archiving.value = false;
    }
  }

  return {
    batch,
    lifecycleEvents,
    lifecyclePage,
    lifecyclePageSize,
    lifecycleTotal,
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
    loadLifecyclePage,
    archive,
  };
}
