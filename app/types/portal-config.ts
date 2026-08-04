import type { PortalCatalogEntityType, PortalSlotId } from "./portal-content";

export { type PortalSlotId } from "./portal-content";

export interface PortalReference {
  entityType: PortalCatalogEntityType;
  sourceId: string;
}

export interface PortalVisualConfig {
  assetId?: string;
  alt: string;
  supportingText?: string;
}

export type PortalSlots = Record<PortalSlotId, PortalReference[]>;

export interface PortalConfig {
  revision: number;
  slots: PortalSlots;
  visuals: {
    home: PortalVisualConfig;
    join: PortalVisualConfig;
  };
  updatedAt: string;
  updatedBy: string;
}

export interface PortalConfigPatch {
  slots?: Partial<PortalSlots>;
  visuals?: Partial<PortalConfig["visuals"]>;
}

export interface PortalConfigAuditRecord {
  id: string;
  action: "publish";
  actorId: string;
  targetId: "portal-config";
  beforeVersion: number;
  afterVersion: number;
  actualAt: string;
}
