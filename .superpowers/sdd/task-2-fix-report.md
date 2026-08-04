# Task 2 Review Fix Report

## Status

All five blocking Store review findings are fixed. This report supersedes the
account-handling note in `task-2-report.md`: a passed final assessment is no
longer rewritten to `not-admitted` when the account linkage is missing.

## Fixes

- Reconciles assessment records with the current batch's non-withdrawn
  applications on every Store access, including applications submitted after
  the assessment Store was initialized. Application profile snapshots,
  preferences, first choice, and adjustment consent take precedence over the
  legacy roster without leaking records across batches.
- Allows assessment work for published and closed batches. Draft and archived
  batches reject mutations with explicit read-only errors, while batch
  lifecycle version changes no longer invalidate assessment state.
- Requires `offline-adjustment-pending` before recording an adjustment result,
  preventing a direct final decision without a failed round.
- Preserves the actual final decision for candidates without a reusable
  account. Whole-batch publication prevalidates every admitted member/account
  linkage and throws `ASSESSMENT_ACCOUNT_NOT_FOUND` before any promotion.
- Rejects the entire persisted assessment payload when an outer batch key,
  batch state ID, record batch ID, round number, or round outcome is invalid.

## TDD Evidence

The added review regressions initially produced five focused failures matching
the five findings. After the Store changes, the focused assessment suite passes
17 tests. The existing successful publication test now records both unmatched
legacy candidates (`candidate-zhou` and `candidate-zhang`) as failed instead of
creating accounts or altering their saved outcomes implicitly.

## Verification

- `pnpm exec vitest run tests/unit/recruitment-assessment.test.ts tests/unit/recruitment-assessment-rules.test.ts tests/unit/recruitment-application.test.ts tests/unit/recruitment-batch-rules.test.ts` -> 4 files, 49 tests passed.
- `pnpm run test:unit` -> 32 files, 224 tests passed.
- `pnpm run typecheck` -> passed.

## Scope

- Changed only the recruitment assessment Store and its unit tests.
- No page or E2E files were changed by this fix.
- Existing `.tools`, `node_modules`, plan, E2E, and Task 3 report changes remain
  outside this commit.
