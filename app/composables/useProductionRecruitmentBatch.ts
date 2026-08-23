import { ref } from "vue";
import type { AdminRecruitmentBatchDto } from "../../packages/api-client/src";
import {
  mapAdminRecruitmentBatch,
  type AdminRecruitmentBatchView,
} from "../services/recruitment/recruitment-view-models";

interface AdminBatchGateway {
  getAdminBatch(batchId: string): Promise<AdminRecruitmentBatchDto>;
}

export function createProductionRecruitmentBatchController(gateway: AdminBatchGateway) {
  const batch = ref<AdminRecruitmentBatchView>();
  const loading = ref(false);
  const error = ref("");
  const notFound = ref(false);
  let loadGeneration = 0;

  async function load(batchId: string) {
    const requestGeneration = ++loadGeneration;
    loading.value = true;
    error.value = "";
    notFound.value = false;
    batch.value = undefined;
    try {
      const response = await gateway.getAdminBatch(batchId);
      if (requestGeneration !== loadGeneration) return undefined;
      batch.value = mapAdminRecruitmentBatch(response);
      return batch.value;
    } catch (cause) {
      if (requestGeneration !== loadGeneration) return undefined;
      const apiError = cause as { status?: number; message?: string };
      if (apiError?.status === 404) notFound.value = true;
      else error.value = apiError?.message || "招新批次读取失败，请稍后重试。";
      return undefined;
    } finally {
      if (requestGeneration === loadGeneration) loading.value = false;
    }
  }

  return { batch, loading, error, notFound, load };
}
