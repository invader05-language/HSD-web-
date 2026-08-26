export interface ReleaseFeatures {
  auditLog: boolean;
  uploadTasks: boolean;
  recruitmentBatches: boolean;
  helpCenter: boolean;
}

export const RELEASE_FEATURES: ReleaseFeatures = {
  auditLog: true,
  uploadTasks: true,
  recruitmentBatches: true,
  helpCenter: false
};
