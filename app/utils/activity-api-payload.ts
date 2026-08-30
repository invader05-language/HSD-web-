import type { ActivityDraftInput } from "~/types/activity";

const ASCII_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function asciiSlug(value: string) {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createSlug(input: ActivityDraftInput, suffix: string) {
  const requested = input.slug?.trim().toLowerCase() ?? "";
  if (ASCII_SLUG_PATTERN.test(requested) && requested.length <= 120) return requested;
  const stem = asciiSlug(requested || input.title) || "activity";
  const normalizedSuffix = asciiSlug(suffix) || "new";
  const maxStemLength = Math.max(1, 120 - normalizedSuffix.length - 1);
  return `${stem.slice(0, maxStemLength)}-${normalizedSuffix}`;
}

function defaultSlugSuffix() {
  const timestamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, "0");
  return `${timestamp}-${random}`;
}

function mutableActivityPayload(input: ActivityDraftInput) {
  return {
    centerId: input.ownerCenterId,
    title: input.title,
    type: input.type,
    date: input.date,
    time: input.time,
    location: input.location,
    summary: input.summary,
    content: input.content,
    agenda: input.agenda,
    ...(input.registrationEndAt ? { registrationEndAt: input.registrationEndAt } : {}),
    ...(input.cover ? { coverAttachmentId: input.cover.id } : {}),
    detailAttachmentIds: input.details.map((item) => item.id),
  };
}

export function activityCreatePayload(input: ActivityDraftInput, suffix = defaultSlugSuffix()) {
  return {
    expectedVersion: 0,
    slug: createSlug(input, suffix),
    ...mutableActivityPayload(input),
  };
}

export function activityUpdatePayload(input: ActivityDraftInput, expectedVersion: number) {
  return {
    expectedVersion,
    ...mutableActivityPayload(input),
  };
}

export function activityDraftFingerprint(input: ActivityDraftInput) {
  return JSON.stringify({
    title: input.title,
    type: input.type,
    date: input.date,
    time: input.time,
    location: input.location,
    summary: input.summary,
    content: input.content,
    agenda: input.agenda,
    ownerCenterId: input.ownerCenterId,
    registrationEndAt: input.registrationEndAt,
    coverId: input.cover?.id ?? null,
    detailIds: input.details.map((item) => item.id),
  });
}
