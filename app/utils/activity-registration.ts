export interface ActivityRegistrationLike {
  registrationOpen: boolean;
  registrationOverride?: boolean;
  registrationEndAt?: string | null;
  publishedState?: string;
}

export function isActivityRegistrationOpen(activity: ActivityRegistrationLike, now = new Date()): boolean {
  if (activity.publishedState && activity.publishedState !== "published") return false;
  if (!activity.registrationOpen) return false;
  if (activity.registrationOverride === true) return true;
  if (!activity.registrationEndAt) return false;
  const deadline = new Date(activity.registrationEndAt);
  return !Number.isNaN(deadline.getTime()) && deadline > now;
}
