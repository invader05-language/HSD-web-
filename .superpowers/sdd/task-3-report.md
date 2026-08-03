# Task 3 report: recruitment applications

## Scope delivered

- Added typed submission timestamps, submitted applicant detail fields, filtering/sorting, and lookup helpers.
- Replaced the inert application-row button with a route to a full-width, read-only application record page.
- Removed the application-status selector and made the submission-time control an explicit sort selector.
- Added focused domain coverage and browser coverage for filtering, sorting, and the read-only record.

## TDD evidence

1. Added `tests/unit/recruitment-applications.test.ts` before production implementation.
2. Ran the focused test and observed all three cases fail because the planned domain functions were not exported:
   `TypeError: filterAndSortRecruitmentApplications is not a function` and
   `TypeError: findRecruitmentApplication is not a function`.
3. Implemented the minimal domain interface and route page.
4. Re-ran the focused test successfully: 1 file, 3 tests passed.

## Validation

- PASS: `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/recruitment-applications.test.ts`
- BLOCKED outside Task 3: `sh scripts/with-hsd-node.sh corepack pnpm run typecheck` currently fails in concurrent member-profile / join-apply changes. The reported errors are in `app/data/member-profile.ts`, `app/pages/join/apply.vue`, and `app/pages/member/profile.vue`; none originate from Task 3 files.

## Deliberate exclusions

- No export implementation was added; Task 4 owns exports.
- The detail view contains no assessment action, note editor, mutation control, or application-status badge.

## Follow-up review repair

Resolved both P1 findings from review `2a55f25..ce7d189`.

- Added `formatRecruitmentApplicationSubmittedAt` and used it in both the list and read-only record header. The formatter reads only `submittedAt`; `updatedAt` remains reserved for the assessment workflow UI.
- Added `requireRecruitmentApplication`, which accepts the page's `createError` factory. Because the detail page resolves it in a computed value, a client-side parameter change from a known record to an unknown ID evaluates again and throws `createError({ statusCode: 404, statusMessage: "报名记录不存在" })` instead of rendering an empty page.
- Extended unit coverage to five cases, including submission-time formatting and missing-record 404 details. The two new assertions were first observed failing because both helper functions were absent, then passed after the minimal implementation.
- Extended Playwright coverage to assert the detail timestamp and an unknown-record 404 response. The E2E run could not start system Chrome: every case aborted during browser launch with `SIGABRT` (and cleanup reported `kill EPERM`), before application assertions ran.

### Follow-up validation

- PASS: `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/recruitment-applications.test.ts` — 1 file, 5 tests passed.
- BLOCKED outside Task 3: `sh scripts/with-hsd-node.sh corepack pnpm run typecheck` remains blocked by concurrent Task 5 member-normalization migration errors in public/member/admin-member/join pages; no reported error references the Task 3 files.
- BLOCKED by local Chrome environment: `sh scripts/with-hsd-node.sh corepack pnpm exec playwright test tests/e2e/recruitment-admin.spec.ts` — 6/6 abort at browser launch, before test execution.

## E2E 404 evidence repair

Review found that the former unknown-record E2E test went directly to the protected URL while signed out. That could only exercise the route guard/login redirect, rather than the application's authenticated 404 handling.

- Folded the unknown-record assertion into the existing authenticated application-record journey.
- The test now completes the existing `admin-alliance` administrator login, opens `candidate-lin`, then uses the Nuxt client router to navigate to `/admin/recruitment/applications/missing`.
- It asserts both the resulting missing-record URL and the `报名记录不存在` error view, so the check covers a client-side parameter transition from a valid record in an authenticated session.

### E2E repair validation

- PASS: `sh scripts/with-hsd-node.sh corepack pnpm exec playwright test tests/e2e/recruitment-admin.spec.ts --list` — 5 tests discovered, including the repaired authenticated record journey.
- BLOCKED by local Chrome environment: `sh scripts/with-hsd-node.sh corepack pnpm exec playwright test tests/e2e/recruitment-admin.spec.ts` — all 5 cases abort during Chrome launch with `SIGABRT`; cleanup also reports `kill EPERM`, before any application assertion can run. This prevents observing the normal TDD red/green browser result, but the failure is independent of the test body and matches the pre-existing environment failure.
