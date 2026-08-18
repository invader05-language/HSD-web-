import recruitmentHeroSource from "../../设计稿/页面Banner/01-首页Banner.png?url";
import homePosterSource from "../assets/images/page-banners/home-poster.webp?url";
import aboutTeamSource from "../assets/images/page-banners/about-team.webp?url";
import centersBaizeSource from "../assets/images/page-banners/centers-baize.webp?url";
import projectsBaizeSource from "../assets/images/page-banners/projects-baize.webp?url";
import activitiesProgrammerDaySource from "../assets/images/page-banners/activities-programmer-day.webp?url";
import galleryTransitionSource from "../assets/images/page-banners/gallery-transition.webp?url";
import resourcesProgrammerDaySource from "../assets/images/page-banners/resources-programmer-day.webp?url";
import joinOrientationSource from "../assets/images/page-banners/join-orientation.webp?url";

const PUBLISHED_PORTAL_ASSET_SOURCES: Readonly<Record<string, string>> = {
  "asset-recruitment-hero": recruitmentHeroSource,
  "asset-home-poster": homePosterSource,
  "asset-about-team": aboutTeamSource,
  "asset-centers-baize": centersBaizeSource,
  "asset-projects-baize": projectsBaizeSource,
  "asset-activities-programmer-day": activitiesProgrammerDaySource,
  "asset-gallery-transition": galleryTransitionSource,
  "asset-resources-programmer-day": resourcesProgrammerDaySource,
  "asset-join-orientation": joinOrientationSource,
};

export function resolvePortalAssetSource(assetId?: string) {
  if (!assetId || !Object.hasOwn(PUBLISHED_PORTAL_ASSET_SOURCES, assetId)) return undefined;
  return PUBLISHED_PORTAL_ASSET_SOURCES[assetId];
}
