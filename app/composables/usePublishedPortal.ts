import type { PortalCatalogItem, PortalSlotId } from "../types/portal-content";
import type { PortalReference, PortalSlots } from "../types/portal-config";
import { usePortalCatalog } from "./usePortalCatalog";
import { usePortalConfigStore } from "../stores/portal-config";

const slotIds: PortalSlotId[] = ["flash", "news", "projects", "activities", "gallery", "resources"];
const slotCapacity: Record<PortalSlotId, number> = { flash: 1, news: 3, projects: 4, activities: 3, gallery: 1, resources: 3 };

export interface ResolvedPortalCatalogItem extends PortalCatalogItem {
  fallbackFor?: string;
}

function match(reference: PortalReference, catalog: readonly PortalCatalogItem[]) {
  return catalog.find((item) => item.entityType === reference.entityType && item.sourceId === reference.sourceId);
}

export function resolveHomepageSlots(
  configuredSlots: Partial<PortalSlots>,
  catalog: readonly PortalCatalogItem[],
): Record<PortalSlotId, ResolvedPortalCatalogItem[]> {
  const used = new Set<string>();
  const resolved: Record<PortalSlotId, ResolvedPortalCatalogItem[]> = {
    flash: [], news: [], projects: [], activities: [], gallery: [], resources: [],
  };
  for (const slot of slotIds) {
    const references = configuredSlots[slot] ?? [];
    for (const reference of references.slice(0, slotCapacity[slot])) {
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
        .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))[0];
      if (replacement) {
        resolved[slot].push({ ...replacement, fallbackFor: reference.sourceId });
        used.add(`${replacement.entityType}:${replacement.sourceId}`);
      }
    }
  }
  return resolved;
}

export function usePublishedPortal() {
  const config = usePortalConfigStore();
  return {
    config: config.publishedConfig,
    homepageSlots: resolveHomepageSlots(config.publishedConfig.slots, usePortalCatalog()),
  };
}
