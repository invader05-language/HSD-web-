---
requirement_id: HSD-BE-PORTAL-001
status: BACKEND_REQUIRED
owner: backend
planned_frontend_mock: app/services/portal-automation.mock.ts
source_spec: docs/superpowers/specs/2026-08-04-content-portal-publishing-design.md
required_events:
  - recruitment.batch.opened
  - activity.registration.opened
forbidden_production_owner:
  - browser
  - vue_page
  - pinia_local_storage
---

# Backend Requirement: Portal Content Automation

## AI implementation directive

`HSD-BE-PORTAL-001` is a required production backend capability. The frontend Mock is not the source of truth and does not satisfy this requirement.

Before implementing, read the source specification named in the front matter and the current recruitment batch, activity, administrator access, and content publication contracts. Preserve their identity and permission boundaries.

Do not generate portal drafts from page loads, list queries, computed selectors, client-side watchers, or user visits. Generate drafts only after an authoritative backend business command commits successfully.

## 1. Required behavior

When an eligible business transition succeeds, the backend must create at most one HSD flash draft for that exact source event version.

Required initial events:

```text
recruitment.batch.opened
activity.registration.opened
```

The resulting record is always a draft. The automation must never publish content. Publication remains an explicit owner-authorized command.

## 2. Transaction and event flow

Preferred production flow:

```text
Business command
  -> validate actor and current version
  -> update business aggregate in one transaction
  -> write outbox event in the same transaction
  -> event worker consumes event
  -> idempotency check
  -> create portal content draft
  -> record automation audit
```

If the project does not use a message broker, a transactional outbox plus a retryable worker is still required. Calling a browser callback is not an acceptable substitute.

## 3. Event envelope

All events must provide:

```ts
interface PortalSourceEvent<TPayload> {
  eventId: string;
  eventType: "recruitment.batch.opened" | "activity.registration.opened";
  occurredAt: string;
  actorId: string;
  sourceDomain: "recruitment-batch" | "activity";
  sourceId: string;
  sourceVersion: number;
  payload: TPayload;
}
```

Recruitment payload must contain the batch name, public start/end time, public route, and effective open status. Activity payload must contain the title, public registration start/end time, public route, and effective registration status.

Do not include private applicant data, member contact details, internal assessment outcomes, or internal notes.

## 4. Idempotency

Use this semantic key:

```text
sourceDomain + sourceId + eventType + sourceVersion
```

Enforce it with a database unique constraint, not only an application-level lookup. Event retries, worker restarts, and concurrent deliveries must still create exactly one draft.

Recommended persisted fields:

```text
automation_key
event_id
event_type
source_domain
source_id
source_version
content_id
processed_at
```

## 5. Generated draft

The generated content must include:

```ts
interface SystemFlashDraft {
  kind: "flash";
  status: "draft";
  sourceValidity: "valid" | "invalid" | "expired";
  originType: "system-event";
  sourceDomain: "recruitment-batch" | "activity";
  sourceId: string;
  sourceVersion: number;
  sourceEventType: string;
  title: string;
  tag: string;
  target: { type: "internal-route"; value: string };
  expiresAt?: string;
  generatedReason: string;
  createdBy: "system";
  createdAt: string;
}
```

Initial deterministic templates:

- Recruitment: `{batchName}报名已开放`, tag `招新`, target `/join`, expiry equal to the public batch end time.
- Activity: `{activityTitle}开始报名`, tag `活动`, target `/activities/{slug}`, expiry equal to the public registration end time.

No language model is required or allowed for the initial implementation. Template output may be edited by an administrator before review.

## 6. Source validity and expiry

- A source must still be publicly eligible when the draft is submitted, reviewed, and published.
- If the source closes before publication, set `sourceValidity` to `invalid` and block publication. The content workflow status remains unchanged.
- If a published flash reaches `expiresAt` or its source becomes unavailable, remove it from the public projection and write a `source-expired` audit record.
- Expiry does not hard-delete the content or its audit history.
- Homepage fallback selection is handled by the portal projection rule from the source specification.

## 7. Required commands and API boundary

Exact transport paths may follow the backend framework, but the backend must expose equivalent authenticated commands:

```text
createManualContentDraft
updateContentDraft
submitContentForReview
returnContentToDraft
approveContentForPublication
publishContent
unpublishContent
savePortalConfigurationDraft
publishPortalConfiguration
```

Automation calls the same internal content creation domain service used by manual creation, with `createdBy = system`; it must not write content tables directly from the event consumer.

Read APIs must distinguish working revisions from published projections. Public APIs must never return draft, review, pending-publication, internal note, rejection reason, or audit data.

## 8. Authorization

- Ordinary administrators may create, edit, preview, and submit content.
- Only an owner-level administrator may return, approve, publish, unpublish, or publish portal configuration.
- Every command must authenticate and authorize on the backend even if the frontend already hides the action.
- Event workers use a dedicated system identity and may only create drafts; they cannot approve or publish.

## 9. Audit requirements

Record at least:

```text
actor_id
actor_type (account or system)
action
target_id
source_event_id when applicable
before_revision
after_revision
reason
actual_at
request_id or trace_id
```

Publication, unpublication, review return, portal configuration publication, automation failure, duplicate event suppression, and source expiry are auditable actions.

## 10. Failure and retry behavior

- Event consumption must be retryable without duplicate drafts.
- Permanent validation failures go to a visible dead-letter or failed-event state with operator diagnostics.
- Content draft creation failure must not roll back an already committed recruitment batch or activity transition.
- Public projections must remain on the last successfully published version when a new publication fails.
- Portal configuration publication must be atomic; partial slot updates are forbidden.

Recommended stable error codes:

```text
PORTAL_CONTENT_VERSION_CONFLICT
PORTAL_CONTENT_PERMISSION_REQUIRED
PORTAL_CONTENT_INVALID_TRANSITION
PORTAL_SOURCE_NOT_PUBLIC
PORTAL_AUTOMATION_DUPLICATE
PORTAL_AUTOMATION_FAILED
PORTAL_CONFIG_INVALID_REFERENCE
PORTAL_CONFIG_PUBLICATION_FAILED
```

## 11. Deferred integrations

The following are explicitly outside `HSD-BE-PORTAL-001`:

- WeChat Official Account API credentials and synchronization.
- WeChat article HTML or media migration.
- Large language model title, summary, or body generation.
- Bidirectional synchronization with any external content platform.

Future work may use the reserved `originType`, `originUrl`, and `externalId` fields, but must receive a separate requirement ID and security review.

## 12. Backend acceptance tests

The backend implementation is incomplete until automated tests prove:

1. A successful eligible batch-open command eventually creates one draft.
2. Replaying the same event creates no additional draft.
3. A new source version can create a new draft only when the new event is eligible.
4. A failed or rolled-back business command creates no event and no draft.
5. An event worker cannot publish content.
6. An ordinary administrator cannot approve, publish, unpublish, or publish portal configuration.
7. A closed source blocks publication and an expired published flash leaves the public projection.
8. Failed portal configuration publication keeps the previous public configuration intact.
9. Public reads never expose working revisions or internal audit fields.
10. Concurrent event delivery still satisfies the database uniqueness guarantee.

## 13. Completion handoff

When the backend implementation is ready, update the front matter status from `BACKEND_REQUIRED` to `IMPLEMENTED_PENDING_INTEGRATION`, link the API/schema documentation and migration, and provide test evidence. Do not mark it `COMPLETE` until the frontend Mock adapter has been replaced and end-to-end integration passes.
