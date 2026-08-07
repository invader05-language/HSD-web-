import { defineStore } from "pinia";
import { ACTIVITY_DETAILS } from "../data/activities";
import { PortalAutomationServiceMock } from "../services/portal-automation.mock";
import { getAdminCenterScope, getRecruitmentCenterId } from "../utils/admin-center-scope";
import { useSessionStore } from "./session";
import { usePortalContentStore } from "./portal-content";
import { isContentMediaAttachmentComplete } from "../utils/content-media";
import type { ContentMediaAttachment } from "../types/content-media";
import type { ActivityRegistrationOpenedPayload, PortalAutomationResult } from "../types/portal-content";
import type {
  ActivityAuditRecord,
  ActivityDraftInput,
  ActivityRegistration,
  ActivityRegistrationStatus,
  ManagedActivity,
  PublishedActivity,
} from "../types/activity";

export type {
  ActivityAuditRecord,
  ActivityDraftInput,
  ActivityRegistration,
  ActivityRegistrationStatus,
  ManagedActivity,
  PublishedActivity,
} from "../types/activity";

export const ACTIVITIES_STORAGE_KEY = "baiyun-hsd.activities";
export const ACTIVITIES_STORAGE_VERSION = 2;
export const ACTIVITIES_PUBLISHED_SLUGS_COOKIE = "baiyun-hsd.activities-published-slugs";

interface PersistedActivityState {
  version: typeof ACTIVITIES_STORAGE_VERSION;
  activities: ManagedActivity[];
  registrations: ActivityRegistration[];
}

interface LegacyPersistedActivityState {
  version: 1;
  activities: Array<Record<string, unknown>>;
  registrations: ActivityRegistration[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || `activity-${Date.now()}`;
}

function centerForSeed(slug: string): string {
  if (slug === "media-story") return "new-media";
  if (slug === "project-camp") return "tuowei-planning";
  return "baize-development";
}

function createSeedActivity(activity: (typeof ACTIVITY_DETAILS)[number], index: number): ManagedActivity {
  const publishedAt = activity.publishedAt;
  const cover: ContentMediaAttachment = {
    id: `${activity.slug}-cover`,
    role: "cover",
    kind: "image",
    title: "",
    caption: "",
    alt: `${activity.title}活动封面`,
    aspect: "wide",
    sortOrder: 0,
    status: "ready",
  };
  const snapshot: PublishedActivity = {
    id: activity.slug,
    slug: activity.slug,
    title: activity.title,
    type: activity.type,
    date: activity.date,
    time: activity.time,
    location: activity.location,
    summary: activity.summary,
    content: activity.content,
    agenda: [...activity.agenda],
    cover,
    details: [],
    ownerCenterId: centerForSeed(activity.slug),
    registrationEndAt: `${activity.date}T23:59:59.000Z`,
    registrationMode: "unlimited",
    publishedAt,
    revision: 1,
  };
  return {
    ...snapshot,
    status: "published",
    registrationOpen: activity.status === "报名中",
    version: index + 1,
    createdAt: publishedAt,
    updatedAt: publishedAt,
    createdBy: "admin-alliance",
    publishedState: "published",
    publishedSnapshot: snapshot,
  };
}

function seedActivities(): ManagedActivity[] {
  return ACTIVITY_DETAILS.map(createSeedActivity);
}

function isRegistrationStatus(value: unknown): value is ActivityRegistrationStatus {
  return value === "registered" || value === "accepted" || value === "rejected" || value === "cancelled";
}

function isPersistedState(value: unknown): value is PersistedActivityState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  if (state.version !== ACTIVITIES_STORAGE_VERSION || !Array.isArray(state.activities) || !Array.isArray(state.registrations)) return false;
  return state.activities.every((activity) => {
    if (typeof activity !== "object" || activity === null) return false;
    const item = activity as Record<string, unknown>;
    return typeof item.id === "string"
      && typeof item.slug === "string"
      && typeof item.title === "string"
      && typeof item.ownerCenterId === "string"
      && typeof item.content === "string"
      && ["draft", "published", "unpublished"].includes(item.status as string)
      && ["published", "unpublished"].includes(item.publishedState as string)
      && typeof item.registrationOpen === "boolean"
      && (item.publishedSnapshot === undefined || typeof item.publishedSnapshot === "object");
  }) && state.registrations.every((registration) => {
    if (typeof registration !== "object" || registration === null) return false;
    const item = registration as Record<string, unknown>;
    return typeof item.id === "string"
      && typeof item.activityId === "string"
      && typeof item.memberId === "string"
      && typeof item.memberName === "string"
      && isRegistrationStatus(item.status)
      && typeof item.createdAt === "string"
      && typeof item.updatedAt === "string";
  });
}

function migrateActivityRecord(record: Record<string, unknown>): Record<string, unknown> {
  const migrated = { ...record };
  const snapshot = record.publishedSnapshot;
  if (typeof migrated.content !== "string") {
    migrated.content = typeof migrated.audience === "string" ? migrated.audience : "";
  }
  delete migrated.audience;
  if (!("cover" in migrated)) migrated.cover = null;
  if (!Array.isArray(migrated.details)) migrated.details = [];
  if (typeof snapshot === "object" && snapshot !== null) {
    const migratedSnapshot = { ...(snapshot as Record<string, unknown>) };
    if (typeof migratedSnapshot.content !== "string") {
      migratedSnapshot.content = typeof migratedSnapshot.audience === "string" ? migratedSnapshot.audience : "";
    }
    delete migratedSnapshot.audience;
    if (!("cover" in migratedSnapshot)) migratedSnapshot.cover = null;
    if (!Array.isArray(migratedSnapshot.details)) migratedSnapshot.details = [];
    migrated.publishedSnapshot = migratedSnapshot;
  }
  return migrated;
}

function normalizeActivityMedia(record: ManagedActivity): ManagedActivity {
  const normalized = { ...record } as ManagedActivity;
  normalized.cover = normalized.cover ?? null;
  normalized.details = Array.isArray(normalized.details) ? normalized.details : [];
  if (normalized.publishedSnapshot) {
    normalized.publishedSnapshot = {
      ...normalized.publishedSnapshot,
      cover: normalized.publishedSnapshot.cover ?? null,
      details: Array.isArray(normalized.publishedSnapshot.details) ? normalized.publishedSnapshot.details : [],
    };
  }
  return normalized;
}

function migratePersistedState(value: unknown): PersistedActivityState | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const state = value as Record<string, unknown>;
  if (state.version !== 1 || !Array.isArray(state.activities) || !Array.isArray(state.registrations)) return undefined;
  const legacy: LegacyPersistedActivityState = {
    version: 1,
    activities: state.activities.filter((activity): activity is Record<string, unknown> => typeof activity === "object" && activity !== null),
    registrations: state.registrations as ActivityRegistration[],
  };
  if (legacy.activities.length !== state.activities.length) return undefined;
  return {
    version: ACTIVITIES_STORAGE_VERSION,
    activities: legacy.activities.map((activity) => migrateActivityRecord(activity)) as unknown as ManagedActivity[],
    registrations: clone(legacy.registrations),
  };
}

function readPersistedState(): PersistedActivityState | undefined {
  const storage = getStorage();
  const serialized = storage?.getItem(ACTIVITIES_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (isPersistedState(parsed)) {
      return clone({
        ...parsed,
        activities: parsed.activities.map(normalizeActivityMedia),
      });
    }
    const migrated = migratePersistedState(parsed);
    if (!migrated) return undefined;
    try {
      storage?.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(migrated));
    } catch {
      // Keep the migrated state in memory even if browser storage is temporarily unavailable.
    }
    return clone(migrated);
  } catch {
    return undefined;
  }
}

function writePersistedState(activities: readonly ManagedActivity[], registrations: readonly ActivityRegistration[]) {
  const storage = getStorage();
  if (!storage) throw new Error("ACTIVITY_PERSISTENCE_FAILED");
  try {
    storage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify({
      version: ACTIVITIES_STORAGE_VERSION,
      activities: [...activities],
      registrations: [...registrations],
    } satisfies PersistedActivityState));
  } catch {
    throw new Error("ACTIVITY_PERSISTENCE_FAILED");
  }
}

function syncPublishedSlugsCookie(activities: readonly ManagedActivity[]) {
  if (typeof document === "undefined") return;
  const slugs = activities
    .filter((activity) => activity.publishedState === "published" && activity.publishedSnapshot)
    .map((activity) => activity.slug);
  document.cookie = `${ACTIVITIES_PUBLISHED_SLUGS_COOKIE}=${encodeURIComponent(JSON.stringify(slugs))}; path=/; max-age=31536000; samesite=lax`;
}

function requireAuthenticatedActor() {
  const session = useSessionStore();
  if (!session.isAuthenticated || !session.currentAccount) throw new Error("AUTHENTICATION_REQUIRED");
  return session;
}

function requireAdminActor() {
  const session = requireAuthenticatedActor();
  if (!session.canAccessAdmin) throw new Error("ADMIN_PERMISSION_REQUIRED");
  return session;
}

function canManageActivity(session: ReturnType<typeof useSessionStore>, activity: ManagedActivity): boolean {
  if (session.adminLevel === "owner") return true;
  const centerScope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return Boolean(centerScope && activity.ownerCenterId === getRecruitmentCenterId(centerScope));
}

function assertCanManageActivity(activity: ManagedActivity) {
  const session = requireAdminActor();
  if (!canManageActivity(session, activity)) throw new Error("ACTIVITY_CENTER_SCOPE_REQUIRED");
  return session;
}

function assertText(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
}

export const useActivitiesStore = defineStore("activities", {
  state: () => {
    const persisted = readPersistedState();
    return {
      activities: persisted?.activities ?? seedActivities(),
      registrations: persisted?.registrations ?? [] as ActivityRegistration[],
      automationFailures: [] as Array<{ activityId: string; errorCode: string; automationKey: string }>,
      persistenceError: undefined as string | undefined,
    };
  },
  actions: {
    hydrate() {
      const persisted = readPersistedState();
      if (persisted) {
        this.activities = persisted.activities;
        this.registrations = persisted.registrations;
      }
    },
    persist() {
      try {
        writePersistedState(this.activities, this.registrations);
        syncPublishedSlugsCookie(this.activities);
        this.persistenceError = undefined;
      } catch (error) {
        this.persistenceError = error instanceof Error ? error.message : "ACTIVITY_PERSISTENCE_FAILED";
        throw error;
      }
    },
    getById(activityId: string) {
      return this.activities.find((activity) => activity.id === activityId);
    },
    canManageActivity(activityId: string): boolean {
      const activity = this.getById(activityId);
      if (!activity) return false;
      const session = useSessionStore();
      return session.canAccessAdmin && canManageActivity(session, activity);
    },
    getPublicActivities(): PublishedActivity[] {
      return this.activities
        .filter((activity) => activity.publishedState === "published" && activity.publishedSnapshot)
        .map((activity) => ({ ...clone(activity.publishedSnapshot!), registrationOpen: activity.registrationOpen } as PublishedActivity & { registrationOpen: boolean }));
    },
    getPublicBySlug(slug: string) {
      const activity = this.activities.find((item) => item.slug === slug && item.publishedState === "published" && item.publishedSnapshot);
      return activity?.publishedSnapshot
        ? ({ ...clone(activity.publishedSnapshot), registrationOpen: activity.registrationOpen } as PublishedActivity & { registrationOpen: boolean })
        : undefined;
    },
    createDraft(input: ActivityDraftInput, now: Date = new Date()): ManagedActivity {
      const session = requireAdminActor();
      const slug = slugify(input.slug?.trim() || input.title);
      if (this.activities.some((activity) => activity.slug === slug || activity.publishedSnapshot?.slug === slug)) {
        throw new Error("ACTIVITY_DUPLICATE_SLUG");
      }
      const ownerCenterId = input.ownerCenterId.trim();
      if (!ownerCenterId) throw new Error("ACTIVITY_CENTER_REQUIRED");
      if (session.adminLevel !== "owner") {
        const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
        if (!scope || ownerCenterId !== getRecruitmentCenterId(scope)) throw new Error("ACTIVITY_CENTER_SCOPE_REQUIRED");
      }
      const activity: ManagedActivity = {
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        slug,
        title: input.title.trim(),
        type: input.type.trim(),
        date: input.date,
        time: input.time.trim(),
        location: input.location.trim(),
        summary: input.summary.trim(),
        content: input.content.trim(),
        agenda: input.agenda.map((item) => item.trim()).filter(Boolean),
        cover: input.cover ? clone(input.cover) : null,
        details: input.details.map((item) => clone(item)),
        ownerCenterId,
        registrationEndAt: input.registrationEndAt,
        registrationMode: "unlimited",
        publishedAt: now.toISOString(),
        revision: 0,
        status: "draft",
        registrationOpen: false,
        version: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        createdBy: session.currentAccount!.account,
        publishedState: "unpublished",
      };
      this.activities.unshift(activity);
      try {
        this.persist();
      } catch (error) {
        this.activities.shift();
        throw error;
      }
      return activity;
    },
    updateDraft(activityId: string, patch: Partial<ActivityDraftInput>, now: Date = new Date()): ManagedActivity {
      const activity = this.getById(activityId);
      if (!activity) throw new Error("ACTIVITY_NOT_FOUND");
      assertCanManageActivity(activity);
      if (patch.slug && slugify(patch.slug) !== activity.slug && activity.publishedSnapshot) {
        throw new Error("ACTIVITY_SLUG_IMMUTABLE");
      }
      const previous = clone(activity);
      if (patch.ownerCenterId && patch.ownerCenterId !== activity.ownerCenterId) {
        const session = requireAdminActor();
        if (session.adminLevel !== "owner") {
          const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
          if (!scope || patch.ownerCenterId !== getRecruitmentCenterId(scope)) throw new Error("ACTIVITY_CENTER_SCOPE_REQUIRED");
        }
      }
      const next = { ...patch } as Record<string, unknown>;
      if (typeof next.slug === "string") next.slug = slugify(next.slug);
      if (next.cover && typeof next.cover === "object") next.cover = clone(next.cover);
      if (Array.isArray(next.details)) next.details = next.details.map((item) => clone(item));
      Object.assign(activity, next);
      for (const key of ["title", "type", "time", "location", "summary", "content"] as const) {
        if (typeof activity[key] === "string") activity[key] = activity[key].trim();
      }
      activity.agenda = activity.agenda.map((item) => item.trim()).filter(Boolean);
      activity.updatedAt = now.toISOString();
      activity.version += 1;
      try {
        this.persist();
      } catch (error) {
        Object.assign(activity, previous);
        throw error;
      }
      return activity;
    },
    publish(activityId: string, now: Date = new Date()): ManagedActivity {
      const activity = this.getById(activityId);
      if (!activity) throw new Error("ACTIVITY_NOT_FOUND");
      const session = assertCanManageActivity(activity);
      this.assertCompleteActivity(activity);
      const snapshot: PublishedActivity = {
        id: activity.id,
        slug: activity.slug,
        title: activity.title,
        type: activity.type,
        date: activity.date,
        time: activity.time,
        location: activity.location,
        summary: activity.summary,
        content: activity.content,
        agenda: clone(activity.agenda),
        cover: activity.cover ? clone(activity.cover) : null,
        details: clone(activity.details),
        ownerCenterId: activity.ownerCenterId,
        registrationEndAt: activity.registrationEndAt,
        registrationMode: "unlimited",
        publishedAt: now.toISOString(),
        revision: activity.revision + 1,
      };
      const previous = clone(activity);
      activity.publishedSnapshot = snapshot;
      activity.publishedState = "published";
      activity.status = "published";
      activity.publishedAt = snapshot.publishedAt;
      activity.revision = snapshot.revision;
      activity.version += 1;
      activity.updatedAt = snapshot.publishedAt;
      if (!activity.registrationOpen) activity.registrationOpen = true;
      try {
        this.persist();
      } catch (error) {
        Object.assign(activity, previous);
        throw error;
      }
      void session;
      return activity;
    },
    assertCompleteActivity(activity: ManagedActivity) {
      const requiredFields = [
        "title",
        "type",
        "date",
        "time",
        "location",
        "registrationEndAt",
        "ownerCenterId",
        "summary",
        "content",
      ] as const;
      for (const field of requiredFields) {
        const value = activity[field];
        if (typeof value !== "string" || !value.trim()) throw new Error("ACTIVITY_INCOMPLETE");
      }
      if (!activity.agenda.some((item) => item.trim())) throw new Error("ACTIVITY_INCOMPLETE");
      if (!activity.cover || !isContentMediaAttachmentComplete(activity.cover) || activity.cover.role !== "cover" || activity.cover.kind !== "image") {
        throw new Error("ACTIVITY_INCOMPLETE");
      }
      if (activity.details.some((detail) => detail.role !== "detail" || !isContentMediaAttachmentComplete(detail))) {
        throw new Error("ACTIVITY_INCOMPLETE");
      }
    },
    unpublish(activityId: string, reason = "", now: Date = new Date()): ManagedActivity {
      const activity = this.getById(activityId);
      if (!activity) throw new Error("ACTIVITY_NOT_FOUND");
      assertCanManageActivity(activity);
      const previous = clone(activity);
      activity.publishedState = "unpublished";
      activity.status = "unpublished";
      activity.registrationOpen = false;
      activity.version += 1;
      activity.updatedAt = now.toISOString();
      try {
        this.persist();
      } catch (error) {
        Object.assign(activity, previous);
        throw error;
      }
      usePortalContentStore().invalidateSource("activity", activity.id, now);
      void reason;
      return activity;
    },
    setRegistrationOpen(activityId: string, isOpen: boolean, now: Date = new Date()): ManagedActivity {
      const activity = this.getById(activityId);
      if (!activity) throw new Error("ACTIVITY_NOT_FOUND");
      assertCanManageActivity(activity);
      if (activity.publishedState !== "published") throw new Error("ACTIVITY_NOT_PUBLISHED");
      if (activity.registrationOpen === isOpen) return activity;
      const previous = clone(activity);
      activity.registrationOpen = isOpen;
      activity.version += 1;
      activity.updatedAt = now.toISOString();
      try {
        this.persist();
      } catch (error) {
        Object.assign(activity, previous);
        throw error;
      }
      if (isOpen) this.createRegistrationOpenedAutomation(activity, now);
      else usePortalContentStore().invalidateSource("activity", activity.id, now);
      return activity;
    },
    openRegistration(activityId: string, now: Date = new Date()) {
      return this.setRegistrationOpen(activityId, true, now);
    },
    closeRegistration(activityId: string, now: Date = new Date()) {
      return this.setRegistrationOpen(activityId, false, now);
    },
    createRegistrationOpenedAutomation(activity: ManagedActivity, now: Date) {
      const session = useSessionStore();
      if (!session.currentAccount) return;
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
      if (result.status === "failed") {
        this.automationFailures.unshift({ activityId: activity.id, errorCode: result.errorCode, automationKey: result.automationKey });
      }
    },
    retryAutomationDraft(automationKey: string) {
      const result = usePortalContentStore().retryAutomationDraft(automationKey);
      if (result.status !== "failed") {
        this.automationFailures = this.automationFailures.filter((failure) => failure.automationKey !== automationKey);
      }
      return result;
    },
    registerCurrentUser(activityId: string, now: Date = new Date()): ActivityRegistration {
      const session = requireAuthenticatedActor();
      const activity = this.getById(activityId);
      if (!activity || activity.publishedState !== "published" || !activity.publishedSnapshot) throw new Error("ACTIVITY_NOT_PUBLIC");
      if (!activity.registrationOpen) throw new Error("ACTIVITY_REGISTRATION_CLOSED");
      const existing = this.registrations.find((item) => item.activityId === activityId && item.memberId === session.currentMemberId && item.status !== "cancelled");
      if (existing) throw new Error("ACTIVITY_REGISTRATION_DUPLICATE");
      const registration: ActivityRegistration = {
        id: `activity-registration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        activityId,
        memberId: session.currentMemberId,
        memberName: session.currentAccount!.name,
        status: "registered",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.registrations.unshift(registration);
      try {
        this.persist();
      } catch (error) {
        this.registrations.shift();
        throw error;
      }
      return registration;
    },
    getCurrentRegistration(activityId: string) {
      const session = useSessionStore();
      if (!session.isAuthenticated) return undefined;
      return this.registrations.find((item) => item.activityId === activityId && item.memberId === session.currentMemberId);
    },
    cancelRegistration(registrationId: string, now: Date = new Date()) {
      const session = requireAuthenticatedActor();
      const registration = this.registrations.find((item) => item.id === registrationId);
      if (!registration) throw new Error("ACTIVITY_REGISTRATION_NOT_FOUND");
      if (registration.memberId !== session.currentMemberId) throw new Error("ACTIVITY_REGISTRATION_OWNER_REQUIRED");
      if (registration.status === "cancelled") return registration;
      registration.status = "cancelled";
      registration.updatedAt = now.toISOString();
      this.persist();
      return registration;
    },
    getRegistration(registrationId: string) {
      return this.registrations.find((item) => item.id === registrationId);
    },
    getRegistrationsForAdmin(activityId?: string) {
      const session = requireAdminActor();
      return this.registrations.filter((registration) => {
        const activity = this.getById(registration.activityId);
        if (!activity) return false;
        if (activityId && registration.activityId !== activityId) return false;
        return canManageActivity(session, activity);
      });
    },
    decideRegistration(registrationId: string, status: Extract<ActivityRegistrationStatus, "accepted" | "rejected">, reason = "", now: Date = new Date()) {
      const registration = this.getRegistration(registrationId);
      if (!registration) throw new Error("ACTIVITY_REGISTRATION_NOT_FOUND");
      const activity = this.getById(registration.activityId);
      if (!activity) throw new Error("ACTIVITY_NOT_FOUND");
      const session = assertCanManageActivity(activity);
      if (registration.status === "cancelled") throw new Error("ACTIVITY_REGISTRATION_CANCELLED");
      registration.status = status;
      registration.updatedAt = now.toISOString();
      registration.decidedAt = now.toISOString();
      registration.decidedBy = session.currentAccount!.account;
      registration.decisionReason = reason.trim() || undefined;
      this.persist();
      return registration;
    },
  },
});
