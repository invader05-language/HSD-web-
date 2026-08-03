# Task 3 Report: Admin Navigation And Qualification Configuration

## Delivered

- Renamed the last administration group to `系统管理`, removed the role-matrix navigation entry, and made `管理员资格配置` visible only when the session exposes owner account-management capability.
- Updated the admin frame to show the authenticated account name, account ID, and derived management level in both the sidebar and top bar.
- Replaced `/admin/accounts` with the owner-only `管理员资格配置` table. It renders the mutable account store, management level/status, configuring actor/time, and most recent mock login time.
- Added confirmation-driven grant, revoke, enable, and disable controls. The owner row is explicitly protected and cannot be changed.
- Extended the mutable access store with owner-authorized qualification changes, per-session qualification metadata, and in-memory audit records. The existing logs page now reads those live records, so a change appears in-session immediately.
- Replaced the old role-matrix page with a screenless compatibility redirect. The existing route guard retains owner redirect and administrator denial behavior.
- Updated the forbidden page to identify the active account, its actual management level, and the missing qualification.

## TDD Evidence

1. Added navigation and audit-store assertions before production changes.
2. RED: `pnpm vitest run tests/unit/admin-platform.test.ts tests/unit/admin-topbar.test.ts tests/unit/admin-access.test.ts` failed because the role entry/navigation labels and mutable qualification audit APIs did not exist.
3. GREEN: focused navigation, route, access, audit, and topbar tests passed after implementation.
4. Added an owner-enforcement assertion for a platform-admin actor.
5. RED: `pnpm vitest run tests/unit/admin-access.test.ts` failed because the new store action accepted a non-owner actor.
6. GREEN: the focused access suite passed after adding the owner check.

## Verification

- `pnpm vitest run tests/unit/admin-platform.test.ts tests/unit/admin-topbar.test.ts tests/unit/admin-access.test.ts tests/unit/route-access.test.ts tests/unit/admin-system.test.ts`: 5 files passed, 27 tests passed.
- `pnpm vitest run tests/unit/login-continuation.test.ts tests/unit/login-mode.test.ts`: 2 files passed, 13 tests passed.
- `pnpm typecheck`: passed.
- `git diff --check`: passed.
- Local development server responded with HTTP 200 at `http://localhost:3001/admin/accounts`.

## Concern

- The qualification records are intentional front-end Mock state. They reset with the Pinia session/reload and must become server-validated, durable audit data when a backend is introduced.

## Review Remediation

### TDD Evidence

1. RED: `pnpm vitest run tests/unit/route-access.test.ts tests/unit/admin-platform.test.ts` failed as expected: non-owner `/admin/accounts` access lost its denied target, and the retired `ADMIN_ROLES`/`.admin-role-layout` surfaces still existed.
2. GREEN: `pnpm vitest run tests/unit/route-access.test.ts tests/unit/admin-platform.test.ts tests/unit/admin-access.test.ts tests/unit/admin-audit.test.ts tests/unit/admin-topbar.test.ts` passed: 5 files, 28 tests.

### Verification

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `git diff --check`: passed.
- A production server served `/admin/recruitment` with HTTP 200 at `http://127.0.0.1:49852`.
- Browser regression tests were attempted against that production server, but local Chrome aborted during launch before either test created a page (`SIGABRT` / `Target page, context or browser has been closed`). The failure is host-browser startup, not an assertion result.

### Remediations

- Forbidden redirects now retain an encoded canonical `from` route. The forbidden page recognizes only a string canonical `/admin/accounts` source as requiring owner qualification; arrays and external-looking values fall back safely to ordinary administrator qualification.
- The layout, account table, forbidden page, and audit records use one current-level label function, including `普通成员`.
- The legacy role-matrix data, tests, CSS, and stale browser workflow are removed; audit filtering remains covered in `tests/unit/admin-audit.test.ts`.
- At the 390px breakpoint, the top bar keeps a compact identity and exposes a filtered two-column navigation sheet. Non-owner sessions do not receive the owner-only account configuration link.
- The qualification danger color is scoped to qualification actions without `!important`.

## E2E Fixture Remediation (2026-08-03)

- The `signInToAdmin` helper now accepts an optional `account` argument and keeps `admin-alliance` as its default, preserving owner-based scenarios.
- The 390px navigation scenario explicitly signs in as `media-admin`, so its platform-administrator identity and hidden owner-only account configuration link are asserted against the same account.
- `pnpm typecheck`: passed.
- `pnpm exec playwright test tests/e2e/admin-platform.spec.ts --list`: passed, collecting 9 tests.
- Focused browser execution was attempted before the change but Nuxt failed during server startup with `EMFILE: too many open files, watch`; no assertion ran. The port was not reachable after Playwright cleaned up the failed server process.
- A fresh focused attempt after the change with `CHOKIDAR_USEPOLLING=1` stopped before browser launch because Nuxt reported an existing worktree dev-server lock (PID 84611), while `127.0.0.1:49852` was not reachable. The process was left untouched; no browser assertion result is available.
