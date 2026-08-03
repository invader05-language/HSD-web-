# Task 5 Report: Normalize member public profiles

## Status

Implemented the Task 5 domain migration:

- `MemberDuty` is limited to `普通成员 | 核心人员`.
- Centre leadership is represented independently from member duty.
- Generic member `direction` and `AdminPublicState` were removed from member/admin/public contracts.
- The single five-value `BaizeDirection` contract is used for member-facing direction data.
- Non-Baize profiles and submitted applications clear stale Baize direction data.
- Personal bio is optional in member and recruitment-profile validation.
- Every stored formal profile with a public id and centre slug is projected into the public repository by default.
- Preparatory profiles and private fields (`studentId`, `className`, identity/account data) remain outside public projections.

## TDD evidence

- Initial focused run: 9 expected failures across the three Task 5 test files.
- New-formal-profile projection test: failed with `undefined` before repository implementation, then passed.
- Non-Baize submission normalization test: failed with stale `鸿蒙开发` before store normalization, then passed.

## Verification

- Focused tests: `4 files / 39 tests` passed.
- Full unit suite: `25 files / 136 tests` passed.
- `git diff --check`: passed before staging.
- `pnpm typecheck`: executed and failed only in Task 8 consumer pages that still reference the deliberately removed `role`, `direction`, and `publicState` fields. No Task 5 domain-file type errors remain. Task 8 must migrate those templates to `memberDuty` and conditional `baizeDirection`.

## Scope notes

- Updated recruitment profile/application contracts and tests because removing generic member direction and making bio optional affect registration as well as member-profile editing.
- Did not implement add-member account creation, first-password behavior, or Task 8 page redesign.
- Did not touch `.tools`, `node_modules`, or `.pnpm-store`.

## Review follow-up

Resolved the three Task 5 review findings:

- Public core status no longer inherits the legacy static `PublicPerson.isCore` value. It is now derived from the independent `memberDuty` field or the current center-lead qualification already held in `useAdminAccessStore`; granting and revoking that qualification updates the public projection reactively.
- Center-lead fixtures retain `centerLeadership` while using `memberDuty: "普通成员"`, so leadership and manually assigned core duty remain separate concepts.
- Formal publication now requires `identity === "正式成员"`. If a stored formal profile becomes preparatory, its matching static public record is removed immediately instead of resurfacing stale data.
- `AdminCandidate.baizeDirection` now uses the shared five-value `BaizeDirection` union, with a shared runtime guard and fixture coverage.

### Follow-up TDD evidence

- Added four regression tests first and observed four expected failures: legacy `isCore` fallback, stale public record after formal-to-preparatory transition, conflated center-lead duty fixtures, and the missing Baize runtime guard.
- Focused verification: `4 files / 36 tests` passed.
- Full unit verification: `26 files / 143 tests` passed.
- `git diff --check`: passed.
- `pnpm typecheck`: still fails only in the previously identified Task 8 consumer pages that reference removed `role`, `direction`, and `publicState` fields; the follow-up domain files introduce no additional reported type errors.

## Static projection follow-up

Resolved the remaining static-record projection gap:

- Static public people without a stored member profile no longer return their legacy `isCore` value unchanged. Their public core state is rebuilt from `memberDuty === "核心人员"`.
- A static person can additionally inherit current center-lead status only when the repository finds exactly one formal admin-member record with the same name and center. Ambiguous or absent matches do not grant core status.
- The center-lead contribution remains reactive because the unique match is evaluated against the administrator projection backed by `useAdminAccessStore`.

### Static projection TDD evidence

- Added two regression tests first and observed the expected two failures: a legacy `isCore: true` static record with `memberDuty: "普通成员"` remained core, and a uniquely matched static member did not start from the normalized non-core state.
- After implementation, the focused public-directory test passed: `1 file / 13 tests`.
- Task 5 focused verification passed: `4 files / 38 tests`.
- Full unit verification passed: `26 files / 145 tests`.
- `pnpm typecheck` remains blocked only by Task 8 consumer pages that still reference the removed `role`, `direction`, and `publicState` fields. No error points to the Task 5 domain or test files changed in this follow-up.
