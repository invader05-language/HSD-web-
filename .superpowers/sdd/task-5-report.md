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

## Review fixes

- Made publication transactional across persistence and in-memory public state. The proposed public payload is serialized and written first; storage failure throws `PORTAL_CONFIG_PERSISTENCE_FAILED`, preserves the previous `publishedConfig`, and cannot announce publication success.
- Connected the approved portal asset to the bundled `01-首页Banner.png` source. Home and join/page banners now render the selected image with configured alt text and retain the existing placeholder fallback for no source or image-load failure.
- Added explicit invalid-current options for missing, unavailable, ineligible, and duplicate saved references, plus distinct persistence, visual, and reference error messages.
- Completed tab and overlay accessibility: tab/panel associations, roving tab stops, Arrow/Home/End activation, labelled modal dialogs, initial focus, Escape close, focus containment, and trigger focus restoration.

## Review TDD and verification

1. Persistence regression red: publication returned normally after a mocked quota failure. Green: the store threw `PORTAL_CONFIG_PERSISTENCE_FAILED` and retained the exact previous public config.
2. Visual rendering red: no approved-source resolver or rendered image existed. Green: approved asset URL rendering, image-error fallback, no-selection fallback, and both public visual consumers are covered.
3. Accessibility/actionability contracts red: tab associations, dialog focus hooks, invalid-current state, and typed error messages were absent. Green after the admin workspace update.
4. Focused verification: `pnpm vitest run tests/unit/portal-config.test.ts tests/unit/portal-visual.test.ts` passed 2 files and 19 tests.
5. Full verification: `pnpm run test:unit` passed 36 files and 278 tests; `pnpm run typecheck` passed; `pnpm run build` passed and emitted the 31.73 kB `01-首页Banner` client asset.
6. gstack browse against the built server confirmed the published image URL loaded visibly with alt text and `naturalWidth: 1440`; ArrowRight activated and focused the visual tab; preview received initial close-button focus, closed on Escape, and returned focus to its trigger. No horizontal overflow was present. The forced localStorage fixture on the SSR homepage produced the known client/server Mock hydration mismatch; admin routes are client-rendered and the checked admin interactions did not depend on that mismatch.
