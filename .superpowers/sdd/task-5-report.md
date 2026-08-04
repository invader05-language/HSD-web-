# Task 5 Report: Portal configuration publication

## Implementation

- Replaced `/admin/content/home` with the merged portal configuration workspace backed by `usePortalCatalog` and `usePortalConfigStore`.
- Added fixed-capacity selectors plus add/replace, remove, move-up and move-down draft operations with availability, slot eligibility and duplicate validation.
- Added draft-only preview, owner-only full publication confirmation, atomic reference and visual validation, and persisted home/join visual drafts.
- Redirected `/admin/content/banners` to `/admin/content/home?view=visuals` and removed the disconnected Banner array/navigation entry.
- Connected project, activity, gallery and resource homepage sections to the published projection while preserving the approved initial references.
- Added same-slot/same-type runtime fallback diagnostics, explicit no-candidate warnings, and published visual rendering for home/join without changing recruitment-batch CTA control.

## TDD evidence

1. Baseline: `vitest run tests/unit/portal-config.test.ts` passed 5 tests.
2. Draft operations red: 3 failed / 5 passed because `replaceReference`, `moveReference` and `removeReference` did not exist. Green: 8 / 8 passed.
3. Projection/defaults red: 2 failed / 8 passed because warning projection and initial curated references did not exist. Green after implementation and fixture correction: 10 / 10 passed.
4. UI/public wiring red: 2 failed / 10 passed because the static admin prototype and static public-domain reads remained. Green: 12 / 12 passed.
5. Visual transaction red: 1 failed / 12 passed because a pending asset could publish. Green after atomic asset validation: 13 / 13 passed.

## Verification

- `pnpm run test:unit`: passed, 35 files and 272 tests.
- `pnpm run typecheck`: passed.
- `pnpm run build`: passed; Nuxt client, SSR and Nitro output completed successfully.
- Focused Playwright with the Nuxt dev server could not start because the environment hit `EMFILE: too many open files, watch`.
- Focused Playwright against the built server could not launch Google Chrome; all three selected tests terminated at browser startup with `SIGABRT` before page execution.
- gstack browse against the built Nitro server loaded the homepage with HTTP 200 and no console errors, confirmed all curated domains, draft preview isolation, atomic publication changing the first public project from `智巡先锋` to `智学领航`, the legacy Banner redirect, and no horizontal overflow at 390 px.

## Concerns

- Portal configuration remains a versioned `localStorage` frontend Mock. Server-side transactions, authorization, audit persistence and cross-device consistency remain `BACKEND_REQUIRED` per `HSD-BE-PORTAL-001`.
- The repository Playwright suite remains environment-blocked by Chrome `SIGABRT`; browser behavior was independently exercised with gstack browse, but the Playwright cases are not recorded as passing.
