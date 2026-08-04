# Task 1 Report: Portal content domain and publication Mock

## Changed files

- Added `app/types/portal-content.ts` and `app/types/portal-config.ts` for content, event, catalog, slot, and configuration contracts.
- Added `app/stores/portal-content.ts` for versioned work/published revisions, state transitions, owner checks, schema-versioned persistence, and system draft creation.
- Added `app/stores/portal-config.ts` for draft/published portal configurations, schema-versioned persistence, owner-only atomic publication, and candidate validation.
- Added `app/composables/usePortalCatalog.ts` and `app/composables/usePublishedPortal.ts` for read-only fixture adapters and non-mutating same-slot fallback projection.
- Added `app/services/portal-automation.mock.ts` as the explicitly frontend-only event-to-draft adapter.
- Added `app/stores/activities.ts` as the current activity owner state with a successful registration-open hook.
- Updated `app/stores/recruitment-batch.ts` to trigger automation only after `openNow` completes, retaining a retryable failure record without rolling back the batch.
- Added focused unit tests in `tests/unit/portal-content.test.ts`, `tests/unit/portal-config.test.ts`, and `tests/unit/portal-automation.test.ts`.

## Interfaces

- `usePortalContentStore()` exposes draft creation/editing, review transitions, published projection reads, unpublishing, schema-versioned persistence fallback, and `retryAutomationDraft`.
- `usePortalConfigStore()` maintains draft and published configurations with `saveDraft`, `preview`, and atomic `publish`.
- `usePortalCatalog()` returns public portal candidates from published content plus read-only project/activity/gallery/resource fixtures.
- `usePublishedPortal()` and `resolveHomepageSlots()` apply the documented same-slot/same-type fallback without changing saved configuration.
- `PortalAutomationServiceMock.createFromEvent()` returns `created`, `duplicate`, or `failed`; it only creates drafts and uses the specified semantic idempotency key.

## Tests

Red phase observed before implementation:

```text
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/portal-content.test.ts tests/unit/portal-config.test.ts tests/unit/portal-automation.test.ts

Test Files  3 failed (3)
Error: Failed to resolve import ... portal-content / portal-config / portal-automation.mock
```

Focused green phase:

```text
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/portal-content.test.ts tests/unit/portal-config.test.ts tests/unit/portal-automation.test.ts

Test Files  3 passed (3)
Tests  8 passed (8)
```

Full unit suite:

```text
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run

Test Files  35 passed (35)
Tests  232 passed (232)
```

Typecheck:

```text
sh scripts/with-hsd-node.sh corepack pnpm run typecheck

> nuxt typecheck
```

## Final Review Fix

- `publishBatch()` now computes the resulting effective status after committing its version increment and emits `recruitment.batch.opened` through the shared non-rollback automation path when that state is `open`.

### Final Review Test Evidence

The new already-started draft-batch regression first failed because no source-version 2 flash existed after publication.

```text
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/portal-content.test.ts tests/unit/portal-config.test.ts tests/unit/portal-automation.test.ts tests/unit/recruitment-batch-rules.test.ts

Test Files  4 passed (4)
Tests  37 passed (37)
```

```text
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run

Test Files  35 passed (35)
Tests  246 passed (246)
```

```text
sh scripts/with-hsd-node.sh corepack pnpm run typecheck

> nuxt typecheck
```

## Self-review

- Publication requires the exact review path and owner authorization; ordinary administrators can create, edit, and submit only.
- Editing a published record creates a new work revision while preserving the old public snapshot. The old snapshot can still be explicitly unpublished.
- Portal publication validates the complete proposed configuration before replacing the public configuration, preventing partial updates.
- Automation is command-triggered only from successful recruitment/activity writes. No route, getter, query, computed value, or page-load code invokes it.
- Production backend ownership remains unchanged: this service is a frontend Mock and does not satisfy `HSD-BE-PORTAL-001`.

## Concerns

- The existing activity domain had no Store or management command; `app/stores/activities.ts` introduces only the minimal owner command needed for the automation boundary. Existing activity pages continue reading their fixtures until the later public/admin workflow tasks connect them.
- Portal persistence uses browser localStorage only as the specified frontend Mock fallback. It is intentionally not cross-device or production-authoritative.

## Review Fixes

- Separated the active working `status` from `publishedState`. Unpublishing now removes only the public projection and leaves a draft, review, or pending-publication revision unchanged.
- Added source eligibility synchronization. Expired records are removed from all public reads and audited; recruitment pause/close and activity registration close invalidate their system-source records. Submit, approve, and publish reject invalid sources.
- Reserved every valid configured reference before selecting homepage fallback candidates, so an earlier broken reference cannot consume a later configured item.
- Added persisted automation-failure envelopes containing the event, semantic key, audit entries, and retry path. Duplicate delivery appends an `automation-duplicate` audit record; failures append `automation-failed`.
- Replaced normalized generated IDs with an encoded full semantic event tuple, avoiding punctuation-normalization collisions.
- Hardened content and portal-config persistence restoration by validating record/configuration shapes and schema versions before accepting stored state.
- The backend requirement remains `BACKEND_REQUIRED`; no browser behavior is treated as production automation.

### Review Fix Test Evidence

The review regressions were first run red. The focused command reported eight failures covering published-state mutation, expiry visibility, invalid-source transition, malformed persistence, fallback reservation, and automation audit/failure state. A final semantic-ID collision regression also failed with `expected 1 to be 2` before the identifier was changed.

```text
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/portal-content.test.ts tests/unit/portal-config.test.ts tests/unit/portal-automation.test.ts tests/unit/recruitment-batch-rules.test.ts

Test Files  4 passed (4)
Tests  31 passed (31)
```

```text
sh scripts/with-hsd-node.sh corepack pnpm run typecheck

> nuxt typecheck
```

```text
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run

Test Files  35 passed (35)
Tests  240 passed (240)
```

## Second Review Fixes

- `resume` and `reopen` now emit a new `recruitment.batch.opened` event after their authoritative command reaches effective `open`, using the incremented batch version. Automation failure remains non-transactional and does not roll back the successful batch command.
- Normal unpublish now moves a currently published work revision to `status: "unpublished"`. When a later draft/review/pending revision owns the active work, unpublish preserves that active status and only disables its older public snapshot.
- Content persistence validation now recursively checks published snapshots, including nested targets and structured blocks. It rejects a published work status paired with an unpublished projection state, so malformed restored data cannot reach catalog reads.

### Second Review Test Evidence

The new regressions were run red before implementation. They failed because resume/reopen did not generate version 3 flashes, normal unpublish left `status: "published"`, malformed nested snapshots restored, and inconsistent published-state records restored.

```text
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/portal-content.test.ts tests/unit/portal-config.test.ts tests/unit/portal-automation.test.ts tests/unit/recruitment-batch-rules.test.ts

Test Files  4 passed (4)
Tests  36 passed (36)
```

```text
sh scripts/with-hsd-node.sh corepack pnpm run typecheck

> nuxt typecheck
```
