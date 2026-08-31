import { defineStore } from "pinia";
import { ADMIN_ASSETS, canSelectAsset } from "../data/admin-assets";
import { GALLERY_ALBUMS, type GalleryAsset, type GalleryAlbum } from "../data/gallery";
import { isContentMediaAttachmentComplete } from "../utils/content-media";
import { getAdminCenterScope, getRecruitmentCenterId } from "../utils/admin-center-scope";
import { useSessionStore } from "./session";
import { normalizeGalleryCategory, type GalleryCategory, type GalleryDraftInput, type ManagedGalleryAlbum, type PublishedGalleryAlbum } from "../types/gallery";

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
    category: normalizeGalleryCategory(album.category),
    year: album.year,
    summary: album.summary,
    ownerCenterId: "new-media",
    assets: normalizeAssets(album.assets),
    cover: asCover(normalizeAssets(album.assets)[0]),
    to: `/gallery/${album.slug}`,
    publishedAt,
    revision: 1,
  };
  return {
    ...snapshot,
    team: album.team,
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
  return typeof value === "string" && ["event_documentary", "visual_creation", "video_work", "people_stories", "活动摄影", "海报设计", "短视频", "人物专访"].includes(value);
}

function normalizeAssets(assets: readonly GalleryAsset[]): GalleryAsset[] {
  return assets.map((asset, index): GalleryAsset => ({
    ...asset,
    role: asset.role ?? "detail",
    kind: asset.kind ?? "image",
    status: asset.status ?? "ready",
    sortOrder: asset.sortOrder ?? index,
  }));
}

function asCover(asset: GalleryAsset | undefined): GalleryAsset | null {
  return asset ? { ...asset, role: "cover" } : null;
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
      category: normalizeGalleryCategory(album.category),
      assets: normalizeAssets(album.assets),
      cover: album.cover ? asCover(normalizeAssets([album.cover])[0]) : asCover(normalizeAssets(album.assets)[0]),
      publishedSnapshot: album.publishedSnapshot
        ? { ...album.publishedSnapshot, category: normalizeGalleryCategory(album.publishedSnapshot.category), assets: normalizeAssets(album.publishedSnapshot.assets), cover: album.publishedSnapshot.cover ? asCover(normalizeAssets([album.publishedSnapshot.cover])[0]) : asCover(normalizeAssets(album.publishedSnapshot.assets)[0]) }
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
  if (session.currentAccount?.adminCenterId) return album.ownerCenterId === session.currentAccount.adminCenterId;
  const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return Boolean(scope && album.ownerCenterId === getRecruitmentCenterId(scope));
}

function assertCanManage(album: ManagedGalleryAlbum) {
  const session = requireAdminActor();
  if (!canManage(session, album)) throw new Error("GALLERY_CENTER_SCOPE_REQUIRED");
  return session;
}

function validateAssets(assets: GalleryAsset[], requireComplete = false) {
  if (assets.length > 20) throw new Error("GALLERY_DETAILS_LIMIT_EXCEEDED");
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
  if (!album.cover) throw new Error("GALLERY_COVER_REQUIRED");
  if (!isContentMediaAttachmentComplete({ ...album.cover, role: "cover", kind: album.cover.kind ?? "image", status: album.cover.status ?? "ready", sortOrder: album.cover.sortOrder ?? 0, url: album.cover.imageUrl })) throw new Error("GALLERY_COVER_METADATA_REQUIRED");
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
      publicDetails: {} as Record<string, PublishedGalleryAlbum>,
      apiModeActive: false,
      apiLoading: false,
      apiMutating: false,
      apiError: null as { status?: number; code: string; message: string; requestId?: string } | null,
      apiTotal: 0,
      persistenceError: undefined as string | undefined,
    };
  },
  actions: {
    activateApiMode(clearData = true) {
      const wasActive = this.apiModeActive;
      this.apiModeActive = true;
      if (clearData || !wasActive) this.albums = [];
      this.apiError = null;
    },
    async refreshPublicFromApi(gateway: { galleries: { listPublic(query?: { page?: number; pageSize?: number; category?: string }): Promise<{ items: Array<Record<string, unknown>>; total?: number }> } }, query?: { page?: number; pageSize?: number; category?: string }) {
      this.activateApiMode();
      this.apiLoading = true;
      try {
        const response = await gateway.galleries.listPublic(query);
        this.albums = response.items.map(galleryFromPublicApi);
        this.apiTotal = response.total ?? this.albums.length;
        this.publicDetails = {};
      } catch (error) {
        this.apiError = galleryApiError(error);
      } finally {
        this.apiLoading = false;
      }
    },
    async refreshPublicDetailFromApi(gateway: { gallery(slug: string): Promise<Record<string, unknown>> }, slug: string) {
      this.activateApiMode(false);
      this.apiLoading = true;
      try {
        const gallery = galleryFromPublicApi(await gateway.gallery(slug));
        this.publicDetails[slug] = gallery.publishedSnapshot!;
        return gallery;
      } catch (error) {
        this.apiError = galleryApiError(error);
        return undefined;
      } finally {
        this.apiLoading = false;
      }
    },
    async refreshFromApi(gateway: { galleries: { listAdmin(): Promise<{ items: Array<Record<string, unknown>> }> } }) {
      this.activateApiMode();
      this.apiLoading = true;
      try {
        const response = await gateway.galleries.listAdmin();
        this.albums = response.items.map(galleryFromAdminApi);
        this.publicDetails = {};
      } catch (error) {
        this.apiError = galleryApiError(error);
      } finally {
        this.apiLoading = false;
      }
    },
    async refreshDetailFromApi(gateway: { galleries: { detail(id: string): Promise<Record<string, unknown>> } }, albumId: string) {
      this.activateApiMode(false);
      this.apiLoading = true;
      try {
        const album = galleryFromAdminApi(await gateway.galleries.detail(albumId));
        this.albums = [album, ...this.albums.filter((item) => item.id !== album.id)];
        return album;
      } catch (error) {
        this.apiError = galleryApiError(error);
        return undefined;
      } finally {
        this.apiLoading = false;
      }
    },
    async createDraftFromApi(gateway: any, input: GalleryDraftInput) {
      this.activateApiMode(); this.apiMutating = true; this.apiError = null;
      try {
        const saved = galleryFromAdminApi(await gateway.galleries.create(galleryCreatePayload(input)));
        this.albums = [saved, ...this.albums.filter((album) => album.id !== saved.id)];
        return saved;
      } catch (error) { this.apiError = galleryApiError(error); throw error; } finally { this.apiMutating = false; }
    },
    async updateDraftFromApi(gateway: any, albumId: string, input: GalleryDraftInput) {
      const current = this.getById(albumId); if (!current) throw new Error("GALLERY_NOT_FOUND");
      this.apiMutating = true; this.apiError = null;
      try {
        const saved = galleryFromAdminApi(await gateway.galleries.update(albumId, { ...galleryUpdatePayload(input, current.slug), expectedVersion: current.version }));
        this.albums = this.albums.map((album) => album.id === saved.id ? saved : album);
        return saved;
      } catch (error) { this.apiError = galleryApiError(error); throw error; } finally { this.apiMutating = false; }
    },
    async publishFromApi(gateway: any, albumId: string) {
      const current = this.getById(albumId); if (!current) throw new Error("GALLERY_NOT_FOUND");
      this.apiMutating = true; this.apiError = null;
      try {
        const saved = galleryFromAdminApi(await gateway.galleries.publish(albumId, { expectedVersion: current.version }));
        this.albums = this.albums.map((album) => album.id === saved.id ? saved : album);
        return saved;
      } catch (error) { this.apiError = galleryApiError(error); throw error; } finally { this.apiMutating = false; }
    },
    async offlineFromApi(gateway: any, albumId: string, reason: string) {
      const current = this.getById(albumId); if (!current) throw new Error("GALLERY_NOT_FOUND");
      this.apiMutating = true; this.apiError = null;
      try {
        const saved = galleryFromAdminApi(await gateway.galleries.offline(albumId, { expectedVersion: current.version, reason }));
        this.albums = this.albums.map((album) => album.id === saved.id ? saved : album);
        return saved;
      } catch (error) { this.apiError = galleryApiError(error); throw error; } finally { this.apiMutating = false; }
    },
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
      if (this.publicDetails[slug]) return clone(this.publicDetails[slug]);
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
      const cover = input.cover ? clone(input.cover) : assets[0] ? { ...clone(assets[0]), role: "cover" as const } : null;
      if (cover) cover.role = "cover";
      for (const asset of assets) asset.role = "detail";
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
        cover,
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
      if (next.cover && typeof next.cover === "object") next.cover = { ...(next.cover as GalleryAsset), role: "cover" };
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
        ownerCenterId: album.ownerCenterId,
        cover: clone(album.cover),
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

function galleryApiError(error: unknown) {
  const api = error as { status?: unknown; code?: unknown; requestId?: unknown };
  return error instanceof Error
    ? { status: typeof api.status === "number" ? api.status : undefined, code: typeof api.code === "string" ? api.code : "GALLERY_API_REQUEST_FAILED", message: error.message, requestId: typeof api.requestId === "string" ? api.requestId : undefined }
    : { code: "GALLERY_API_REQUEST_FAILED", message: "Gallery API request failed" };
}

function galleryFromPublicApi(item: Record<string, unknown>): ManagedGalleryAlbum {
  const slug = String(item.slug);
  const assets = Array.isArray(item.details)
    ? item.details.flatMap((asset, index) => publicGalleryAsset(asset, `gallery-detail-${slug}-${index}`, index))
    : [];
  const base: PublishedGalleryAlbum = {
    id: slug,
    slug,
    title: String(item.title),
    category: normalizeGalleryCategory(item.category),
    year: typeof item.year === "string" ? item.year : "",
    summary: typeof item.description === "string" ? item.description : "",
    ownerCenterId: "",
    assets,
    cover: publicGalleryAsset(item.cover, `gallery-cover-${slug}`, -1)[0] ?? null,
    to: `/gallery/${slug}`,
    publishedAt: "",
    revision: 1,
  };
  return { ...base, team: "", status: "published", publishedState: "published", version: 0, createdAt: "", updatedAt: "", createdBy: "", publishedSnapshot: base };
}

function galleryFromAdminApi(item: Record<string, unknown>): ManagedGalleryAlbum {
  const status = item.status === "published" ? "published" : item.status === "offline" ? "unpublished" : "draft";
  return {
    id: String(item.id), slug: String(item.slug), title: String(item.title), category: normalizeGalleryCategory(item.category), year: typeof item.year === "string" ? item.year : "",
    summary: typeof item.description === "string" ? item.description : "", team: typeof item.team === "string" ? item.team : "",
    ownerCenterId: String(item.centerId), cover: adminGalleryAsset(item.cover, "cover", 0), assets: Array.isArray(item.details) ? item.details.flatMap((value, index) => adminGalleryAsset(value, "detail", index) ? [adminGalleryAsset(value, "detail", index)!] : []) : Array.isArray(item.detailAttachmentIds) ? item.detailAttachmentIds.filter((id): id is string => typeof id === "string").map((id, index) => ({ id, role: "detail" as const, kind: "image" as const, title: "", caption: "", alt: "", aspect: "landscape" as const, sortOrder: index, status: "processing" as const, serverOwned: true })) : [],
    to: `/gallery/${String(item.slug)}`, publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : "", revision: Number(item.revisionNumber), status, publishedState: status === "published" ? "published" : "unpublished", version: Number(item.version), createdAt: "", updatedAt: "", createdBy: "",
  };
}

function galleryCreatePayload(input: GalleryDraftInput) {
  return { expectedVersion: 0, centerId: input.ownerCenterId, slug: slugify(input.slug?.trim() || input.title), title: input.title, category: normalizeGalleryCategory(input.category), year: input.year, description: input.summary, team: input.team, ...(input.cover ? { coverAttachmentId: input.cover.id } : {}), detailAttachmentIds: input.assets.map((asset) => asset.id) };
}

function galleryUpdatePayload(input: GalleryDraftInput, currentSlug: string) {
  return { centerId: input.ownerCenterId, slug: input.slug?.trim() ? slugify(input.slug) : currentSlug, title: input.title, category: normalizeGalleryCategory(input.category), year: input.year, description: input.summary, team: input.team, ...(input.cover ? { coverAttachmentId: input.cover.id } : { coverAttachmentId: null }), detailAttachmentIds: input.assets.map((asset) => asset.id) };
}

function publicGalleryAsset(value: unknown, id: string, sortOrder: number): GalleryAsset[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const media = value as Record<string, unknown>;
  return [{
    id,
    title: typeof media.title === "string" ? media.title : "",
    caption: typeof media.caption === "string" ? media.caption : "",
    alt: typeof media.alt === "string" ? media.alt : "",
    aspect: media.aspect === "wide" || media.aspect === "portrait" ? media.aspect : "landscape",
    role: media.role === "cover" ? "cover" : "detail",
    kind: media.kind === "video" ? "video" : "image",
    status: "ready",
    sortOrder: typeof media.sortOrder === "number" ? media.sortOrder : sortOrder,
    ...(typeof media.url === "string" ? { imageUrl: media.url } : {}),
    ...(typeof media.thumbnailUrl === "string" ? { thumbnailUrl: media.thumbnailUrl } : {}),
  }];
}

function adminGalleryAsset(value: unknown, role: "cover" | "detail", sortOrder: number): GalleryAsset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const media = value as Record<string, unknown>;
  if (typeof media.id !== "string") return null;
  return {
    id: media.id, role, kind: media.kind === "video" ? "video" : "image", title: typeof media.title === "string" ? media.title : "", caption: typeof media.caption === "string" ? media.caption : "", alt: typeof media.alt === "string" ? media.alt : "", aspect: media.aspect === "wide" || media.aspect === "portrait" ? media.aspect : "landscape", sortOrder: typeof media.sortOrder === "number" ? media.sortOrder : sortOrder, status: media.status === "ready" ? "ready" : "processing", serverOwned: true, version: typeof media.version === "number" ? media.version : undefined, imageUrl: typeof media.url === "string" ? media.url : undefined, thumbnailUrl: typeof media.thumbnailUrl === "string" ? media.thumbnailUrl : undefined,
  };
}
