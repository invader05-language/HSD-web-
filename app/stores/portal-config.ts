import { defineStore } from "pinia";
import type { PortalCatalogItem } from "../types/portal-content";
import type { PortalConfig, PortalConfigAuditRecord, PortalConfigPatch, PortalReference, PortalSlots } from "../types/portal-config";
import { canUseAssetForPortalContent } from "../data/admin-assets";
import { useSessionStore } from "./session";

export const PORTAL_CONFIG_STORAGE_KEY = "baiyun-hsd.portal-config";
export const PORTAL_CONFIG_STORAGE_VERSION = 2;

export const PORTAL_SLOT_IDS = ["flash", "news", "projects", "activities", "gallery", "resources"] as const;
export const PORTAL_SLOT_CAPACITY = { flash: 1, news: 3, projects: 4, activities: 3, gallery: 1, resources: 3 } as const;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function emptySlots(): PortalSlots {
  return { flash: [], news: [], projects: [], activities: [], gallery: [], resources: [] };
}

function defaultSlots(): PortalSlots {
  return {
    ...emptySlots(),
    projects: ["zhixun-xianfeng", "zhixue-linghang", "xiaobaiyun", "zhineng-banlv"]
      .map((sourceId) => ({ entityType: "project", sourceId })),
    activities: ["harmonyos-salon", "project-camp", "media-story"]
      .map((sourceId) => ({ entityType: "activity", sourceId })),
    gallery: [{ entityType: "gallery", sourceId: "annual-activity-record" }],
    resources: ["harmonyos-getting-started", "project-requirement-template", "member-training-package"]
      .map((sourceId) => ({ entityType: "resource", sourceId })),
  };
}

function initialConfig(): PortalConfig {
  return {
    revision: 1,
    slots: defaultSlots(),
    visuals: { home: { alt: "" }, join: { alt: "" } },
    updatedAt: "2026-08-04T00:00:00.000Z",
    updatedBy: "system",
  };
}

function getStorage(): Storage | undefined {
  try { return typeof localStorage === "undefined" ? undefined : localStorage; } catch { return undefined; }
}

function writePersistedConfigs(
  draftConfig: PortalConfig,
  publishedConfig: PortalConfig,
  auditRecords: readonly PortalConfigAuditRecord[],
) {
  const storage = getStorage();
  if (!storage) throw new Error("PORTAL_CONFIG_PERSISTENCE_FAILED");
  storage.setItem(PORTAL_CONFIG_STORAGE_KEY, JSON.stringify({
    version: PORTAL_CONFIG_STORAGE_VERSION,
    draftConfig,
    publishedConfig,
    auditRecords,
  }));
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
    && PORTAL_SLOT_IDS.every((slot) => Array.isArray(slots[slot]) && slots[slot].every(validReference));
}

function isAuditRecord(value: unknown): value is PortalConfigAuditRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && record.action === "publish"
    && typeof record.actorId === "string"
    && record.targetId === "portal-config"
    && typeof record.beforeVersion === "number"
    && typeof record.afterVersion === "number"
    && typeof record.actualAt === "string";
}

function restorePersistedConfigs(): { draftConfig: PortalConfig; publishedConfig: PortalConfig; auditRecords: PortalConfigAuditRecord[] } | undefined {
  const serialized = getStorage()?.getItem(PORTAL_CONFIG_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const state = parsed as Record<string, unknown>;
    if (state.version !== PORTAL_CONFIG_STORAGE_VERSION
      || !isConfig(state.draftConfig)
      || !isConfig(state.publishedConfig)
      || !Array.isArray(state.auditRecords)
      || !state.auditRecords.every(isAuditRecord)) return undefined;
    return {
      draftConfig: clone(state.draftConfig),
      publishedConfig: clone(state.publishedConfig),
      auditRecords: clone(state.auditRecords),
    };
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

function validate(config: PortalConfig, catalog: readonly PortalCatalogItem[]) {
  const referenced = new Set<string>();
  for (const slot of PORTAL_SLOT_IDS) {
    if (config.slots[slot].length > PORTAL_SLOT_CAPACITY[slot]) throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
    for (const reference of config.slots[slot]) {
      const key = `${reference.entityType}:${reference.sourceId}`;
      const candidate = catalog.find((item) => item.entityType === reference.entityType && item.sourceId === reference.sourceId);
      if (referenced.has(key) || !candidate || !candidate.available || !candidate.eligibleSlots.includes(slot)) {
        throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
      }
      referenced.add(key);
    }
  }
  for (const visual of Object.values(config.visuals)) {
    if (visual.assetId && (!visual.alt.trim() || !canUseAssetForPortalContent(visual.assetId))) {
      throw new Error("PORTAL_CONFIG_INVALID_VISUAL");
    }
  }
}

export const usePortalConfigStore = defineStore("portal-config", {
  state: () => {
    const persisted = restorePersistedConfigs();
    return {
      draftConfig: persisted?.draftConfig ?? initialConfig(),
      publishedConfig: persisted?.publishedConfig ?? initialConfig(),
      auditRecords: persisted?.auditRecords ?? [] as PortalConfigAuditRecord[],
      persistenceError: undefined as string | undefined,
    };
  },
  actions: {
    persist() {
      try {
        writePersistedConfigs(this.draftConfig, this.publishedConfig, this.auditRecords);
        this.persistenceError = undefined;
      } catch {
        this.persistenceError = "PORTAL_CONFIG_STORAGE_UNAVAILABLE";
      }
    },
    saveDraft(patch: PortalConfigPatch, now: Date = new Date()) {
      const actor = adminId();
      const draft = clone(this.draftConfig);
      if (patch.slots) {
        for (const slot of PORTAL_SLOT_IDS) {
          if (patch.slots[slot]) draft.slots[slot] = clone(patch.slots[slot]! as PortalReference[]);
        }
      }
      if (patch.visuals) draft.visuals = { ...draft.visuals, ...clone(patch.visuals) };
      draft.revision += 1;
      draft.updatedAt = now.toISOString();
      draft.updatedBy = actor;
      try {
        writePersistedConfigs(draft, this.publishedConfig, this.auditRecords);
        this.persistenceError = undefined;
      } catch {
        this.persistenceError = "PORTAL_CONFIG_PERSISTENCE_FAILED";
        throw new Error("PORTAL_CONFIG_PERSISTENCE_FAILED");
      }
      this.draftConfig = draft;
      return this.preview();
    },
    replaceReference(
      slot: typeof PORTAL_SLOT_IDS[number],
      index: number,
      reference: PortalReference,
      catalog: readonly PortalCatalogItem[],
      now: Date = new Date(),
    ) {
      if (!Number.isInteger(index) || index < 0 || index >= PORTAL_SLOT_CAPACITY[slot]) {
        throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
      }
      const candidate = catalog.find((item) => item.entityType === reference.entityType && item.sourceId === reference.sourceId);
      const duplicate = PORTAL_SLOT_IDS.some((candidateSlot) => this.draftConfig.slots[candidateSlot].some(
        (item, candidateIndex) => {
          if (candidateSlot === slot && candidateIndex === index) return false;
          return item.entityType === reference.entityType && item.sourceId === reference.sourceId;
        },
      ));
      if (!candidate || !candidate.available || !candidate.eligibleSlots.includes(slot) || duplicate) {
        throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
      }

      const references = clone(this.draftConfig.slots[slot]);
      if (index > references.length) throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
      references.splice(index, index === references.length ? 0 : 1, clone(reference));
      return this.saveDraft({ slots: { [slot]: references } }, now);
    },
    removeReference(slot: typeof PORTAL_SLOT_IDS[number], index: number, now: Date = new Date()) {
      if (!Number.isInteger(index) || index < 0 || index >= this.draftConfig.slots[slot].length) {
        throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
      }
      const references = clone(this.draftConfig.slots[slot]);
      references.splice(index, 1);
      return this.saveDraft({ slots: { [slot]: references } }, now);
    },
    moveReference(
      slot: typeof PORTAL_SLOT_IDS[number],
      index: number,
      direction: "up" | "down",
      now: Date = new Date(),
    ) {
      const target = index + (direction === "up" ? -1 : 1);
      const references = clone(this.draftConfig.slots[slot]);
      if (!Number.isInteger(index) || index < 0 || index >= references.length || target < 0 || target >= references.length) {
        throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
      }
      [references[index], references[target]] = [references[target]!, references[index]!];
      return this.saveDraft({ slots: { [slot]: references } }, now);
    },
    preview() { return clone(this.draftConfig); },
    publish(catalog: readonly PortalCatalogItem[], confirmed: boolean, now: Date = new Date()) {
      const actor = ownerId();
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      validate(this.draftConfig, catalog);
      const next = clone(this.draftConfig);
      next.revision = this.publishedConfig.revision + 1;
      next.updatedAt = now.toISOString();
      next.updatedBy = actor;
      const audit: PortalConfigAuditRecord = {
        id: `portal-config-publish-${next.revision}-${now.getTime()}`,
        action: "publish",
        actorId: actor,
        targetId: "portal-config",
        beforeVersion: this.publishedConfig.revision,
        afterVersion: next.revision,
        actualAt: now.toISOString(),
      };
      const nextAuditRecords = [audit, ...this.auditRecords];
      try {
        writePersistedConfigs(this.draftConfig, next, nextAuditRecords);
        this.persistenceError = undefined;
      } catch {
        this.persistenceError = "PORTAL_CONFIG_PERSISTENCE_FAILED";
        throw new Error("PORTAL_CONFIG_PERSISTENCE_FAILED");
      }
      this.publishedConfig = next;
      this.auditRecords = nextAuditRecords;
      return clone(next);
    },
  },
});
