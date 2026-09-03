import { defineStore } from "pinia";
import type { PortalCatalogItem } from "../types/portal-content";
import type { PortalConfig, PortalConfigAuditRecord, PortalConfigPatch, PortalReference, PortalSlots, PortalVisualConfig } from "../types/portal-config";
import { canUseAssetForPortalContent } from "../data/admin-assets";
import { createLegacyContentMediaAttachment, isContentMediaAttachmentComplete } from "../utils/content-media";
import { useSessionStore } from "./session";
import type { AdminPortalConfigurationResponseDto, HsdApiClient, PortalResolvedEntryResponseDto } from "../../packages/api-client/src";

export interface PortalConfigRuntimeConfig { useMockApi: boolean; }
export type PortalDraftStatus = "idle" | "loading" | "ready" | "error";
type PortalConfigGateway = Pick<HsdApiClient, "portal">;

export const PORTAL_CONFIG_STORAGE_KEY = "baiyun-hsd.portal-config";
export const PORTAL_CONFIG_STORAGE_VERSION = 4;

export const PORTAL_SLOT_IDS = ["flash", "news", "projects", "activities", "gallery", "resources"] as const;
export const PORTAL_SLOT_CAPACITY = { flash: 3, news: 3, projects: 4, activities: 3, gallery: 3, resources: 3 } as const;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function emptySlots(): PortalSlots {
  return { flash: [], news: [], projects: [], activities: [], gallery: [], resources: [] };
}

function emptyConfig(): PortalConfig {
  return {
    revision: 0,
    slots: emptySlots(),
    visuals: { home: { alt: "" }, join: { alt: "" } },
    updatedAt: "",
    updatedBy: "",
  };
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

function runtimeUsesMockApi() {
  try {
    return (useRuntimeConfig() as { public?: { useMockApi?: boolean } }).public?.useMockApi !== false;
  } catch {
    // Unit-only direct store use remains the explicit legacy Mock contract.
    return true;
  }
}

function errorFrom(error: unknown) {
  return {
    code: typeof (error as { code?: unknown })?.code === "string"
      ? (error as { code: string }).code
      : error instanceof Error && /^PORTAL_[A-Z_]+$/.test(error.message)
        ? error.message
        : "PORTAL_CONFIG_API_REQUEST_FAILED",
    message: error instanceof Error ? error.message : "Portal configuration request failed",
    status: typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : undefined,
    requestId: typeof (error as { requestId?: unknown })?.requestId === "string" ? (error as { requestId: string }).requestId : undefined,
  };
}

function apiEntryToReference(entry: PortalResolvedEntryResponseDto): { slot: typeof PORTAL_SLOT_IDS[number]; reference: PortalReference } | undefined {
  if (entry.reference && PORTAL_SLOT_IDS.includes(entry.slot)) {
    return { slot: entry.slot, reference: { entityType: entry.reference.entityType, sourceId: entry.reference.sourceId } };
  }
  if (!entry.content) return undefined;
  const content = entry.content as Record<string, unknown>;
  const sourceId = typeof content.slug === "string" ? content.slug : undefined;
  if (!sourceId || !PORTAL_SLOT_IDS.includes(entry.slot)) return undefined;
  const entityType = entry.slot === "flash" ? "flash"
    : entry.slot === "news" ? (content.kind === "notice" ? "notice" : "article")
      : entry.slot === "projects" ? "project"
        : entry.slot === "activities" ? "activity"
          : entry.slot === "gallery" ? "gallery" : "resource";
  return { slot: entry.slot, reference: { entityType, sourceId } as PortalReference };
}

function configFromApi(response: AdminPortalConfigurationResponseDto): PortalConfig {
  const slots = emptySlots();
  for (const entry of response.entries.slice().sort((left, right) => left.position - right.position)) {
    const normalized = apiEntryToReference(entry);
    if (normalized) slots[normalized.slot].push(normalized.reference);
  }
  const rawVisuals = response.visuals as Record<string, unknown>;
  const visual = (slot: "home" | "join"): PortalVisualConfig => {
    const candidate = rawVisuals[slot] as Record<string, unknown> | undefined;
    return {
      ...(typeof candidate?.attachmentId === "string" ? { attachmentId: candidate.attachmentId } : {}),
      alt: typeof candidate?.alt === "string" ? candidate.alt : "",
    };
  };
  return { revision: response.version, slots, visuals: { home: visual("home"), join: visual("join") }, updatedAt: new Date().toISOString(), updatedBy: "api" };
}

function savePayload(config: PortalConfig) {
  const entries = PORTAL_SLOT_IDS.flatMap((slot) => config.slots[slot].map((reference, index) => ({
    slot,
    position: index + 1,
    entityType: reference.entityType,
    sourceId: reference.sourceId,
  })));
  const visual = (value: PortalVisualConfig) => ({
    ...(value.attachmentId || value.media?.id ? { attachmentId: value.attachmentId ?? value.media?.id } : {}),
    ...(value.alt ? { alt: value.alt } : {}),
  });
  return { expectedVersion: config.revision, entries, visuals: { home: visual(config.visuals.home), join: visual(config.visuals.join) } };
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
    && typeof (visual as Record<string, unknown>).alt === "string"
    && ((visual as Record<string, unknown>).assetId === undefined || typeof (visual as Record<string, unknown>).assetId === "string")
    && ((visual as Record<string, unknown>).attachmentId === undefined || typeof (visual as Record<string, unknown>).attachmentId === "string");
  const validReference = (reference: unknown) => typeof reference === "object" && reference !== null
    && ["flash", "article", "notice", "project", "activity", "gallery", "resource"].includes((reference as Record<string, unknown>).entityType as string)
    && typeof (reference as Record<string, unknown>).sourceId === "string";
  return hasVisual(visuals.home)
    && hasVisual(visuals.join)
    && PORTAL_SLOT_IDS.every((slot) => Array.isArray(slots[slot]) && slots[slot].every(validReference));
}

function migrateVisual(value: PortalVisualConfig): PortalVisualConfig {
  if (!value.assetId || value.media) return clone(value);
  const migrated = clone(value);
  migrated.media = createLegacyContentMediaAttachment(value.assetId, value.alt);
  delete migrated.assetId;
  return migrated;
}

function migrateConfig(value: PortalConfig): PortalConfig {
  return {
    ...clone(value),
    visuals: {
      home: migrateVisual(value.visuals.home),
      join: migrateVisual(value.visuals.join),
    },
  };
}

function isAuditRecord(value: unknown, allowLegacyReason = false): value is PortalConfigAuditRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && record.action === "publish"
    && typeof record.actorId === "string"
    && record.targetId === "portal-config"
    && typeof record.beforeVersion === "number"
    && typeof record.afterVersion === "number"
    && typeof record.actualAt === "string"
    && (typeof record.reason === "string" || (allowLegacyReason && record.reason === undefined));
}

function restorePersistedConfigs(): { draftConfig: PortalConfig; publishedConfig: PortalConfig; auditRecords: PortalConfigAuditRecord[] } | undefined {
  const serialized = getStorage()?.getItem(PORTAL_CONFIG_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const state = parsed as Record<string, unknown>;
    const isLegacyVersion = state.version === 2 || state.version === 3;
    if ((state.version !== PORTAL_CONFIG_STORAGE_VERSION && !isLegacyVersion)
      || !isConfig(state.draftConfig)
      || !isConfig(state.publishedConfig)
      || !Array.isArray(state.auditRecords)
      || !state.auditRecords.every((record) => isAuditRecord(record, isLegacyVersion))) return undefined;
    const draftConfig = migrateConfig(state.draftConfig);
    const publishedConfig = migrateConfig(state.publishedConfig);
    const auditRecords = clone(state.auditRecords).map((record) => ({
      ...record,
      reason: record.reason || "legacy portal publication",
    }));
    if (isLegacyVersion) {
      try {
        writePersistedConfigs(draftConfig, publishedConfig, auditRecords);
      } catch {
        // The migrated state remains available in memory when storage is unavailable.
      }
    }
    return {
      draftConfig,
      publishedConfig,
      auditRecords,
    };
  } catch {
    return undefined;
  }
}

function capabilityActorId(capability: "portal.configure" | "portal.publish") {
  const session = useSessionStore();
  if (!session.isAuthenticated || !session.hasCapability(capability) || !session.currentAccount) {
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
    if (visual.media && !isContentMediaAttachmentComplete(visual.media)) {
      throw new Error("PORTAL_CONFIG_INVALID_VISUAL");
    }
    if (!visual.media && visual.assetId && (!visual.alt.trim() || !canUseAssetForPortalContent(visual.assetId))) {
      throw new Error("PORTAL_CONFIG_INVALID_VISUAL");
    }
  }
}

export const usePortalConfigStore = defineStore("portal-config", {
  state: () => {
    const persisted = runtimeUsesMockApi() ? restorePersistedConfigs() : undefined;
    const useMockApi = runtimeUsesMockApi();
    return {
      draftConfig: persisted?.draftConfig ?? (useMockApi ? initialConfig() : emptyConfig()),
      publishedConfig: persisted?.publishedConfig ?? (useMockApi ? initialConfig() : emptyConfig()),
      auditRecords: persisted?.auditRecords ?? [] as PortalConfigAuditRecord[],
      persistenceError: undefined as string | undefined,
      requestError: null as ReturnType<typeof errorFrom> | null,
      loading: false,
      draftStatus: (useMockApi ? "ready" : "idle") as PortalDraftStatus,
      apiModeActive: !runtimeUsesMockApi(),
    };
  },
  actions: {
    async initializeForRuntime(config: PortalConfigRuntimeConfig, gateway: PortalConfigGateway | undefined) {
      this.apiModeActive = !config.useMockApi;
      this.requestError = null;
      this.draftStatus = config.useMockApi ? "ready" : "loading";
      if (config.useMockApi) return this.preview();
      if (!gateway) {
        const error = new Error("PORTAL_CONFIG_API_UNAVAILABLE");
        this.requestError = errorFrom(error);
        this.draftStatus = "error";
        throw error;
      }
      capabilityActorId("portal.configure");
      this.loading = true;
      try {
        const draft = configFromApi(await gateway.portal.draft());
        this.draftConfig = draft;
        this.publishedConfig = clone(draft);
        this.persistenceError = undefined;
        this.draftStatus = "ready";
        return clone(draft);
      } catch (error) {
        this.requestError = errorFrom(error);
        this.draftStatus = "error";
        throw error;
      } finally { this.loading = false; }
    },
    async previewForRuntime(config: PortalConfigRuntimeConfig, gateway: PortalConfigGateway | undefined) {
      if (config.useMockApi) return this.preview();
      if (!gateway) { const error = new Error("PORTAL_CONFIG_API_UNAVAILABLE"); this.requestError = errorFrom(error); throw error; }
      capabilityActorId("portal.configure");
      this.requestError = null; this.loading = true;
      try { const draft = configFromApi(await gateway.portal.preview()); this.draftConfig = draft; return clone(draft); }
      catch (error) { this.requestError = errorFrom(error); throw error; }
      finally { this.loading = false; }
    },
    async saveDraftForRuntime(config: PortalConfigRuntimeConfig, gateway: PortalConfigGateway | undefined, patch: PortalConfigPatch) {
      if (config.useMockApi) return this.saveDraft(patch);
      if (!gateway) { const error = new Error("PORTAL_CONFIG_API_UNAVAILABLE"); this.requestError = errorFrom(error); throw error; }
      capabilityActorId("portal.configure");
      if (this.draftStatus !== "ready") {
        const error = new Error("PORTAL_CONFIG_NOT_READY");
        this.requestError = errorFrom(error);
        throw error;
      }
      const next = clone(this.draftConfig);
      if (patch.slots) for (const slot of PORTAL_SLOT_IDS) if (patch.slots[slot]) next.slots[slot] = clone(patch.slots[slot]!);
      if (patch.visuals) next.visuals = { ...next.visuals, ...clone(patch.visuals) };
      this.requestError = null; this.loading = true;
      try { const saved = configFromApi(await gateway.portal.saveDraft(savePayload(next))); this.draftConfig = saved; return clone(saved); }
      catch (error) { this.requestError = errorFrom(error); throw error; }
      finally { this.loading = false; }
    },
    async publishForRuntime(config: PortalConfigRuntimeConfig, gateway: PortalConfigGateway | undefined, confirmed: boolean) {
      if (config.useMockApi) return this.publish([], confirmed);
      if (!gateway) { const error = new Error("PORTAL_CONFIG_API_UNAVAILABLE"); this.requestError = errorFrom(error); throw error; }
      capabilityActorId("portal.publish");
      if (!confirmed) throw new Error("CONFIRMATION_REQUIRED");
      this.requestError = null; this.loading = true;
      try { const published = configFromApi(await gateway.portal.publish({ expectedVersion: this.draftConfig.revision, confirmed })); this.draftConfig = published; this.publishedConfig = clone(published); return clone(published); }
      catch (error) { this.requestError = errorFrom(error); throw error; }
      finally { this.loading = false; }
    },
    persist() {
      if (this.apiModeActive) throw new Error("PORTAL_CONFIG_API_REQUIRED");
      try {
        writePersistedConfigs(this.draftConfig, this.publishedConfig, this.auditRecords);
        this.persistenceError = undefined;
      } catch {
        this.persistenceError = "PORTAL_CONFIG_STORAGE_UNAVAILABLE";
      }
    },
    saveDraft(patch: PortalConfigPatch, now: Date = new Date()) {
      if (this.apiModeActive) throw new Error("PORTAL_CONFIG_API_REQUIRED");
      const actor = capabilityActorId("portal.configure");
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
      if (this.apiModeActive) throw new Error("PORTAL_CONFIG_API_REQUIRED");
      capabilityActorId("portal.configure");
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
      if (this.apiModeActive) throw new Error("PORTAL_CONFIG_API_REQUIRED");
      capabilityActorId("portal.configure");
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
      if (this.apiModeActive) throw new Error("PORTAL_CONFIG_API_REQUIRED");
      capabilityActorId("portal.configure");
      const target = index + (direction === "up" ? -1 : 1);
      const references = clone(this.draftConfig.slots[slot]);
      if (!Number.isInteger(index) || index < 0 || index >= references.length || target < 0 || target >= references.length) {
        throw new Error("PORTAL_CONFIG_INVALID_REFERENCE");
      }
      [references[index], references[target]] = [references[target]!, references[index]!];
      return this.saveDraft({ slots: { [slot]: references } }, now);
    },
    preview() {
      if (this.apiModeActive) throw new Error("PORTAL_CONFIG_API_REQUIRED");
      capabilityActorId("portal.configure");
      return clone(this.draftConfig);
    },
    publish(
      catalog: readonly PortalCatalogItem[],
      confirmed: boolean,
      now: Date = new Date(),
      reason = "publish portal configuration",
    ) {
      if (this.apiModeActive) throw new Error("PORTAL_CONFIG_API_REQUIRED");
      const actor = capabilityActorId("portal.publish");
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
        reason,
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
