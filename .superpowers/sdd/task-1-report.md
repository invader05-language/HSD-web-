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

## Self-review

- Publication requires the exact review path and owner authorization; ordinary administrators can create, edit, and submit only.
- Editing a published record creates a new work revision while preserving the old public snapshot. The old snapshot can still be explicitly unpublished.
- Portal publication validates the complete proposed configuration before replacing the public configuration, preventing partial updates.
- Automation is command-triggered only from successful recruitment/activity writes. No route, getter, query, computed value, or page-load code invokes it.
- Production backend ownership remains unchanged: this service is a frontend Mock and does not satisfy `HSD-BE-PORTAL-001`.

## Concerns

- The existing activity domain had no Store or management command; `app/stores/activities.ts` introduces only the minimal owner command needed for the automation boundary. Existing activity pages continue reading their fixtures until the later public/admin workflow tasks connect them.
- Portal persistence uses browser localStorage only as the specified frontend Mock fallback. It is intentionally not cross-device or production-authoritative.
