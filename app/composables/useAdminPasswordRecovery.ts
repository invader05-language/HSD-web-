import { createPasswordRecoveryGateway, PasswordRecoveryApiError, type PasswordRecoveryRequest } from "~/services/password-recovery/password-recovery.gateway";

export type PasswordRecoveryLoadStatus = "idle" | "loading" | "success" | "forbidden" | "error";

export function useAdminPasswordRecovery() {
  const runtime = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
  const gateway = createPasswordRecoveryGateway({ apiBase: runtime.public.apiBase });
  const items = ref<PasswordRecoveryRequest[]>([]);
  const selected = ref<PasswordRecoveryRequest | null>(null);
  const pendingCount = ref(0);
  const total = ref(0);
  const page = ref(1);
  const loading = ref(false);
  const status = ref<PasswordRecoveryLoadStatus>("idle");
  const error = ref("");
  const lastAction = ref("");

  function setLoadError(cause: unknown, fallback: string) {
    if (cause instanceof PasswordRecoveryApiError && cause.status === 403) {
      status.value = "forbidden";
      error.value = "当前账号没有密码恢复申请管理权限。";
      return;
    }
    status.value = "error";
    error.value = cause instanceof Error ? cause.message : fallback;
  }

  async function refresh(filters: { status?: string; search?: string } = {}) {
    if (runtime.public.useMockApi) return;
    loading.value = true;
    status.value = "loading";
    error.value = "";
    try {
      const [list, count] = await Promise.all([
        gateway.list({ page: page.value, status: filters.status ?? "PENDING", search: filters.search }),
        gateway.pendingCount(),
      ]);
      items.value = list.items;
      total.value = list.total;
      pendingCount.value = count.count;
      status.value = "success";
    } catch (cause) {
      setLoadError(cause, "密码恢复申请暂时无法加载");
    } finally {
      loading.value = false;
    }
  }

  async function refreshPendingCount() {
    if (runtime.public.useMockApi) return;
    loading.value = true;
    status.value = "loading";
    error.value = "";
    try {
      pendingCount.value = (await gateway.pendingCount()).count;
      status.value = "success";
    } catch (cause) {
      setLoadError(cause, "密码恢复申请数量暂时无法加载");
    } finally {
      loading.value = false;
    }
  }

  async function open(request: PasswordRecoveryRequest) {
    try {
      selected.value = await gateway.detail(request.id);
    } catch (cause) {
      setLoadError(cause, "申请详情暂时无法加载");
    }
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

  return {
    items,
    selected,
    pendingCount,
    total,
    page,
    loading,
    status,
    error,
    lastAction,
    refresh,
    refreshPendingCount,
    open,
    reset,
    reject,
  };
}
