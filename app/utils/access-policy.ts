export type SiteActionKind =
  | "view-project"
  | "view-activity"
  | "view-gallery"
  | "view-resource"
  | "submit-activity"
  | "cancel-activity"
  | "edit-profile"
  | "view-application"
  | "view-assessment"
  | "view-growth"
  | "download-internal";

export interface SiteAction {
  kind: SiteActionKind;
}

const PROTECTED_ACTIONS = new Set<SiteActionKind>([
  "submit-activity",
  "cancel-activity",
  "edit-profile",
  "view-application",
  "view-assessment",
  "view-growth",
  "download-internal"
]);

export function requiresLogin(action: SiteAction): boolean {
  return PROTECTED_ACTIONS.has(action.kind);
}

