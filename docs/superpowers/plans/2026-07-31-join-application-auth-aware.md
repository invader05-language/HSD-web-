# Join Application Auth-Aware Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every recruitment application entry in `/join` route directly to `/join/apply` for authenticated members while preserving the login continuation for guests.

**Architecture:** Keep `/join/apply` protected by the existing global auth middleware. Derive one computed target and one computed label from the Pinia session store in `app/pages/join.vue`, and use them for both recruitment CTAs. Add regression coverage for both auth states without changing the separate activity signup flow.

**Tech Stack:** Nuxt 4, Vue 3, Pinia, Vitest, Playwright.

## Global Constraints

- Frontend-only; no backend, database, API, real authentication, or persistence.
- Do not modify dependencies, package manifests, runtime files, or unrelated dirty-worktree changes.
- Preserve `/join/apply` route protection in `app/middleware/auth.global.ts`.
- Do not modify `/activities/[slug].vue`; report its separate static login-target issue independently.
- Use project-local Node 22.19.0 commands through `sh scripts/with-hsd-node.sh corepack pnpm <command>`.

---

### Task 1: Add failing recruitment CTA auth-state tests

**Files:**
- Create or modify: `tests/e2e/join-application.spec.ts`
- Modify: `tests/unit/login-continuation.test.ts` only if a pure helper is introduced

- [ ] **Step 1: Write the failing tests**

Cover both `/join` CTAs for guests and authenticated demo members, plus direct `/join/apply` protection. Use the existing login form and project Playwright conventions.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```sh
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/login-continuation.test.ts
```

and the focused Playwright spec when the browser server is available. The authenticated CTA assertion must fail before the implementation because `/join` currently always points to `/login?redirect=/join/apply`.

### Task 2: Implement the unified auth-aware recruitment target

**Files:**
- Modify: `app/pages/join.vue`

- [ ] **Step 1: Add the session store and computed values**

Use `useSessionStore()`. The computed target must be `/join/apply` when `session.isAuthenticated` is true and `buildLoginTarget("/join/apply")` otherwise. The computed label must be `开始填写报名表` for authenticated members and `登录后填写报名表` for guests.

- [ ] **Step 2: Use the computed values for every `/join` recruitment CTA**

Both the PageBanner CTA and the recruitment-flow CTA must bind to the same computed target and label. Do not duplicate login URL construction in the template.

- [ ] **Step 3: Run the focused tests and verify GREEN**

Run the unit and focused E2E coverage again. Confirm the existing global middleware still redirects unauthenticated direct navigation to `/join/apply`.

### Task 3: Audit and verify the scoped surface

**Files:**
- Inspect: `app/pages/join.vue`, `app/pages/join/apply.vue`, `app/middleware/auth.global.ts`, `app/stores/session.ts`, `app/utils/login-continuation.ts`, `app/pages/index.vue`, `app/pages/centers/[slug].vue`, `app/pages/help.vue`, `app/pages/activities/[slug].vue`

- [ ] **Step 1: Search all recruitment entry points**

Confirm every path that reaches `/join/apply` uses the corrected auth-aware behavior. Confirm homepage and center links still reach `/join` and that activity signup remains outside this task.

- [ ] **Step 2: Run full verification**

```sh
sh scripts/with-hsd-node.sh corepack pnpm run typecheck
sh scripts/with-hsd-node.sh corepack pnpm run test:unit
sh scripts/with-hsd-node.sh corepack pnpm run build
NUXT_TELEMETRY_DISABLED=1 sh scripts/with-hsd-node.sh corepack pnpm run test:e2e
```

If E2E is blocked by the existing `EMFILE: too many open files, watch` environment error, report the exact blocker without weakening assertions.
