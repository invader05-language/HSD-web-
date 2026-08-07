import { defineStore } from "pinia";
import { ADMIN_PROJECT_RECORDS } from "../data/admin-content";
import { PROJECT_DETAILS } from "../data/projects";
import { isContentMediaAttachmentComplete } from "../utils/content-media";
import { getAdminCenterScope, getRecruitmentCenterId } from "../utils/admin-center-scope";
import { useSessionStore } from "./session";
import type { ContentMediaAttachment } from "../types/content-media";
import type { ManagedProject, ProjectDraftInput, PublishedProject } from "../types/project";

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
    technologies: [...project.technologies],
    memberCount: record?.members ?? 1,
    ownerCenterId: inferOwnerCenter(project.title),
    cover: seedCover(project),
    details: [],
    publishedAt,
    revision: 1,
  };
  return {
    ...snapshot,
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
  if (required.some((value) => !value.trim()) || project.memberCount < 1 || !project.technologies.some((item) => item.trim())) throw new Error("PROJECT_INCOMPLETE");
  const cover = project.cover;
  if (!cover || cover.role !== "cover" || cover.kind !== "image" || !isContentMediaAttachmentComplete(cover)) throw new Error("PROJECT_INCOMPLETE");
  if (project.details.some((detail) => detail.role !== "detail" || !isContentMediaAttachmentComplete(detail))) throw new Error("PROJECT_INCOMPLETE");
}

export const useProjectsStore = defineStore("projects", {
  state: () => {
    const persisted = readPersistedState();
    return {
      projects: persisted?.projects ?? seedProjects(),
      persistenceError: undefined as string | undefined,
    };
  },
  actions: {
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
      return this.projects.filter((project) => project.publicationStatus === "published" && project.publishedSnapshot).map((project) => clone(project.publishedSnapshot!));
    },
    getPublicBySlug(slug: string) {
      const project = this.projects.find((item) => item.slug === slug && item.publicationStatus === "published" && item.publishedSnapshot);
      return project?.publishedSnapshot ? clone(project.publishedSnapshot) : undefined;
    },
    createDraft(input: ProjectDraftInput, now: Date = new Date()): ManagedProject {
      const session = requireAdminActor();
      const slug = slugify(input.slug?.trim() || input.title);
      if (this.projects.some((project) => project.slug === slug || project.publishedSnapshot?.slug === slug)) throw new Error("PROJECT_DUPLICATE_SLUG");
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
        category: input.category.trim(),
        year: input.year.trim(),
        description: input.description.trim(),
        achievement: input.achievement.trim(),
        projectStage: input.projectStage.trim(),
        challenge: input.challenge.trim(),
        solution: input.solution.trim(),
        technologies: input.technologies.map((item) => item.trim()).filter(Boolean),
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
      for (const key of ["title", "category", "year", "description", "achievement", "projectStage", "challenge", "solution", "ownerCenterId"] as const) {
        if (typeof project[key] === "string") project[key] = project[key].trim();
      }
      project.technologies = project.technologies.map((item) => item.trim()).filter(Boolean);
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
        technologies: clone(project.technologies),
        memberCount: project.memberCount,
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
