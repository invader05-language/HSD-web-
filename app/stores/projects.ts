import { defineStore } from "pinia";
import { ADMIN_PROJECT_RECORDS } from "../data/admin-content";
import { PROJECT_DETAILS } from "../data/projects";
import { isContentMediaAttachmentComplete } from "../utils/content-media";
import { getAdminCenterScope, getRecruitmentCenterId } from "../utils/admin-center-scope";
import { useSessionStore } from "./session";
import type { ContentMediaAttachment } from "../types/content-media";
import { isProjectCategory, type ManagedProject, type ProjectDraftInput, type ProjectMember, type PublishedProject } from "../types/project";

export type { ManagedProject, ProjectDraftInput, PublishedProject } from "../types/project";

export const PROJECTS_STORAGE_KEY = "baiyun-hsd.projects";
export const PROJECTS_STORAGE_VERSION = 2;
const LEGACY_PROJECTS_STORAGE_VERSIONS = [1, PROJECTS_STORAGE_VERSION] as const;

interface PersistedProjectState {
  version: typeof PROJECTS_STORAGE_VERSION;
  projects: ManagedProject[];
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

function slugify(value: string) {
  const slug = value.trim().toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || `project-${Date.now()}`;
}

function inferOwnerCenter(title: string) {
  const record = ADMIN_PROJECT_RECORDS.find((item) => item.title === title);
  if (record?.centers[0] === "新媒体中心") return "new-media";
  return "baize-development";
}

function seedCover(project: (typeof PROJECT_DETAILS)[number]): ContentMediaAttachment {
  return {
    id: `${project.slug}-cover`,
    role: "cover",
    kind: "image",
    title: "",
    caption: "",
    alt: `${project.title}项目封面`,
    aspect: "wide",
    sortOrder: 0,
    status: "ready",
  };
}

function seedProject(project: (typeof PROJECT_DETAILS)[number], index: number): ManagedProject {
  const publishedAt = `${project.year}-01-01T00:00:00.000Z`;
  const record = ADMIN_PROJECT_RECORDS.find((item) => item.title === project.title);
  const snapshot: PublishedProject = {
    id: project.slug,
    slug: project.slug,
    title: project.title,
    category: project.category,
    year: project.year,
    description: project.description,
    achievement: project.achievement,
    projectStage: project.status,
    challenge: project.challenge,
    solution: project.solution,
    members: [],
    memberCount: 0,
    displayOrder: index + 1,
    ownerCenterId: inferOwnerCenter(project.title),
    cover: seedCover(project),
    details: [],
    publishedAt,
    revision: 1,
  };
  return {
    ...snapshot,
    memberPersonIds: [],
    publicationStatus: "published",
    version: index + 1,
    createdAt: publishedAt,
    updatedAt: publishedAt,
    createdBy: "admin-alliance",
    publishedSnapshot: snapshot,
  };
}

function seedProjects() {
  return PROJECT_DETAILS.map(seedProject);
}

function isPersistedProject(value: unknown): value is ManagedProject {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string"
    && typeof item.slug === "string"
    && typeof item.title === "string"
    && typeof item.ownerCenterId === "string"
    && ["draft", "published", "unpublished"].includes(item.publicationStatus as string);
}

function stripRemovedProjectFields(project: ManagedProject): ManagedProject {
  const sanitized = clone(project) as ManagedProject & Record<string, unknown>;
  delete sanitized.team;
  delete sanitized.collaboratingCenterIds;
  if (sanitized.publishedSnapshot) {
    sanitized.publishedSnapshot = stripRemovedProjectFields(sanitized.publishedSnapshot as ManagedProject);
  }
  return sanitized;
}

function isPersistedState(value: unknown): value is PersistedProjectState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return LEGACY_PROJECTS_STORAGE_VERSIONS.includes(state.version as 1 | 2)
    && Array.isArray(state.projects)
    && state.projects.every(isPersistedProject);
}

function readPersistedState() {
  const serialized = getStorage()?.getItem(PROJECTS_STORAGE_KEY);
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isPersistedState(parsed)) return undefined;
    return {
      version: PROJECTS_STORAGE_VERSION,
      projects: parsed.projects.map(stripRemovedProjectFields),
    };
  } catch {
    return undefined;
  }
}

function writePersistedState(projects: readonly ManagedProject[]) {
  const storage = getStorage();
  if (!storage) throw new Error("PROJECT_PERSISTENCE_FAILED");
  try {
    storage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify({ version: PROJECTS_STORAGE_VERSION, projects: [...projects] } satisfies PersistedProjectState));
  } catch {
    throw new Error("PROJECT_PERSISTENCE_FAILED");
  }
}

function requireAdminActor() {
  const session = useSessionStore();
  if (!session.isAuthenticated || !session.canAccessAdmin || !session.currentAccount) throw new Error("ADMIN_PERMISSION_REQUIRED");
  return session;
}

function canManage(session: ReturnType<typeof useSessionStore>, project: ManagedProject) {
  if (session.adminLevel === "owner") return true;
  if (session.currentAccount?.adminCenterId) return project.ownerCenterId === session.currentAccount.adminCenterId;
  const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
  return Boolean(scope && project.ownerCenterId === getRecruitmentCenterId(scope));
}

function assertCanManage(project: ManagedProject) {
  const session = requireAdminActor();
  if (!canManage(session, project)) throw new Error("PROJECT_CENTER_SCOPE_REQUIRED");
  return session;
}

function assertCompleteProject(project: ManagedProject) {
  const required = [project.title, project.category, project.year, project.description, project.achievement, project.projectStage, project.challenge, project.solution, project.ownerCenterId];
  if (!isProjectCategory(project.category)) throw new Error("PROJECT_CATEGORY_INVALID");
  if (required.some((value) => !value.trim()) || project.memberPersonIds.length < 1) throw new Error("PROJECT_INCOMPLETE");
  const cover = project.cover;
  if (!cover || cover.role !== "cover" || cover.kind !== "image" || !isContentMediaAttachmentComplete(cover)) throw new Error("PROJECT_INCOMPLETE");
  if (project.details.some((detail) => detail.role !== "detail" || !isContentMediaAttachmentComplete(detail))) throw new Error("PROJECT_INCOMPLETE");
}

export const useProjectsStore = defineStore("projects", {
  state: () => {
    const persisted = readPersistedState();
    return {
      projects: persisted?.projects ?? seedProjects(),
      publicDetails: {} as Record<string, PublishedProject>,
      apiModeActive: false,
      apiLoading: false,
      apiMutating: false,
      apiError: null as { status?: number; code: string; message: string; requestId?: string } | null,
      persistenceError: undefined as string | undefined,
    };
  },
  actions: {
    activateApiMode(clearData = true) {
      const wasActive = this.apiModeActive;
      this.apiModeActive = true;
      if (clearData || !wasActive) this.projects = [];
      this.apiError = null;
    },
    async refreshPublicFromApi(gateway: { projects: { listPublic(): Promise<{ items: Array<Record<string, unknown>> }> } }) {
      this.activateApiMode(); this.apiLoading = true;
      try {
        const response = await gateway.projects.listPublic();
        this.projects = response.items.map((item) => projectFromPublicApi(item));
        this.publicDetails = {};
      } catch (error) { this.apiError = apiError(error); } finally { this.apiLoading = false; }
    },
    async refreshPublicDetailFromApi(gateway: { project(slug: string): Promise<Record<string, unknown>> }, slug: string) {
      this.activateApiMode(false); this.apiLoading = true;
      try { const project = projectFromPublicApi(await gateway.project(slug)); this.publicDetails[slug] = project.publishedSnapshot!; return project; }
      catch (error) { this.apiError = apiError(error); return undefined; } finally { this.apiLoading = false; }
    },
    async refreshFromApi(gateway: { projects: { listAdmin(): Promise<{ items: Array<Record<string, unknown>> }> } }) {
      this.activateApiMode(); this.apiLoading = true;
      try {
        const response = await gateway.projects.listAdmin();
        this.projects = response.items.map((item) => projectFromAdminApi(item));
        this.publicDetails = {};
      } catch (error) { this.apiError = apiError(error); } finally { this.apiLoading = false; }
    },
    async createDraftFromApi(gateway: any, input: ProjectDraftInput) {
      this.activateApiMode(); this.apiMutating = true; this.apiError = null;
      try {
        const saved = projectFromAdminApi(await gateway.projects.create(projectCreatePayload(input)));
        this.projects = [saved, ...this.projects.filter((item) => item.id !== saved.id)];
        return saved;
      } catch (error) { this.apiError = apiError(error); throw error; } finally { this.apiMutating = false; }
    },
    async updateDraftFromApi(gateway: any, projectId: string, input: ProjectDraftInput) {
      const current = this.getById(projectId); if (!current) throw new Error("PROJECT_NOT_FOUND");
      this.apiMutating = true; this.apiError = null;
      try {
        const saved = projectFromAdminApi(await gateway.projects.update(projectId, { ...projectCreatePayload(input), expectedVersion: current.version }));
        this.projects = this.projects.map((item) => item.id === saved.id ? saved : item);
        return saved;
      } catch (error) { this.apiError = apiError(error); throw error; } finally { this.apiMutating = false; }
    },
    async publishFromApi(gateway: any, projectId: string) {
      const current = this.getById(projectId); if (!current) throw new Error("PROJECT_NOT_FOUND");
      this.apiMutating = true; this.apiError = null;
      try {
        const saved = projectFromAdminApi(await gateway.projects.publish(projectId, { expectedVersion: current.version }));
        this.projects = this.projects.map((item) => item.id === saved.id ? saved : item);
        return saved;
      } catch (error) { this.apiError = apiError(error); throw error; } finally { this.apiMutating = false; }
    },
    async offlineFromApi(gateway: any, projectId: string, reason: string) {
      const current = this.getById(projectId); if (!current) throw new Error("PROJECT_NOT_FOUND");
      this.apiMutating = true; this.apiError = null;
      try {
        const saved = projectFromAdminApi(await gateway.projects.offline(projectId, { expectedVersion: current.version, reason }));
        this.projects = this.projects.map((item) => item.id === saved.id ? saved : item);
        return saved;
      } catch (error) { this.apiError = apiError(error); throw error; } finally { this.apiMutating = false; }
    },
    hydrate() {
      const persisted = readPersistedState();
      if (persisted) this.projects = persisted.projects;
    },
    persist() {
      try {
        writePersistedState(this.projects);
        this.persistenceError = undefined;
      } catch (error) {
        this.persistenceError = error instanceof Error ? error.message : "PROJECT_PERSISTENCE_FAILED";
        throw error;
      }
    },
    getById(projectId: string) {
      return this.projects.find((project) => project.id === projectId);
    },
    canManageProject(projectId: string) {
      const project = this.getById(projectId);
      const session = useSessionStore();
      return Boolean(project && session.canAccessAdmin && canManage(session, project));
    },
    getManageableProjects() {
      const session = useSessionStore();
      if (!session.canAccessAdmin) return [];
      return this.projects.filter((project) => canManage(session, project));
    },
    getPublicProjects(): PublishedProject[] {
      return this.projects
        .filter((project) => project.publicationStatus === "published" && project.publishedSnapshot)
        .map((project) => clone(project.publishedSnapshot!))
        .sort((left, right) => left.displayOrder - right.displayOrder || left.title.localeCompare(right.title, "zh-CN"));
    },
    getPublicBySlug(slug: string) {
      if (this.publicDetails[slug]) return clone(this.publicDetails[slug]);
      const project = this.projects.find((item) => item.slug === slug && item.publicationStatus === "published" && item.publishedSnapshot);
      return project?.publishedSnapshot ? clone(project.publishedSnapshot) : undefined;
    },
    createDraft(input: ProjectDraftInput, now: Date = new Date()): ManagedProject {
      const session = requireAdminActor();
      const slug = slugify(input.slug?.trim() || input.title);
      if (this.projects.some((project) => project.slug === slug || project.publishedSnapshot?.slug === slug)) throw new Error("PROJECT_DUPLICATE_SLUG");
      if (!isProjectCategory(input.category)) throw new Error("PROJECT_CATEGORY_INVALID");
      const ownerCenterId = input.ownerCenterId.trim();
      if (session.adminLevel !== "owner") {
        const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
        if (!scope || (ownerCenterId && ownerCenterId !== getRecruitmentCenterId(scope))) throw new Error("PROJECT_CENTER_SCOPE_REQUIRED");
      }
      const timestamp = now.toISOString();
      const project: ManagedProject = {
        ...clone(input),
        id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        slug,
        title: input.title.trim(),
        category: input.category,
        year: input.year.trim(),
        description: input.description.trim(),
        achievement: input.achievement.trim(),
        projectStage: input.projectStage.trim(),
        challenge: input.challenge.trim(),
        solution: input.solution.trim(),
        memberPersonIds: uniquePersonIds(input.memberPersonIds),
        members: projectMembers(input.members, input.memberPersonIds),
        memberCount: projectMembers(input.members, input.memberPersonIds).length,
        displayOrder: normalizeDisplayOrder(input.displayOrder),
        ownerCenterId,
        cover: input.cover ? clone(input.cover) : null,
        details: input.details.map((item) => clone(item)),
        publishedAt: timestamp,
        revision: 0,
        publicationStatus: "draft",
        version: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: session.currentAccount!.account,
      };
      this.projects.unshift(project);
      try {
        this.persist();
      } catch (error) {
        this.projects.shift();
        throw error;
      }
      return project;
    },
    updateDraft(projectId: string, patch: Partial<ProjectDraftInput>, now: Date = new Date()): ManagedProject {
      const project = this.getById(projectId);
      if (!project) throw new Error("PROJECT_NOT_FOUND");
      assertCanManage(project);
      if (patch.slug && slugify(patch.slug) !== project.slug && project.publishedSnapshot) throw new Error("PROJECT_SLUG_IMMUTABLE");
      const previous = clone(project);
      if (patch.ownerCenterId && patch.ownerCenterId !== project.ownerCenterId) {
        const session = requireAdminActor();
        if (session.adminLevel !== "owner") {
          const scope = getAdminCenterScope(session.currentAccount?.adminCenterRole);
          if (!scope || patch.ownerCenterId !== getRecruitmentCenterId(scope)) throw new Error("PROJECT_CENTER_SCOPE_REQUIRED");
        }
      }
      Object.assign(project, clone(patch));
      project.title = project.title.trim();
      const category = project.category.trim();
      if (!isProjectCategory(category)) throw new Error("PROJECT_CATEGORY_INVALID");
      project.category = category;
      project.year = project.year.trim();
      project.description = project.description.trim();
      project.achievement = project.achievement.trim();
      project.projectStage = project.projectStage.trim();
      project.challenge = project.challenge.trim();
      project.solution = project.solution.trim();
      project.ownerCenterId = project.ownerCenterId.trim();
      project.memberPersonIds = uniquePersonIds(project.memberPersonIds);
      project.members = projectMembers(project.members, project.memberPersonIds);
      project.memberCount = project.members.length;
      project.displayOrder = normalizeDisplayOrder(project.displayOrder);
      project.updatedAt = now.toISOString();
      project.version += 1;
      try {
        this.persist();
      } catch (error) {
        Object.assign(project, previous);
        throw error;
      }
      return project;
    },
    publish(projectId: string, now: Date = new Date()) {
      const project = this.getById(projectId);
      if (!project) throw new Error("PROJECT_NOT_FOUND");
      assertCanManage(project);
      assertCompleteProject(project);
      const previous = clone(project);
      const snapshot: PublishedProject = {
        id: project.id,
        slug: project.slug,
        title: project.title,
        category: project.category,
        year: project.year,
        description: project.description,
        achievement: project.achievement,
        projectStage: project.projectStage,
        challenge: project.challenge,
        solution: project.solution,
        members: project.members.map((member) => ({ name: member.name })),
        memberCount: project.members.length,
        displayOrder: project.displayOrder,
        ownerCenterId: project.ownerCenterId,
        cover: project.cover ? clone(project.cover) : null,
        details: clone(project.details),
        publishedAt: now.toISOString(),
        revision: project.revision + 1,
      };
      project.publishedSnapshot = snapshot;
      project.publicationStatus = "published";
      project.publishedAt = snapshot.publishedAt;
      project.revision = snapshot.revision;
      project.updatedAt = snapshot.publishedAt;
      project.version += 1;
      try {
        this.persist();
      } catch (error) {
        Object.assign(project, previous);
        throw error;
      }
      return project;
    },
    unpublish(projectId: string, _reason = "", now: Date = new Date()) {
      const project = this.getById(projectId);
      if (!project) throw new Error("PROJECT_NOT_FOUND");
      assertCanManage(project);
      const previous = clone(project);
      project.publicationStatus = "unpublished";
      project.updatedAt = now.toISOString();
      project.version += 1;
      try {
        this.persist();
      } catch (error) {
        Object.assign(project, previous);
        throw error;
      }
      return project;
    },
  },
});

function apiError(error: unknown) { const api = error as { status?: unknown; code?: unknown; requestId?: unknown }; return error instanceof Error ? { status: typeof api.status === "number" ? api.status : undefined, code: typeof api.code === "string" ? api.code : "PROJECT_API_REQUEST_FAILED", message: error.message, requestId: typeof api.requestId === "string" ? api.requestId : undefined } : { code: "PROJECT_API_REQUEST_FAILED", message: "Project API request failed" }; }
function projectCreatePayload(input: ProjectDraftInput) {
  return {
    expectedVersion: 0, centerId: input.ownerCenterId, slug: slugify(input.slug?.trim() || input.title), title: input.title,
    category: input.category, year: input.year, description: input.description, achievement: input.achievement,
    projectStage: input.projectStage, challenge: input.challenge, solution: input.solution,
    memberPersonIds: uniquePersonIds(input.memberPersonIds), displayOrder: normalizeDisplayOrder(input.displayOrder),
    ...(input.cover ? { coverAttachmentId: input.cover.id } : {}),
    ...(input.details.length ? { detailAttachmentIds: input.details.map((item) => item.id) } : {}),
  };
}

function projectMembers(value: unknown, memberPersonIds: readonly string[] = []): ProjectMember[] {
  const members = Array.isArray(value) ? value.flatMap((item) => {
    if (!item || typeof item !== "object" || typeof (item as Record<string, unknown>).name !== "string") return [];
    const member = item as Record<string, unknown>;
    const name = (member.name as string).trim();
    return name ? [{ name, ...(typeof member.personId === "string" ? { personId: member.personId } : {}) }] : [];
  }) : [];
  return members.length ? members : uniquePersonIds(memberPersonIds).map((personId) => ({ name: personId, personId }));
}

function publicProjectMembers(value: unknown): Array<Pick<ProjectMember, "name">> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const name = (item as Record<string, unknown>).name;
    return typeof name === "string" && name.trim() ? [{ name: name.trim() }] : [];
  });
}

function uniquePersonIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))] : [];
}

function normalizeDisplayOrder(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 9999;
}

function projectFromPublicApi(item: Record<string, unknown>): ManagedProject {
  const slug = String(item.slug);
  const cover = publicProjectAttachment(item.cover, `project-cover-${slug}`, "cover", 0);
  const details = Array.isArray(item.details) ? item.details.flatMap((detail, index) => {
    const mapped = publicProjectAttachment(detail, `project-detail-${slug}-${index}`, "detail", index);
    return mapped ? [mapped] : [];
  }) : [];
  const members = publicProjectMembers(item.members);
  const category = isProjectCategory(item.category) ? item.category : "AI_APPLICATION";
  const base: PublishedProject = {
    id: slug, slug, title: String(item.title), category, year: String(item.year), description: String(item.description),
    achievement: String(item.achievement), projectStage: String(item.projectStage), challenge: String(item.challenge), solution: String(item.solution),
    members, memberCount: members.length,
    displayOrder: normalizeDisplayOrder(item.displayOrder), ownerCenterId: "", cover, details, publishedAt: "", revision: 1,
  };
  return { ...base, memberPersonIds: [], publicationStatus: "published", version: 0, createdAt: "", updatedAt: "", createdBy: "", publishedSnapshot: base };
}

function projectFromAdminApi(item: Record<string, unknown>): ManagedProject {
  const base = projectFromPublicApi({ ...item, cover: null, details: [] });
  const cover = typeof item.coverAttachmentId === "string" ? adminProjectAttachment(item.coverAttachmentId, "cover", 0) : null;
  const details = Array.isArray(item.detailAttachmentIds) ? item.detailAttachmentIds.filter((id): id is string => typeof id === "string").map((id, index) => adminProjectAttachment(id, "detail", index)) : [];
  return {
    ...base, cover, details, id: String(item.id), ownerCenterId: String(item.centerId),
    memberPersonIds: uniquePersonIds(item.memberPersonIds), members: projectMembers(item.members),
    memberCount: projectMembers(item.members).length, displayOrder: normalizeDisplayOrder(item.displayOrder),
    publicationStatus: item.status === "published" ? "published" : item.status === "offline" ? "unpublished" : "draft",
    version: Number(item.version), publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : "", revision: Number(item.revisionNumber), publishedSnapshot: undefined,
  };
}

function adminProjectAttachment(id: string, role: "cover" | "detail", sortOrder: number): ContentMediaAttachment { return { id, serverOwned: true, role, kind: "image", title: "", caption: "", alt: "", aspect: "landscape", sortOrder, status: "processing" }; }

function publicProjectAttachment(value: unknown, id: string, fallbackRole: "cover" | "detail", fallbackOrder: number): ContentMediaAttachment | null { if (!value || typeof value !== "object" || Array.isArray(value)) return null; const media = value as Record<string, unknown>; return { id, role: media.role === "detail" ? "detail" : fallbackRole, kind: media.kind === "video" ? "video" : "image", title: typeof media.title === "string" ? media.title : "", caption: typeof media.caption === "string" ? media.caption : "", alt: typeof media.alt === "string" ? media.alt : "", aspect: media.aspect === "portrait" || media.aspect === "wide" ? media.aspect : "landscape", sortOrder: typeof media.sortOrder === "number" ? media.sortOrder : fallbackOrder, ...(typeof media.url === "string" ? { url: media.url } : {}), ...(typeof media.thumbnailUrl === "string" ? { thumbnailUrl: media.thumbnailUrl } : {}), status: "ready" }; }
