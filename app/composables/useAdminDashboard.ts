import { ref, shallowRef } from "vue";
import type { AdminDashboardSnapshot } from "../types/admin-dashboard";
import type { AdminDashboardGateway, DashboardSnapshotOptions } from "../services/admin-dashboard/dashboard-gateway";
import { createMockDashboardGateway } from "../services/admin-dashboard/mock-dashboard.gateway";

export function useAdminDashboard(options: { gateway?: AdminDashboardGateway } = {}) {
  const gateway = options.gateway ?? createMockDashboardGateway();
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
