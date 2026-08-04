import { defineStore } from "pinia";
import { ACTIVITY_DETAILS } from "../data/activities";
import { PortalAutomationServiceMock } from "../services/portal-automation.mock";
import { useSessionStore } from "./session";
import type { ActivityRegistrationOpenedPayload, PortalAutomationResult } from "../types/portal-content";

export interface ManagedActivity {
  id: string;
  slug: string;
  title: string;
  registrationOpen: boolean;
  registrationEndAt: string;
  version: number;
}

function seedActivities(): ManagedActivity[] {
  return ACTIVITY_DETAILS.map((activity) => ({
    id: activity.slug,
    slug: activity.slug,
    title: activity.title,
    registrationOpen: activity.status === "报名中",
    registrationEndAt: `${activity.date}T23:59:59.000Z`,
    version: 1,
  }));
}

export const useActivitiesStore = defineStore("activities", {
  state: () => ({ activities: seedActivities(), automationFailures: [] as Array<{ activityId: string; errorCode: string }> }),
  actions: {
    openRegistration(activityId: string, now: Date = new Date()): ManagedActivity {
      const session = useSessionStore();
      if (!session.isAuthenticated || session.adminLevel !== "owner" || !session.currentAccount) {
        throw new Error("OWNER_PERMISSION_REQUIRED");
      }
      const activity = this.activities.find((item) => item.id === activityId);
      if (!activity) throw new Error("ACTIVITY_NOT_FOUND");
      if (activity.registrationOpen) return activity;
      activity.registrationOpen = true;
      activity.version += 1;
      const payload: ActivityRegistrationOpenedPayload = {
        activityTitle: activity.title,
        slug: activity.slug,
        publicRoute: `/activities/${activity.slug}`,
        publicEndAt: activity.registrationEndAt,
        isOpen: true,
      };
      const result: PortalAutomationResult = new PortalAutomationServiceMock().createFromEvent({
        eventId: `activity-registration-${activity.id}-${activity.version}`,
        eventType: "activity.registration.opened",
        occurredAt: now.toISOString(),
        actorId: session.currentAccount.account,
        sourceDomain: "activity",
        sourceId: activity.id,
        sourceVersion: activity.version,
        payload,
      });
      if (result.status === "failed") this.automationFailures.unshift({ activityId, errorCode: result.errorCode });
      return activity;
    },
  },
});
