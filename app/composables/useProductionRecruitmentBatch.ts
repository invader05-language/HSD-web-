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

  async function load(batchId: string) {
    loading.value = true;
    error.value = "";
    notFound.value = false;
    batch.value = undefined;
    try {
      batch.value = mapAdminRecruitmentBatch(await gateway.getAdminBatch(batchId));
      return batch.value;
    } catch (cause) {
      const apiError = cause as { status?: number; message?: string };
      if (apiError?.status === 404) notFound.value = true;
      else error.value = apiError?.message || "招新批次读取失败，请稍后重试。";
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  return { batch, loading, error, notFound, load };
}
