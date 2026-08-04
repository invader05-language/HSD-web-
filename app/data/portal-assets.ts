import recruitmentHeroSource from "../../设计稿/页面Banner/01-首页Banner.png?url";

const PUBLISHED_PORTAL_ASSET_SOURCES: Readonly<Record<string, string>> = {
  "asset-recruitment-hero": recruitmentHeroSource,
};

export function resolvePortalAssetSource(assetId?: string) {
  if (!assetId || !Object.hasOwn(PUBLISHED_PORTAL_ASSET_SOURCES, assetId)) return undefined;
  return PUBLISHED_PORTAL_ASSET_SOURCES[assetId];
}
