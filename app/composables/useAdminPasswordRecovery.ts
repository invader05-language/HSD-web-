import { createPasswordRecoveryGateway, PasswordRecoveryApiError, type PasswordRecoveryRequest } from "~/services/password-recovery/password-recovery.gateway";

export function useAdminPasswordRecovery() {
  const runtime = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
  const gateway = createPasswordRecoveryGateway({ apiBase: runtime.public.apiBase });
  const items = ref<PasswordRecoveryRequest[]>([]);
  const selected = ref<PasswordRecoveryRequest | null>(null);
  const pendingCount = ref(0);
  const total = ref(0);
  const page = ref(1);
  const loading = ref(false);
  const error = ref("");
  const lastAction = ref("");

  async function refresh(filters: { status?: string; search?: string } = {}) {
    if (runtime.public.useMockApi) return;
    loading.value = true;
    error.value = "";
    try {
      const [list, count] = await Promise.all([gateway.list({ page: page.value, status: filters.status ?? "PENDING", search: filters.search }), gateway.pendingCount()]);
      items.value = list.items;
      total.value = list.total;
      pendingCount.value = count.count;
    } catch (cause) {
      if (cause instanceof PasswordRecoveryApiError && cause.status === 403) {
        await navigateTo("/admin/forbidden");
        return;
      }
      error.value = cause instanceof Error ? cause.message : "密码恢复申请暂时无法加载";
    } finally {
      loading.value = false;
    }
  }

  async function open(request: PasswordRecoveryRequest) {
    try { selected.value = await gateway.detail(request.id); }
    catch (cause) { error.value = cause instanceof Error ? cause.message : "申请详情暂时无法加载"; }
  }

  async function reset(request: PasswordRecoveryRequest, body: { requestVersion: number; accountVersion: number; contactedInPerson: true; identityMatched: true; organizationMatched: true; resolutionReason: string }) {
    const result = await gateway.reset(request.id, body);
    lastAction.value = `已将 ${result.targetName} 的账号重置，并撤销 ${result.revokedSessionCount} 个旧会话`;
    selected.value = null;
    return result;
  }

  async function reject(request: PasswordRecoveryRequest, reason: string) {
    const result = await gateway.reject(request.id, { requestVersion: request.version, resolutionReason: reason });
    lastAction.value = "已驳回该密码恢复申请";
    selected.value = null;
    return result;
  }

  return { items, selected, pendingCount, total, page, loading, error, lastAction, refresh, open, reset, reject };
}
