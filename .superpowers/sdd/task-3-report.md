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
