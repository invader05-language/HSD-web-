# People and Centers Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build public core-person, member-directory, and center-detail routes from shared typed frontend data while preserving the approved desktop Web design.

**Architecture:** Public content lives in focused TypeScript modules under `app/data/`. Nuxt pages consume these modules directly during SSR; page-local refs handle directory filtering. The existing `HsdAvatar` component remains the single avatar privacy boundary.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Pinia (existing session only), Vitest, Playwright.

## Global Constraints

- Do not add a backend API, database, ORM, CMS, or new state library.
- Product name remains “白云 HSD 开发者部落”.
- Desktop Web at 1440px is the primary acceptance target.
- Public content must not require login.
- Unavailable or private avatars use the white HSD default avatar.
- User-provided recruitment posters must not be reused as website assets.

---

### Task 1: Shared people and center contracts

**Files:**
- Create: `app/data/people.ts`
- Create: `app/data/centers.ts`
- Modify: `app/data/home.ts`
- Test: `tests/unit/public-directory.test.ts`

**Interfaces:**
- Produces: `PublicPerson`, `CORE_PEOPLE`, `PUBLIC_MEMBERS`, `CenterProfile`, `CENTERS`, `getCenterBySlug(slug)`, `getPeopleByCenter(slug)`.
- Consumes: no runtime services.

- [ ] **Step 1: Write the failing tests**

```ts
expect(CENTERS.map(center => center.slug)).toEqual([
  "baize-development",
  "new-media",
  "tuowei-planning",
  "talent-development"
]);
expect(CORE_PEOPLE.every(person => person.isCore)).toBe(true);
expect(resolvePublicAvatar(privatePerson)).toBeUndefined();
```

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm vitest run tests/unit/public-directory.test.ts`  
Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Implement the typed modules**

Create literal public content records, export lookup helpers, and re-export `CENTERS` from `home.ts` so existing imports keep working.

- [ ] **Step 4: Run test to verify GREEN**

Run: `pnpm vitest run tests/unit/public-directory.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/data/people.ts app/data/centers.ts app/data/home.ts tests/unit/public-directory.test.ts
git commit -m "feat: add public people and center content models"
```

### Task 2: Public people routes and overview entry points

**Files:**
- Modify: `app/pages/about.vue`
- Create: `app/pages/people/core.vue`
- Create: `app/pages/people/members.vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/e2e/public-directory.spec.ts`

**Interfaces:**
- Consumes: `CORE_PEOPLE`, `PUBLIC_MEMBERS`, `CENTER_OPTIONS`, `resolvePublicAvatar`.
- Produces: `/people/core` and `/people/members`.

- [ ] **Step 1: Write failing route tests**

```ts
await page.goto("/about");
await expect(page.getByRole("link", { name: "查看全体核心人员" })).toBeVisible();
await expect(page.getByRole("link", { name: "查看所有成员" })).toBeVisible();
```

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm playwright test tests/e2e/public-directory.spec.ts`  
Expected: FAIL because the links and routes do not exist.

- [ ] **Step 3: Implement overview links and both directory pages**

Use semantic headings and links, two-column desktop member rows, three-column core cards, local search/filter state, and the existing default-avatar component.

- [ ] **Step 4: Run test to verify GREEN**

Run: `pnpm playwright test tests/e2e/public-directory.spec.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pages/about.vue app/pages/people/core.vue app/pages/people/members.vue app/assets/css/main.css tests/e2e/public-directory.spec.ts
git commit -m "feat: add public people directory pages"
```

### Task 3: Clickable center overview and detail routes

**Files:**
- Modify: `app/pages/index.vue`
- Modify: `app/pages/about.vue`
- Modify: `app/pages/centers.vue`
- Create: `app/pages/centers/[slug].vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/unit/public-directory.test.ts`
- Test: `tests/e2e/centers.spec.ts`

**Interfaces:**
- Consumes: `CENTERS`, `getCenterBySlug`, `getPeopleByCenter`.
- Produces: four `/centers/:slug` routes and 404 handling.

- [ ] **Step 1: Write failing lookup and navigation tests**

```ts
expect(getCenterBySlug("new-media")?.title).toBe("新媒体中心");
expect(getCenterBySlug("missing")).toBeUndefined();
await page.goto("/centers");
await page.getByRole("link", { name: /白泽开发中心/ }).click();
await expect(page).toHaveURL(/\/centers\/baize-development$/);
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm vitest run tests/unit/public-directory.test.ts && pnpm playwright test tests/e2e/centers.spec.ts`  
Expected: FAIL before the detail route and links are implemented.

- [ ] **Step 3: Implement center links and detail page**

Use `PageBanner`, structured detail sections, related-member rows, explicit cross-center navigation, and `createError({ statusCode: 404 })` for unknown slugs.

- [ ] **Step 4: Run tests to verify GREEN**

Run the same focused unit and E2E commands.  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pages/index.vue app/pages/about.vue app/pages/centers.vue app/pages/centers/[slug].vue app/assets/css/main.css tests/unit/public-directory.test.ts tests/e2e/centers.spec.ts
git commit -m "feat: add center detail navigation"
```

### Task 4: Documentation and full verification

**Files:**
- Modify: `HSD需求文档.md`
- Modify: `README.md`
- Modify: `init/AGENTS.md`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: final route names and avatar/privacy behavior.
- Produces: synchronized PRD, route table, change log, and desktop regression coverage.

- [ ] **Step 1: Update documentation**

Record the new routes, public access policy, TypeScript-data phase, later backend migration boundary, and 2026-07-29 change-log entry.

- [ ] **Step 2: Extend desktop route coverage**

Add the new public routes to the horizontal-overflow test and assert all four center pages render.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm test
pnpm build
pnpm test:e2e
```

Expected: all tests pass, production build succeeds, and no route overflows horizontally at the desktop acceptance viewport.

- [ ] **Step 4: Commit**

```bash
git add HSD需求文档.md README.md init/AGENTS.md tests/e2e/home.spec.ts
git commit -m "docs: record public people and center routes"
```

