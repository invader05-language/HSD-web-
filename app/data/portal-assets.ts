import recruitmentHeroSource from "../../设计稿/页面Banner/01-首页Banner.png?url";
import homePosterSource from "../assets/images/page-banners/home-poster.webp?url";
import aboutTeamSource from "../assets/images/page-banners/about-team.webp?url";
import centersBaizeSource from "../assets/images/page-banners/centers-baize.webp?url";
import projectsBaizeSource from "../assets/images/page-banners/projects-baize.webp?url";
import activitiesProgrammerDaySource from "../assets/images/page-banners/activities-programmer-day.webp?url";
import galleryTransitionSource from "../assets/images/page-banners/gallery-transition.webp?url";
import resourcesProgrammerDaySource from "../assets/images/page-banners/resources-programmer-day.webp?url";
import joinOrientationSource from "../assets/images/page-banners/join-orientation.webp?url";
import homePosterV2Source from "../assets/images/page-banners/v2/asset-home-poster-v2-828w.webp?url";
import aboutTeamV2Source828 from "../assets/images/page-banners/v2/asset-about-team-v2-828w.webp?url";
import aboutTeamV2Source1440 from "../assets/images/page-banners/v2/asset-about-team-v2-1440w.webp?url";
import aboutTeamV2Source1920 from "../assets/images/page-banners/v2/asset-about-team-v2-1920w.webp?url";
import centersBaizeV2Source828 from "../assets/images/page-banners/v2/asset-centers-baize-v2-828w.webp?url";
import centersBaizeV2Source1440 from "../assets/images/page-banners/v2/asset-centers-baize-v2-1440w.webp?url";
import centersBaizeV2Source1920 from "../assets/images/page-banners/v2/asset-centers-baize-v2-1920w.webp?url";
import projectsBaizeV2Source828 from "../assets/images/page-banners/v2/asset-projects-baize-v2-828w.webp?url";
import projectsBaizeV2Source1440 from "../assets/images/page-banners/v2/asset-projects-baize-v2-1440w.webp?url";
import projectsBaizeV2Source1920 from "../assets/images/page-banners/v2/asset-projects-baize-v2-1920w.webp?url";
import activitiesProgrammerDayV2Source828 from "../assets/images/page-banners/v2/asset-activities-programmer-day-v2-828w.webp?url";
import activitiesProgrammerDayV2Source1440 from "../assets/images/page-banners/v2/asset-activities-programmer-day-v2-1440w.webp?url";
import activitiesProgrammerDayV2Source1920 from "../assets/images/page-banners/v2/asset-activities-programmer-day-v2-1920w.webp?url";
import galleryTransitionV2Source828 from "../assets/images/page-banners/v2/asset-gallery-transition-v2-828w.webp?url";
import galleryTransitionV2Source1440 from "../assets/images/page-banners/v2/asset-gallery-transition-v2-1440w.webp?url";
import galleryTransitionV2Source1920 from "../assets/images/page-banners/v2/asset-gallery-transition-v2-1920w.webp?url";
import resourcesProgrammerDayV2Source828 from "../assets/images/page-banners/v2/asset-resources-programmer-day-v2-828w.webp?url";
import resourcesProgrammerDayV2Source1440 from "../assets/images/page-banners/v2/asset-resources-programmer-day-v2-1440w.webp?url";
import resourcesProgrammerDayV2Source1920 from "../assets/images/page-banners/v2/asset-resources-programmer-day-v2-1920w.webp?url";
import joinOrientationV2Source828 from "../assets/images/page-banners/v2/asset-join-orientation-v2-828w.webp?url";
import joinOrientationV2Source1440 from "../assets/images/page-banners/v2/asset-join-orientation-v2-1440w.webp?url";
import joinOrientationV2Source1920 from "../assets/images/page-banners/v2/asset-join-orientation-v2-1920w.webp?url";

export interface PortalAssetMetadata {
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
  fallbackSrc?: string;
}

const PUBLISHED_PORTAL_ASSET_SOURCES: Readonly<Record<string, string>> = {
  "asset-recruitment-hero": recruitmentHeroSource,
  "asset-home-poster": homePosterV2Source,
  "asset-about-team": aboutTeamV2Source1440,
  "asset-centers-baize": centersBaizeV2Source1440,
  "asset-projects-baize": projectsBaizeV2Source1440,
  "asset-activities-programmer-day": activitiesProgrammerDayV2Source1440,
  "asset-gallery-transition": galleryTransitionV2Source1440,
  "asset-resources-programmer-day": resourcesProgrammerDayV2Source1440,
  "asset-join-orientation": joinOrientationV2Source1440,
};

export function resolvePortalAssetSource(assetId?: string) {
  if (!assetId || !Object.hasOwn(PUBLISHED_PORTAL_ASSET_SOURCES, assetId)) return undefined;
  return PUBLISHED_PORTAL_ASSET_SOURCES[assetId];
}

const PAGE_BANNER_SIZES = "(max-width: 900px) 100vw, 48vw";

const PUBLISHED_PORTAL_ASSET_METADATA: Readonly<Record<string, PortalAssetMetadata>> = {
  "asset-home-poster": {
    src: homePosterV2Source,
    srcSet: `${homePosterV2Source} 828w`,
    sizes: PAGE_BANNER_SIZES,
    width: 828,
    height: 1175,
    fallbackSrc: homePosterSource,
  },
  "asset-about-team": {
    src: aboutTeamV2Source1440,
    srcSet: `${aboutTeamV2Source828} 828w, ${aboutTeamV2Source1440} 1440w, ${aboutTeamV2Source1920} 1920w`,
    sizes: PAGE_BANNER_SIZES,
    width: 1920,
    height: 1280,
    fallbackSrc: aboutTeamSource,
  },
  "asset-centers-baize": {
    src: centersBaizeV2Source1440,
    srcSet: `${centersBaizeV2Source828} 828w, ${centersBaizeV2Source1440} 1440w, ${centersBaizeV2Source1920} 1920w`,
    sizes: PAGE_BANNER_SIZES,
    width: 2200,
    height: 1467,
    fallbackSrc: centersBaizeSource,
  },
  "asset-projects-baize": {
    src: projectsBaizeV2Source1440,
    srcSet: `${projectsBaizeV2Source828} 828w, ${projectsBaizeV2Source1440} 1440w, ${projectsBaizeV2Source1920} 1920w`,
    sizes: PAGE_BANNER_SIZES,
    width: 4096,
    height: 2730,
    fallbackSrc: projectsBaizeSource,
  },
  "asset-activities-programmer-day": {
    src: activitiesProgrammerDayV2Source1440,
    srcSet: `${activitiesProgrammerDayV2Source828} 828w, ${activitiesProgrammerDayV2Source1440} 1440w, ${activitiesProgrammerDayV2Source1920} 1920w`,
    sizes: PAGE_BANNER_SIZES,
    width: 2200,
    height: 1467,
    fallbackSrc: activitiesProgrammerDaySource,
  },
  "asset-gallery-transition": {
    src: galleryTransitionV2Source1440,
    srcSet: `${galleryTransitionV2Source828} 828w, ${galleryTransitionV2Source1440} 1440w, ${galleryTransitionV2Source1920} 1920w`,
    sizes: PAGE_BANNER_SIZES,
    width: 2200,
    height: 1467,
    fallbackSrc: galleryTransitionSource,
  },
  "asset-resources-programmer-day": {
    src: resourcesProgrammerDayV2Source1440,
    srcSet: `${resourcesProgrammerDayV2Source828} 828w, ${resourcesProgrammerDayV2Source1440} 1440w, ${resourcesProgrammerDayV2Source1920} 1920w`,
    sizes: PAGE_BANNER_SIZES,
    width: 2200,
    height: 1467,
    fallbackSrc: resourcesProgrammerDaySource,
  },
  "asset-join-orientation": {
    src: joinOrientationV2Source1440,
    srcSet: `${joinOrientationV2Source828} 828w, ${joinOrientationV2Source1440} 1440w, ${joinOrientationV2Source1920} 1920w`,
    sizes: PAGE_BANNER_SIZES,
    width: 3472,
    height: 1769,
    fallbackSrc: joinOrientationSource,
  },
};

export function resolvePortalAssetMetadata(assetId?: string) {
  if (!assetId || !Object.hasOwn(PUBLISHED_PORTAL_ASSET_METADATA, assetId)) return undefined;
  return PUBLISHED_PORTAL_ASSET_METADATA[assetId];
}
