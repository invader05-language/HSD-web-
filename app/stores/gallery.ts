import { defineStore } from "pinia";
import { ADMIN_ASSETS, canSelectAsset } from "../data/admin-assets";
import { GALLERY_ALBUMS, type GalleryAsset, type GalleryAlbum } from "../data/gallery";
import { isContentMediaAttachmentComplete } from "../utils/content-media";
import { getAdminCenterScope, getRecruitmentCenterId } from "../utils/admin-center-scope";
import { useSessionStore } from "./session";
import type { GalleryCategory, GalleryDraftInput, ManagedGalleryAlbum, PublishedGalleryAlbum } from "../types/gallery";

export type { GalleryCategory, GalleryDraftInput, ManagedGalleryAlbum, PublishedGalleryAlbum } from "../types/gallery";

export const GALLERY_STORAGE_KEY = "baiyun-hsd.gallery";
export const GALLERY_STORAGE_VERSION = 2;
export const GALLERY_PUBLISHED_SLUGS_COOKIE = "baiyun-hsd.gallery-published-slugs";

interface PersistedGalleryState {
  version: typeof GALLERY_STORAGE_VERSION;
  albums: ManagedGalleryAlbum[];
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
  return slug || `gallery-${Date.now()}`;
}

function seedAlbum(album: GalleryAlbum, index: number): ManagedGalleryAlbum {
  const publishedAt = `${album.year}-01-01T00:00:00.000Z`;
  const snapshot: PublishedGalleryAlbum = {
    id: album.slug,
    slug: album.slug,
    title: album.title,
    category: album.category,
    year: album.year,
    summary: album.summary,
    team: album.team,
    ownerCenterId: "new-media",
    assets: normalizeAssets(album.assets),
    to: `/gallery/${album.slug}`,
    publishedAt,
    revision: 1,
  };
  return {
    ...snapshot,
    status: "published",
    publishedState: "published",
    version: index + 1,
    createdAt: publishedAt,
    updatedAt: publishedAt,
    createdBy: "admin-alliance",
    publishedSnapshot: snapshot,
  };
}

function seedAlbums() {
  return GALLERY_ALBUMS.map(seedAlbum);
}

function isGalleryCategory(value: unknown): value is GalleryCategory {
  return value === "活动摄影" || value === "海报设计" || value === "短视频" || value === "人物专访";
}

function normalizeAssets(assets: readonly GalleryAsset[]) {
  return assets.map((asset, index) => ({
    ...asset,
    role: asset.role ?? "detail",
    kind: asset.kind ?? "image",
    status: asset.status ?? "ready",
    sortOrder: asset.sortOrder ?? index,
  }));
}

function migratePersistedState(value: unknown): PersistedGalleryState | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const state = value as Record<string, unknown>;
  if (!Array.isArray(state.albums)) return undefined;
  if (state.version !== 1 && state.version !== GALLERY_STORAGE_VERSION) return undefined;
  if (!state.albums.every((album) => {
    if (typeof album !== "object" || album === null) return false;
    const item = album as Record<string, unknown>;
    return typeof item.id === "string"
      && typeof item.slug === "string"
      && typeof item.title === "string"
      && isGalleryCategory(item.category)
      && Array.isArray(item.assets)
      && ["draft", "published", "unpublished"].includes(item.status as string)
      && ["published", "unpublished"].includes(item.publishedState as string);
  })) return undefined;
  return {
    version: GALLERY_STORAGE_VERSION,
    albums: (state.albums as ManagedGalleryAlbum[]).map((album) => ({
      ...album,
      assets: normalizeAssets(album.assets),
      publishedSnapshot: album.publishedSnapshot
        ? { ...album.publishedSnapshot, assets: normalizeAssets(album.publishedSnapshot.assets) }
        : undefined,
    })),
  };
}

function readPersistedState(): PersistedGalleryState | undefined {
  const serialized = getStorage()?.getItem(GALLERY_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    const migrated = migratePersistedState(parsed);
    return migrated ? clone(migrated) : undefined;
  } catch {
    return undefined;
  }
}

function writePersistedState(albums: readonly ManagedGalleryAlbum[]) {
  const storage = getStorage();
  if (!storage) throw new Error("GALLERY_PERSISTENCE_FAILED");
  try {
    storage.setItem(GALLERY_STORAGE_KEY, JSON.stringify({ version: GALLERY_STORAGE_VERSION, albums: [...albums] } satisfies PersistedGalleryState));
  } catch {
    throw new Error("GALLERY_PERSISTENCE_FAILED");
  }
}

function syncPublishedSlugsCookie(albums: readonly ManagedGalleryAlbum[]) {
  if (typeof document === "undefined") return;
  const slugs = albums
    .filter((album) => album.publishedState === "published" && album.publishedSnapshot)
    .map((album) => album.slug);
  document.cookie = `${GALLERY_PUBLISHED_SLUGS_COOKIE}=${encodeURIComponent(JSON.stringify(slugs))}; path=/; max-age=31536000; samesite=lax`;
}

function requireAdminActor() {
  const session = useSessionStore();
  if (!session.isAuthenticated || !session.canAccessAdmin || !session.currentAccount) throw new Error("ADMIN_PERMISSION_REQUIRED");
  return session;
}

function canManage(session: ReturnType<typeof useSessionStore>, album: ManagedGalleryAlbum) {
  if (session.adminLevel === "owner") return true;
  const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return Boolean(scope && album.ownerCenterId === getRecruitmentCenterId(scope));
}

function assertCanManage(album: ManagedGalleryAlbum) {
  const session = requireAdminActor();
  if (!canManage(session, album)) throw new Error("GALLERY_CENTER_SCOPE_REQUIRED");
  return session;
}

function validateAssets(assets: GalleryAsset[], requireComplete = false) {
  if (!assets.length && requireComplete) throw new Error("GALLERY_ASSET_REQUIRED");
  for (const asset of assets) {
    if (asset.assetId) {
      const referenced = ADMIN_ASSETS.find((candidate) => candidate.id === asset.assetId);
      if (referenced && referenced.type !== "文档" && canSelectAsset(referenced)) asset.imageUrl = asset.imageUrl ?? referenced.imageUrl;
    }
    if (!asset.id.trim()) throw new Error("GALLERY_ASSET_METADATA_REQUIRED");
    asset.role = asset.role ?? "detail";
    asset.kind = asset.kind ?? "image";
    asset.status = asset.status ?? "ready";
  }
}

function assertCompleteGallery(album: ManagedGalleryAlbum) {
  if (!album.title.trim() || !album.category || !album.year.trim() || !album.ownerCenterId.trim() || !album.summary.trim() || !album.team.trim()) {
    throw new Error("GALLERY_INCOMPLETE");
  }
  validateAssets(album.assets, true);
  for (const asset of album.assets) {
    const complete = isContentMediaAttachmentComplete({
      id: asset.id,
      role: asset.role ?? "detail",
      kind: asset.kind ?? "image",
      title: asset.title,
      caption: asset.caption,
      alt: asset.alt,
      aspect: asset.aspect,
      sortOrder: asset.sortOrder ?? 0,
      url: asset.imageUrl,
      localBlobId: asset.localBlobId,
      thumbnailUrl: asset.thumbnailUrl,
      status: asset.status ?? "ready",
      errorMessage: asset.errorMessage,
    });
    if (!complete) throw new Error("GALLERY_ASSET_METADATA_REQUIRED");
  }
}

export const useGalleryStore = defineStore("gallery", {
  state: () => {
    const persisted = readPersistedState();
    return {
      albums: persisted?.albums ?? seedAlbums(),
      persistenceError: undefined as string | undefined,
    };
  },
  actions: {
    hydrate() {
      const persisted = readPersistedState();
      if (persisted) this.albums = persisted.albums;
    },
    persist() {
      try {
        writePersistedState(this.albums);
        syncPublishedSlugsCookie(this.albums);
        this.persistenceError = undefined;
      } catch (error) {
        this.persistenceError = error instanceof Error ? error.message : "GALLERY_PERSISTENCE_FAILED";
        throw error;
      }
    },
    getById(albumId: string) {
      return this.albums.find((album) => album.id === albumId);
    },
    canManageAlbum(albumId: string): boolean {
      const album = this.getById(albumId);
      if (!album) return false;
      const session = useSessionStore();
      return session.canAccessAdmin && canManage(session, album);
    },
    getPublicAlbums(): PublishedGalleryAlbum[] {
      return this.albums.filter((album) => album.publishedState === "published" && album.publishedSnapshot).map((album) => clone(album.publishedSnapshot!));
    },
    getPublicBySlug(slug: string) {
      const album = this.albums.find((item) => item.slug === slug && item.publishedState === "published" && item.publishedSnapshot);
      return album?.publishedSnapshot ? clone(album.publishedSnapshot) : undefined;
    },
    createDraft(input: GalleryDraftInput, now: Date = new Date()): ManagedGalleryAlbum {
      const session = requireAdminActor();
      const slug = slugify(input.slug?.trim() || input.title);
      if (this.albums.some((album) => album.slug === slug || album.publishedSnapshot?.slug === slug)) throw new Error("GALLERY_DUPLICATE_SLUG");
      const ownerCenterId = input.ownerCenterId.trim();
      if (session.adminLevel !== "owner") {
        const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
        if (!scope || ownerCenterId !== getRecruitmentCenterId(scope)) throw new Error("GALLERY_CENTER_SCOPE_REQUIRED");
      }
      const assets = clone(input.assets);
      validateAssets(assets);
      const timestamp = now.toISOString();
      const album: ManagedGalleryAlbum = {
        id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        slug,
        title: input.title.trim(),
        category: input.category,
        year: input.year.trim(),
        summary: input.summary.trim(),
        team: input.team.trim(),
        ownerCenterId,
        assets,
        to: `/gallery/${slug}`,
        publishedAt: timestamp,
        revision: 0,
        status: "draft",
        publishedState: "unpublished",
        version: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: session.currentAccount!.account,
      };
      this.albums.unshift(album);
      try {
        this.persist();
      } catch (error) {
        this.albums.shift();
        throw error;
      }
      return album;
    },
    updateDraft(albumId: string, patch: Partial<GalleryDraftInput>, now: Date = new Date()): ManagedGalleryAlbum {
      const album = this.getById(albumId);
      if (!album) throw new Error("GALLERY_NOT_FOUND");
      assertCanManage(album);
      if (patch.slug && slugify(patch.slug) !== album.slug && album.publishedSnapshot) throw new Error("GALLERY_SLUG_IMMUTABLE");
      const previous = clone(album);
      if (patch.ownerCenterId && patch.ownerCenterId !== album.ownerCenterId) {
        const session = requireAdminActor();
        if (session.adminLevel !== "owner") {
          const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
          if (!scope || patch.ownerCenterId !== getRecruitmentCenterId(scope)) throw new Error("GALLERY_CENTER_SCOPE_REQUIRED");
        }
      }
      const next = { ...patch } as Record<string, unknown>;
      if (typeof next.slug === "string") {
        const slug = slugify(next.slug);
        if (this.albums.some((item) => item.id !== album.id && (item.slug === slug || item.publishedSnapshot?.slug === slug))) throw new Error("GALLERY_DUPLICATE_SLUG");
        next.slug = slug;
        next.to = `/gallery/${slug}`;
      }
      if (Array.isArray(next.assets)) {
        next.assets = clone(next.assets);
        validateAssets(next.assets as GalleryAsset[]);
      }
      Object.assign(album, next);
      album.title = album.title.trim();
      album.summary = album.summary.trim();
      album.team = album.team.trim();
      album.updatedAt = now.toISOString();
      album.version += 1;
      try {
        this.persist();
      } catch (error) {
        Object.assign(album, previous);
        throw error;
      }
      return album;
    },
    publish(albumId: string, now: Date = new Date()): ManagedGalleryAlbum {
      const album = this.getById(albumId);
      if (!album) throw new Error("GALLERY_NOT_FOUND");
      assertCanManage(album);
      assertCompleteGallery(album);
      const previous = clone(album);
      const snapshot: PublishedGalleryAlbum = {
        id: album.id,
        slug: album.slug,
        title: album.title,
        category: album.category,
        year: album.year,
        summary: album.summary,
        team: album.team,
        ownerCenterId: album.ownerCenterId,
        assets: clone([...album.assets]),
        to: `/gallery/${album.slug}`,
        publishedAt: now.toISOString(),
        revision: album.revision + 1,
      };
      album.publishedSnapshot = snapshot;
      album.publishedState = "published";
      album.status = "published";
      album.publishedAt = snapshot.publishedAt;
      album.revision = snapshot.revision;
      album.updatedAt = snapshot.publishedAt;
      album.version += 1;
      try {
        this.persist();
      } catch (error) {
        Object.assign(album, previous);
        throw error;
      }
      return album;
    },
    unpublish(albumId: string, _reason = "", now: Date = new Date()): ManagedGalleryAlbum {
      const album = this.getById(albumId);
      if (!album) throw new Error("GALLERY_NOT_FOUND");
      assertCanManage(album);
      const previous = clone(album);
      album.publishedState = "unpublished";
      album.status = "unpublished";
      album.updatedAt = now.toISOString();
      album.version += 1;
      try {
        this.persist();
      } catch (error) {
        Object.assign(album, previous);
        throw error;
      }
      return album;
    },
  },
});
