# Task 1 report: central release feature availability

## Status

Completed and self-reviewed.

## Changes

- Added `ReleaseFeatures` and the release-default feature set. The temporary release keeps recruitment batches enabled and disables audit logs, recycle bin, and standalone upload tasks.
- Added a pure disabled-admin-route resolver, mapping logs and recycle bin to `/admin`, and upload tasks to `/admin/media`, with the approved one-time notice text.
- Added global route middleware that redirects disabled routes with `replace: true` and a `notice` query parameter.
- Updated administrative navigation to accept release features while preserving the existing owner-only accounts rule.
- Updated the admin layout to hide disabled navigation entries, render the arrival notice once, then remove only the `notice` query key with `history.replaceState`.
- Added focused unit coverage for redirects, recruitment-batch availability, and navigation filtering.

## TDD evidence

1. Before implementation, ran:

   `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/admin-release-features.test.ts`

   It failed as expected because `app/config/release-features.ts` did not exist.

2. After the minimal implementation, ran:

   `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/admin-release-features.test.ts tests/unit/admin-platform.test.ts`

   Result: 2 test files passed, 10 tests passed.

3. Ran the type check:

   `sh scripts/with-hsd-node.sh corepack pnpm run typecheck`

   Result: passed (Nuxt typecheck completed with exit status 0).

4. Ran `git diff --check`; no whitespace errors.

## Scope and risks

- This task deliberately leaves existing disabled-module page files and cross-links in place. Their removal is assigned to the following task.
- Middleware uses prefix matching exactly as specified, so nested disabled paths are also redirected.
- The release notice is intentionally local to the layout instance; it is displayed after redirect and the URL is cleaned without touching other query keys.
- The implementation remains frontend/Mock-only and does not alter authentication or persisted identity state.

## Follow-up fix: layout-reuse release notice

### Root cause

The initial implementation captured `route.query.notice` only during layout setup and only removed the URL query parameter in `onMounted`. Nuxt reuses the administrative layout across management routes, so a later redirect to a disabled route could arrive after the layout had mounted without updating the rendered notice. The previously displayed value could also remain after a subsequent route carried no notice.

### Fix

- Added `createReleaseNoticeState()` to the existing release-access utility. It accepts a newly arrived string notice and clears the displayed state when the route no longer carries one.
- The admin layout now synchronizes the initial mounted route notice and watches `route.query.notice` for later arrivals. Query cleanup still removes only the `notice` key via `history.replaceState`, preserving all other query keys and the hash.
- Added focused coverage for the `/admin/recycle-bin` fallback and for a layout-equivalent notice state receiving a notice after initialization, then clearing on a later ordinary route.

### TDD and validation evidence

1. Added the notice-state test before production code and ran:

   `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/admin-release-features.test.ts`

   Result: failed as expected with `expected undefined to be type of 'function'` because `createReleaseNoticeState` did not yet exist.

2. Implemented the minimal state helper and route-query watcher, then ran:

   `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/admin-release-features.test.ts tests/unit/admin-platform.test.ts`

   Result: passed — 2 test files, 11 tests.

3. Ran:

   `sh scripts/with-hsd-node.sh corepack pnpm run typecheck`

   Result: blocked by concurrent, unstaged Task 3 work outside this fix. Errors are limited to member/public-directory/recruitment files such as `app/pages/about.vue`, `app/pages/admin/members/[id].vue`, and `app/pages/join/apply.vue`, which reference fields Task 3 is actively renaming (`role`, `direction`, `publicState`). This fix's changed files did not produce a typecheck error.
