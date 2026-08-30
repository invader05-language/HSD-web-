export const ACTIVITY_REGISTRATION_STATUSES = ["registered", "accepted", "rejected", "cancelled"] as const;
export type ActivityRegistrationStatus = (typeof ACTIVITY_REGISTRATION_STATUSES)[number];
import type { ContentMediaAttachment } from "./content-media";
import type { ActivityRegistrationAnswers } from "./activity-registration";

export interface ActivityDraftInput {
  slug?: string;
  title: string;
  type: string;
  date: string;
  time: string;
  location: string;
  summary: string;
  content: string;
  agenda: string[];
  cover: ContentMediaAttachment | null;
  details: ContentMediaAttachment[];
  ownerCenterId: string;
  registrationEndAt: string;
}

export interface PublishedActivity extends ActivityDraftInput {
  slug: string;
  id: string;
  registrationMode: "unlimited";
  publishedAt: string;
  revision: number;
}

export interface ManagedActivity extends PublishedActivity {
  status: "draft" | "published" | "unpublished";
  registrationOpen: boolean;
  registrationOverride?: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedState: "published" | "unpublished";
  publishedSnapshot?: PublishedActivity;
}

export interface ActivityRegistration {
  id: string;
  activityId: string;
  memberId: string;
  memberName: string;
  status: ActivityRegistrationStatus;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionReason?: string;
  templateRevisionId?: string;
  answers?: ActivityRegistrationAnswers;
  studentId?: string;
}

export interface ActivityAuditRecord {
  id: string;
  action: "created" | "updated" | "published" | "unpublished" | "registered" | "cancelled" | "registration.decided";
  actorId: string;
  targetId: string;
  actualAt: string;
  beforeRevision: number;
  afterRevision: number;
  reason?: string;
}
