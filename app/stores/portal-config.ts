import { defineStore } from "pinia";
import type { PortalCatalogItem } from "../types/portal-content";
import type { PortalConfig, PortalConfigPatch, PortalReference, PortalSlots } from "../types/portal-config";
import { useSessionStore } from "./session";

export const PORTAL_CONFIG_STORAGE_KEY = "baiyun-hsd.portal-config";
export const PORTAL_CONFIG_STORAGE_VERSION = 1;

const slotIds = ["flash", "news", "projects", "activities", "gallery", "resources"] as const;
const slotCapacity = { flash: 1, news: 3, projects: 4, activities: 3, gallery: 1, resources: 3 } as const;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function emptySlots(): PortalSlots {
  return { flash: [], news: [], projects: [], activities: [], gallery: [], resources: [] };
}

function initialConfig(): PortalConfig {
  return {
    revision: 1,
    slots: emptySlots(),
    visuals: { home: { alt: "" }, join: { alt: "" } },
    updatedAt: "2026-08-04T00:00:00.000Z",
    updatedBy: "system",
  };
}

function getStorage(): Storage | undefined {
  try { return typeof localStorage === "undefined" ? undefined : localStorage; } catch { return undefined; }
}

function isConfig(value: unknown): value is PortalConfig {
  if (typeof value !== "object" || value === null) return false;
  const config = value as Record<string, unknown>;
  if (typeof config.revision !== "number" || typeof config.updatedAt !== "string" || typeof config.updatedBy !== "string") return false;
  if (typeof config.slots !== "object" || config.slots === null || typeof config.visuals !== "object" || config.visuals === null) return false;
  const slots = config.slots as Record<string, unknown>;
  const visuals = config.visuals as Record<string, unknown>;
  const hasVisual = (visual: unknown) => typeof visual === "object" && visual !== null
    && typeof (visual as Record<string, unknown>).alt === "string";
  const validReference = (reference: unknown) => typeof reference === "object" && reference !== null
    && ["flash", "article", "notice", "project", "activity", "gallery", "resource"].includes((reference as Record<string, unknown>).entityType as string)
    && typeof (reference as Record<string, unknown>).sourceId === "string";
  return hasVisual(visuals.home)
    && hasVisual(visuals.join)
    && slotIds.every((slot) => Array.isArray(slots[slot]) && slots[slot].every(validReference));
}

function restorePersistedConfigs(): { draftConfig: PortalConfig; publishedConfig: PortalConfig } | undefined {
  const serialized = getStorage()?.getItem(PORTAL_CONFIG_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const state = parsed as Record<string, unknown>;
    if (state.version !== PORTAL_CONFIG_STORAGE_VERSION || !isConfig(state.draftConfig) || !isConfig(state.publishedConfig)) return undefined;
    return { draftConfig: clone(state.draftConfig), publishedConfig: clone(state.publishedConfig) };
  } catch {
    return undefined;
  }
}

function ownerId() {
  const session = useSessionStore();
  if (!session.isAuthenticated || session.adminLevel !== "owner" || !session.currentAccount) {
    throw new Error("PORTAL_CONTENT_PERMISSION_REQUIRED");
  }
  return session.currentAccount.account;
}

function adminId() {
  const session = useSessionStore();
  if (!session.isAuthenticated || !session.canAccessAdmin || !session.currentAccount) {
    throw new Error("PORTAL_CONTENT_PERMISSION_REQUIRED");
  }
  return session.currentAccount.account;
}

function validate(slots: PortalSlots, catalog: readonly PortalCatalogItem[]) {
  const referenced = new Set<string>();
  for (const slot of slotIds) {
    if (slots[slot].length > slotCapacity[slot]) throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
    for (const reference of slots[slot]) {
      const key = `${reference.entityType}:${reference.sourceId}`;
      const candidate = catalog.find((item) => item.entityType === reference.entityType && item.sourceId === reference.sourceId);
      if (referenced.has(key) || !candidate || !candidate.available || !candidate.eligibleSlots.includes(slot)) {
        throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
      }
      referenced.add(key);
    }
  }
}

export const usePortalConfigStore = defineStore("portal-config", {
  state: () => {
    const persisted = restorePersistedConfigs();
    return {
      draftConfig: persisted?.draftConfig ?? initialConfig(),
      publishedConfig: persisted?.publishedConfig ?? initialConfig(),
      persistenceError: undefined as string | undefined,
    };
  },
  actions: {
    persist() {
      try {
        const storage = getStorage();
        if (!storage) throw new Error("storage unavailable");
        storage.setItem(PORTAL_CONFIG_STORAGE_KEY, JSON.stringify({
          version: PORTAL_CONFIG_STORAGE_VERSION,
          draftConfig: this.draftConfig,
          publishedConfig: this.publishedConfig,
        }));
        this.persistenceError = undefined;
      } catch {
        this.persistenceError = "PORTAL_CONFIG_STORAGE_UNAVAILABLE";
      }
    },
    saveDraft(patch: PortalConfigPatch, now: Date = new Date()) {
      const actor = adminId();
      const draft = clone(this.draftConfig);
      if (patch.slots) {
        for (const slot of slotIds) {
          if (patch.slots[slot]) draft.slots[slot] = clone(patch.slots[slot]! as PortalReference[]);
        }
      }
      if (patch.visuals) draft.visuals = { ...draft.visuals, ...clone(patch.visuals) };
      draft.revision += 1;
      draft.updatedAt = now.toISOString();
      draft.updatedBy = actor;
      this.draftConfig = draft;
      this.persist();
      return this.preview();
    },
    preview() { return clone(this.draftConfig); },
    publish(catalog: readonly PortalCatalogItem[], confirmed: boolean, now: Date = new Date()) {
      const actor = ownerId();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      validate(this.draftConfig.slots, catalog);
      const next = clone(this.draftConfig);
      next.revision = this.publishedConfig.revision + 1;
      next.updatedAt = now.toISOString();
      next.updatedBy = actor;
      this.publishedConfig = next;
      this.persist();
      return clone(next);
    },
  },
});
