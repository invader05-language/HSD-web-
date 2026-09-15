export const INTERVIEW_TIMEZONE = "Asia/Shanghai" as const;

export type RecruitmentInterviewSlotStatus = "ACTIVE" | "RETIRED";
export type RecruitmentInterviewSelectionStatus =
  | "CONFIRMED"
  | "RESELECTION_REQUIRED"
  | "RELEASED";

export interface RecruitmentInterviewSlot {
  id: string;
  startAt: string;
  endAt: string;
  timezone: typeof INTERVIEW_TIMEZONE;
  capacity: number | null;
  /** Public responses may expose remaining capacity without exposing counts. */
  remainingCapacity?: number | null;
  status: RecruitmentInterviewSlotStatus;
  confirmedCount?: number;
  version: number;
}

export interface RecruitmentInterviewSelection {
  status: RecruitmentInterviewSelectionStatus;
  slotId: string;
  startAt: string;
  endAt: string;
  timezone: typeof INTERVIEW_TIMEZONE;
  canChange: boolean;
  invalidationReason?: string | null;
}

export interface RecruitmentInterviewSlotDraft {
  id?: string;
  startAt: string;
  endAt: string;
  capacity: string;
}

export interface RecruitmentInterviewSlotAvailability {
  selectable: boolean;
  remainingCapacity: number | null;
  reason?: "retired" | "started" | "full";
}
