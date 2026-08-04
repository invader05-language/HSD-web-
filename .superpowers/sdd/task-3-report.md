# Task 3 Report: Admin Official-Content Workflow

## Delivered

- Replaced `/admin/content`'s fixture-backed generic drawer with a Store-backed official-content list, status/category/search filters, live counts, and `?create=flash|article|notice` routing.
- Added dedicated create, edit, and work-version preview pages. The editor uses only structured `heading`, `paragraph`, and `image` blocks and retains an in-memory draft if local storage fails.
- Bound save, submit, approve, publish, and unpublish actions to `usePortalContentStore`; ordinary administrators see the owner boundary and the Store independently denies owner-only commands.
- Updated the published workflow projection to include the required `待发布` state and changed dashboard content metrics and activity rows to derive from the content Store.
- Updated quick-create links for flash, article, and notice. `AdminRecordWorkspace` remains in place for projects and activities, and Help Center routes/data were not reactivated.

## Files

- Added `app/components/admin/PortalContentEditor.vue`.
- Added `app/pages/admin/content/new.vue`, `app/pages/admin/content/[id].vue`, and `app/pages/admin/content/[id]/preview.vue`.
- Updated `app/pages/admin/content/index.vue`, `app/pages/admin/index.vue`, `app/data/admin-content.ts`, `app/data/admin-dashboard.ts`, and `app/assets/css/main.css`.
- Updated `tests/unit/admin-content.test.ts` and `tests/e2e/admin-platform.spec.ts`.

## Interfaces

- Pages call `usePortalContentStore().createDraft`, `updateDraft`, `submitForReview`, `approve`, `publish`, and `unpublish`; they do not mutate fixtures.
- `PORTAL_CONTENT_STATUS_LABELS`, `PORTAL_CONTENT_KIND_LABELS`, `toAdminContentRecord`, and `getContentOverview` adapt Task 1 Store records for the list and dashboard.
- `?create=flash|article|notice` redirects to `/admin/content/new?kind=<kind>`.

## TDD Evidence

- Red: `pnpm exec vitest run tests/unit/admin-content.test.ts` failed as expected because `待审核 -> 待发布` was not permitted.
- Green: `pnpm exec vitest run tests/unit/admin-content.test.ts tests/unit/portal-content.test.ts` passed: 2 files, 15 tests.

## Verification

- `pnpm run typecheck` passed.
- `pnpm run test:unit` passed: 35 files, 250 tests.
- `pnpm run build` passed: Nuxt client and server production build completed.
- `git diff --check` passed.
- Focused Playwright test was attempted twice. System Chrome exited with `SIGABRT` before navigating; CI mode could not run because the bundled Chromium executable is absent. The gstack browser harness also confirmed port `49852` served a stale different worktree; this worktree could not keep a separate Nuxt dev server open in this environment. No browser assertions ran against this change.

## Self-review

- No Help Center category or active content page was reintroduced.
- The old generic workspace was not reused as the official-content editor.
- Owner operations use Store authorization and confirmation; no hard deletion was added.
- Dashboard publishing counts read the same Store as the official-content list.

## Concerns

- Browser-level visual and interaction validation remains blocked by the local browser/runtime environment, despite typecheck, unit, and production build success.

## Review Fix Evidence (2026-08-04)

### Root Cause

- `isTarget` only checked the target object's shape, while `createDraft` and `updateDraft` copied the target without validating it. The editor only required a non-empty target before rendering it as a `NuxtLink`.
- `isBlocks` accepted empty image `assetId` and `alt` fields. The editor exposed a free-form asset ID, so incomplete or non-approved assets could enter the persisted record.

### Fixes

- Added `isSafeInternalPath` in `app/utils/internal-route.ts`. It accepts only normalized, app-relative paths beginning with `/`; it rejects `//`, absolute/scheme URLs, whitespace, control characters, backslashes, and URL-normalizing path variants.
- Store validation now runs at create, update, submit, approve, and publish. Invalid targets throw `PORTAL_CONTENT_INVALID_TARGET`; invalid image blocks throw `PORTAL_CONTENT_INVALID_BLOCK`.
- Added `canUseAssetForPortalContent`, backed by the existing `ADMIN_ASSETS` and `canSelectAsset` adapter. Only ready, approved image assets are accepted. The editor now presents that approved media list and gives actionable errors for missing asset selection, pending/rejected assets, and missing alt text.
- Corrected the content-block textarea from a literal `rows` string to `:rows` binding.

### TDD Evidence

- Red: `pnpm exec vitest run tests/unit/portal-content.test.ts` produced 2 expected failures: unsafe targets and invalid image blocks were accepted without throwing.
- Green: `pnpm exec vitest run tests/unit/admin-content.test.ts tests/unit/portal-content.test.ts tests/unit/admin-assets.test.ts` passed: 3 files, 20 tests.
- Added Store tests for accepted `/join` and `/activities/foo`, rejected `https://example.com`, `//evil.example`, `javascript:alert(1)`, and `data:` targets; blank/unapproved image asset IDs and blank alt text; validation immediately before submit and publish. Existing Store tests cover save/refresh persistence, ordinary-admin owner denial, unpublish, and published-revision isolation.

### Verification

- `pnpm run typecheck` passed.
- `pnpm run test:unit` passed: 35 files, 252 tests.
- `pnpm run build` passed after correcting the explicit image-block type guard in the editor.
- `git diff --check` passed.
- Browser E2E was not rerun: the previously observed local Chrome `SIGABRT` and missing CI Chromium executable remain environment blockers. No browser result is claimed as passing.
