export interface ReleaseFeatures {
  auditLog: boolean;
  recycleBin: boolean;
  uploadTasks: boolean;
  recruitmentBatches: boolean;
  helpCenter: boolean;
}

export const RELEASE_FEATURES: ReleaseFeatures = {
  auditLog: false,
  recycleBin: false,
  uploadTasks: false,
  recruitmentBatches: true,
  helpCenter: false
};
