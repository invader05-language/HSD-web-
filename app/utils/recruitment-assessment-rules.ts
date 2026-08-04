import type {
  AssessmentOutcome,
  AssessmentProcessingStatus,
  AssessmentRoundNumber,
  RecruitmentAssessmentRecord,
} from "../types/recruitment-assessment";
import type { RecruitmentCenter } from "../data/recruitment-application";

const BAIZE_CENTER = "白泽开发中心";
const BAIZE_ASSESSMENT_ROUNDS: AssessmentRoundNumber[] = [1, 2, 3];
const REGULAR_ASSESSMENT_ROUNDS: AssessmentRoundNumber[] = [1];

function outcomeFor(
  record: RecruitmentAssessmentRecord,
  round: AssessmentRoundNumber,
): AssessmentOutcome {
  return record.roundOutcomes[round] ?? "pending";
}

export function getAssessmentRounds(center: RecruitmentCenter): AssessmentRoundNumber[] {
  return center === BAIZE_CENTER
    ? [...BAIZE_ASSESSMENT_ROUNDS]
    : [...REGULAR_ASSESSMENT_ROUNDS];
}

export function getAssessmentProcessingStatus(
  record: RecruitmentAssessmentRecord,
): AssessmentProcessingStatus {
  if (record.publishedAt) return "completed";
  if (record.finalDecision) return "ready-to-publish";

  const rounds = getAssessmentRounds(record.center);
  if (rounds.some((round) => outcomeFor(record, round) === "failed")) {
    return record.acceptsAdjustment
      ? "offline-adjustment-pending"
      : "ready-to-publish";
  }

  if (rounds.every((round) => outcomeFor(record, round) === "passed")) {
    return "ready-to-publish";
  }

  return "assessing";
}

export function getCurrentAssessmentRound(
  record: RecruitmentAssessmentRecord,
  globalRound: AssessmentRoundNumber,
): AssessmentRoundNumber | undefined {
  if (getAssessmentProcessingStatus(record) !== "assessing") return undefined;

  const rounds = getAssessmentRounds(record.center);
  const currentRoundIndex = rounds.indexOf(globalRound);
  if (currentRoundIndex === -1) return undefined;

  const predecessorsPassed = rounds
    .slice(0, currentRoundIndex)
    .every((round) => outcomeFor(record, round) === "passed");

  return predecessorsPassed && outcomeFor(record, globalRound) === "pending"
    ? globalRound
    : undefined;
}

export function isAssessmentRoundEditable(
  record: RecruitmentAssessmentRecord,
  round: AssessmentRoundNumber,
  globalRound: AssessmentRoundNumber,
): boolean {
  return round === globalRound
    && getCurrentAssessmentRound(record, globalRound) === round;
}
