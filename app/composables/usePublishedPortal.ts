import type { PortalCatalogItem, PortalSlotId } from "../types/portal-content";
import type { PortalReference, PortalSlots } from "../types/portal-config";
import { usePortalCatalog } from "./usePortalCatalog";
import { PORTAL_SLOT_CAPACITY, PORTAL_SLOT_IDS, usePortalConfigStore } from "../stores/portal-config";

export interface ResolvedPortalCatalogItem extends PortalCatalogItem {
  fallbackFor?: string;
}

export interface PortalProjectionWarning {
  slot: PortalSlotId;
  sourceId: string;
  entityType: PortalReference["entityType"];
  fallbackSourceId?: string;
  code: "fallback" | "empty";
}

export interface HomepageProjection {
  slots: Record<PortalSlotId, ResolvedPortalCatalogItem[]>;
  warnings: PortalProjectionWarning[];
}

function match(reference: PortalReference, catalog: readonly PortalCatalogItem[]) {
  return catalog.find((item) => item.entityType === reference.entityType && item.sourceId === reference.sourceId);
}

export function resolveHomepageProjection(
  configuredSlots: Partial<PortalSlots>,
  catalog: readonly PortalCatalogItem[],
): HomepageProjection {
  const used = new Set<string>();
  const reserved = new Set<string>();
  const warnings: PortalProjectionWarning[] = [];
  for (const slot of PORTAL_SLOT_IDS) {
    for (const reference of configuredSlots[slot] ?? []) {
      const configured = match(reference, catalog);
      if (configured?.available && configured.eligibleSlots.includes(slot)) {
        reserved.add(`${reference.entityType}:${reference.sourceId}`);
      }
    }
  }
  const resolved: Record<PortalSlotId, ResolvedPortalCatalogItem[]> = {
    flash: [], news: [], projects: [], activities: [], gallery: [], resources: [],
  };
  for (const slot of PORTAL_SLOT_IDS) {
    const references = configuredSlots[slot] ?? [];
    for (const reference of references.slice(0, PORTAL_SLOT_CAPACITY[slot])) {
      const configured = match(reference, catalog);
      const configuredKey = `${reference.entityType}:${reference.sourceId}`;
      if (configured?.available && configured.eligibleSlots.includes(slot) && !used.has(configuredKey)) {
        resolved[slot].push({ ...configured });
        used.add(configuredKey);
        continue;
      }
      const replacement = catalog
        .filter((item) => item.entityType === reference.entityType && item.available && item.eligibleSlots.includes(slot))
        .filter((item) => !used.has(`${item.entityType}:${item.sourceId}`))
        .filter((item) => !reserved.has(`${item.entityType}:${item.sourceId}`))
        .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))[0];
      if (replacement) {
        resolved[slot].push({ ...replacement, fallbackFor: reference.sourceId });
        used.add(`${replacement.entityType}:${replacement.sourceId}`);
        warnings.push({
          slot,
          sourceId: reference.sourceId,
          entityType: reference.entityType,
          fallbackSourceId: replacement.sourceId,
          code: "fallback",
        });
      } else {
        warnings.push({
          slot,
          sourceId: reference.sourceId,
          entityType: reference.entityType,
          code: "empty",
        });
      }
    }
  }
  return { slots: resolved, warnings };
}

export function resolveHomepageSlots(
  configuredSlots: Partial<PortalSlots>,
  catalog: readonly PortalCatalogItem[],
): Record<PortalSlotId, ResolvedPortalCatalogItem[]> {
  return resolveHomepageProjection(configuredSlots, catalog).slots;
}

export function usePublishedPortal() {
  const config = usePortalConfigStore();
  const projection = resolveHomepageProjection(config.publishedConfig.slots, usePortalCatalog());
  return {
    config: config.publishedConfig,
    homepageSlots: projection.slots,
    warnings: projection.warnings,
  };
}
