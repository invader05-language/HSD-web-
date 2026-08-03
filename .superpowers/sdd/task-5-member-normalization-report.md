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
