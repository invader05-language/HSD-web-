# Recruitment Batch Linkage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task with review checkpoints.

**Goal:** Make `RecruitmentBatch` the root entity for the front-end Mock recruitment workflow so `/join`, `/join/apply`, member results, and admin recruitment views consistently use `batchId` and the confirmed batch state rules.

**Architecture:** Keep the existing Nuxt 4 + Pinia Mock architecture. Add a pure batch-domain module for effective status and command validation, expand the recruitment repository/store to key applications by `batchId + memberId`, then make user and admin pages consume selectors/actions rather than fixtures or hard-coded `CURRENT` labels. Preserve the current identity boundary and treat the store as the future API seam.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Pinia, Vitest, Playwright.

## Global Constraints

- At most one batch may be effectively open at a time.
- Users never choose a batch; the current open batch is attached automatically.
- No open batch means `/join` keeps the introduction and disables registration; `/join/apply` cannot create or submit an application.
- Only the `owner` account may mutate batch configuration or lifecycle state.
- This round is front-end Mock only: no backend, database, real authentication, upload, notifications, or persistence.
- Preserve `.tools` and `node_modules`; do not delete or reset unrelated worktree changes.

### Task 1: Recruitment batch domain and repository

**Files:**
- Create: `app/types/recruitment-batch.ts`
- Create: `app/utils/recruitment-batch-rules.ts`
- Create: `app/data/recruitment-batches.ts`
- Modify: `app/data/recruitment-application.ts`
- Modify: `app/stores/recruitment-application.ts`
- Create: `tests/unit/recruitment-batch-rules.test.ts`
- Modify: `tests/unit/recruitment-application.test.ts`

**Interfaces:**
- `getEffectiveRecruitmentBatchStatus(batch, now)` returns the effective status and reason.
- `getCurrentOpenBatch(batches, now)` returns at most one open batch and rejects conflicting fixtures.
- `useRecruitmentBatchStore` exposes `currentOpenBatch`, `upcomingBatch`, `getApplication(batchId, memberId)`, `submitApplication`, `withdrawApplication`, and owner-checked lifecycle commands.
- Applications are keyed by immutable `(batchId, memberId)` and retain name/version/center/profile snapshots.

- [x] Write failing unit tests for time boundaries, manual override precedence, single-open enforcement, owner-only open/pause/close/reopen, application uniqueness, snapshots, and center removal.
- [x] Run the focused Vitest files and confirm failures are caused by missing domain/store behavior.
- [x] Implement the smallest domain types, fixtures, selectors, and commands required by the tests.
- [x] Run focused tests again, then refactor only while green.
- [x] Commit as `feat: add recruitment batch domain boundary`.

### Task 2: User join and application flow

**Files:**
- Modify: `app/pages/join.vue`
- Modify: `app/pages/join/apply.vue`
- Modify: `app/pages/member/results.vue`
- Modify: `app/utils/login-continuation.ts` only if the fixed `batchId` continuation needs an explicit query/session field.
- Modify: `tests/e2e/join-application.spec.ts`
- Create or modify: `tests/unit/recruitment-application-flow.test.ts`

**Interfaces:**
- User pages consume the batch store's `currentOpenBatch` and `upcomingBatch` selectors.
- Application submit/edit/withdraw actions always receive the captured `batchId`; the page never lets the user select one.

- [x] Add failing tests for open, upcoming-only, and no-batch `/join` states, direct `/join/apply` blocking, login continuation, edit/withdraw/resubmit, closed-during-edit handling, and latest-batch-only results.
- [x] Run the focused tests and confirm red status.
- [x] Update the pages to show the batch name/time/centers from the store, disable or replace CTAs when unavailable, retain drafts without creating records, and display clear state reasons.
- [x] Add batch labels to submitted summaries and remove hard-coded `2026 秋季招新`/`CURRENT` text.
- [x] Run focused unit and E2E tests, then commit as `feat: link member recruitment to current batch`.

### Task 3: Batch-context administration

**Files:**
- Modify: `app/data/recruitment-admin.ts`
- Modify: `app/pages/admin/recruitment/batches.vue`
- Modify: `app/pages/admin/recruitment/applications.vue`
- Modify: `app/pages/admin/recruitment/applications/[id].vue`
- Modify: `app/pages/admin/recruitment/index.vue`
- Modify: `app/pages/admin/recruitment/publish.vue`
- Create or modify: `tests/e2e/recruitment-batch-context.spec.ts`
- Modify: `tests/unit/admin-access.test.ts` only for owner capability assertions.

**Interfaces:**
- Batch list and detail links use `/admin/recruitment/batches/:batchId` context.
- Roster, assessment, publish, and export selectors accept `batchId` and cannot read another batch's candidates.
- Lifecycle actions require an explicit confirmation UI and append audit entries containing actor, original plan, actual time, reason, and before/after values.

- [x] Add failing tests for batch-context URLs, owner vs ordinary-admin permissions, confirmation-required early open, single-open blocking, and batch-isolated candidate/publication/export data.
- [x] Run the focused E2E/unit tests and confirm red status.
- [x] Implement batch list/detail context, lifecycle command controls, audit display, and batch-aware links/CSV naming while preserving existing admin shell behavior.
- [x] Run focused tests and commit as `feat: add batch-scoped recruitment administration`.

### Task 4: Whole-branch verification and cleanup

**Files:**
- Modify only files required by failing tests or lint/type errors.
- Update: `docs/superpowers/specs/2026-08-04-recruitment-batch-user-linkage-design.md` only if implementation evidence requires a factual correction.

- [x] Search for remaining hard-coded batch labels, `applicationsByMemberId`, and page-local time comparisons.
- [x] Run `sh scripts/with-hsd-node.sh corepack pnpm run test:unit`.
- [x] Run `sh scripts/with-hsd-node.sh corepack pnpm run typecheck`.
- [x] Run `sh scripts/with-hsd-node.sh corepack pnpm run build`.
- [x] Attempt `NUXT_TELEMETRY_DISABLED=1 sh scripts/with-hsd-node.sh corepack pnpm run test:e2e`; execution was blocked before assertions by local Chrome `SIGABRT` / missing bundled Chromium.
- [x] Review the diff, preserve unrelated untracked tooling paths, and commit only if additional verification fixes are needed.
