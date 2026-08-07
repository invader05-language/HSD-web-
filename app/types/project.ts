import type { ContentMediaAttachment } from "./content-media";

export type ProjectPublicationStatus = "draft" | "published" | "unpublished";

export interface ProjectDraftInput {
  slug?: string;
  title: string;
  category: string;
  year: string;
  description: string;
  achievement: string;
  projectStage: string;
  challenge: string;
  solution: string;
  technologies: string[];
  memberCount: number;
  ownerCenterId: string;
  cover: ContentMediaAttachment | null;
  details: ContentMediaAttachment[];
}

export interface PublishedProject extends ProjectDraftInput {
  id: string;
  slug: string;
  publishedAt: string;
  revision: number;
}

export interface ManagedProject extends PublishedProject {
  publicationStatus: ProjectPublicationStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedSnapshot?: PublishedProject;
}
