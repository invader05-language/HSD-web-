import type { AdminDashboardSnapshot } from "../../types/admin-dashboard";

export interface DashboardSnapshotOptions {
  now?: Date;
}

export interface AdminDashboardGateway {
  getSnapshot(options?: DashboardSnapshotOptions): Promise<AdminDashboardSnapshot>;
}
