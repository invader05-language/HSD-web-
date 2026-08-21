import { ref, shallowRef } from "vue";
import type { AdminDashboardSnapshot } from "../types/admin-dashboard";
import type { AdminDashboardGateway, DashboardSnapshotOptions } from "../services/admin-dashboard/dashboard-gateway";
import { ApiDashboardGateway } from "../services/admin-dashboard/api-dashboard.gateway";
import { createMockDashboardGateway } from "../services/admin-dashboard/mock-dashboard.gateway";

function createDefaultDashboardGateway(): AdminDashboardGateway {
  const config = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
  if (config.public.useMockApi) return createMockDashboardGateway();
  const apiBase = config.public.apiBase;
  return new ApiDashboardGateway(async (path, options) => {
    const response = await globalThis.fetch(`${apiBase}${path}`, {
      method: options.method,
      credentials: "include",
    });
    if (!response.ok) throw new Error(`ADMIN_DASHBOARD_API_REQUEST_FAILED:${response.status}`);
    return response.json();
  });
}

export function useAdminDashboard(options: { gateway?: AdminDashboardGateway } = {}) {
  const gateway = options.gateway ?? createDefaultDashboardGateway();
  const snapshot = shallowRef<AdminDashboardSnapshot>();
  const loading = ref(false);
  const error = shallowRef<Error>();

  async function refresh(snapshotOptions?: DashboardSnapshotOptions) {
    loading.value = true;
    error.value = undefined;
    try {
      const next = await gateway.getSnapshot(snapshotOptions);
      snapshot.value = next;
      return next;
    } catch (cause) {
      snapshot.value = undefined;
      error.value = cause instanceof Error ? cause : new Error(String(cause));
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  return { snapshot, loading, error, refresh };
}
