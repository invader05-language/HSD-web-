# Interview Date-Time Picker Release

- PR: #44 (`fix(web): use unified CST picker for interview slots`)
- Merged `main`: `5cf5e107d55a2946c7dac78011e02922262f68b0`
- Release: `/var/www/hsd/releases/20260917T0256Z-5cf5e107-datetime-picker`
- Previous release: `/var/www/hsd/releases/20260916T171236Z-60a0bef-4520747-slot-rule`
- Backup: `/var/backups/hsd/deploy-20260917T0256Z-5cf5e107-datetime-picker`

## Scope

The release contains the unified China Standard Time interview date-time picker,
canonical UTC serialization, strict slot validation, and updated unit/E2E tests.
It is frontend-only. No API process, database schema, migration, seed, or test
data was changed.

## Verification

- Node 22 production build completed successfully.
- Client assets verified: 157 JavaScript files and 861 local imports.
- Vitest: 126 files and 880 tests passed.
- Nuxt typecheck passed.
- Playwright real editor picker smoke passed.
- GitHub Actions `verify` passed, including full E2E and production-mode API E2E.
- Candidate instance on `127.0.0.1:18181` returned HTTP 200 for `/` and the
  admin batch route before cutover.

## Post-deploy

- Atomic `current` switch completed.
- Only `hsd-web` was restarted; `hsd-api` and `hsd-worker` remained active.
- T+0, T+5, T+10, T+15, and T+20 checks passed for `/`,
  `/api/v1/health/live`, `/api/v1/health/ready`, and
  `/api/v1/public/members`.
- Final read-only check: all three services active, `hsd-web` restart count 0,
  and all four endpoints returned HTTP 200.
- The planned T+25/T+30 checks were intentionally stopped at the user's request;
  this is a 20-minute post-deploy observation, not a completed 30-minute window.

To roll back, point `/var/www/hsd/current` back to the previous release recorded
above and restart `hsd-web` after confirming the target and service state.
