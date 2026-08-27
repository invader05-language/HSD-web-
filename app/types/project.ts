import type { ContentMediaAttachment } from "./content-media";

export const PROJECT_CATEGORY_LABELS = {
  CAMPUS_SERVICE: "校园服务",
  AI_APPLICATION: "AI 智能应用",
  SMART_HARDWARE: "智能硬件",
  INDUSTRY_DIGITALIZATION: "行业数字化",
} as const;

export type ProjectCategory = keyof typeof PROJECT_CATEGORY_LABELS;
export type ProjectPublicationStatus = "draft" | "published" | "unpublished";

export interface ProjectMember {
  name: string;
  personId?: string;
}

export interface ProjectDraftInput {
  slug?: string;
  title: string;
  category: ProjectCategory;
  year: string;
  description: string;
  achievement: string;
  projectStage: string;
  challenge: string;
  solution: string;
  memberPersonIds: string[];
  memberNames: string[];
  members: ProjectMember[];
  displayOrder: number;
  ownerCenterId: string;
  cover: ContentMediaAttachment | null;
  details: ContentMediaAttachment[];
}

export interface PublishedProject extends Omit<ProjectDraftInput, "memberPersonIds" | "memberNames" | "members"> {
  id: string;
  slug: string;
  members: Array<Pick<ProjectMember, "name">>;
  memberCount: number;
  publishedAt: string;
  revision: number;
}

export interface ManagedProject extends PublishedProject {
  memberPersonIds: string[];
  memberNames: string[];
  members: ProjectMember[];
  publicationStatus: ProjectPublicationStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedSnapshot?: PublishedProject;
}

export function isProjectCategory(value: unknown): value is ProjectCategory {
  return typeof value === "string" && value in PROJECT_CATEGORY_LABELS;
}

export function projectCategoryLabel(category: string): string {
  return isProjectCategory(category) ? PROJECT_CATEGORY_LABELS[category] : category;
}

export function projectCategoryFromLabel(label: string): ProjectCategory | undefined {
  return (Object.entries(PROJECT_CATEGORY_LABELS) as Array<[ProjectCategory, string]>).find(([, value]) => value === label)?.[0];
}
