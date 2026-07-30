# HSD Admin Platform Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the confirmed 1440px desktop administration prototype with seven navigation domains, 15 complete core screens, representative interactions, and a viewport-height sidebar.

**Architecture:** Keep the public/member experience and administration experience in one Nuxt application, but isolate the administration shell under `/admin/**`. Shared admin primitives render consistent headings, metrics, list workspaces, status pills, drawers, and confirmation dialogs; focused Mock data modules provide deterministic records without claiming backend persistence.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Pinia session state, CSS design tokens, Vitest, Playwright.

## Global Constraints

- The primary acceptance viewport is 1440px desktop Web, with 1366px compatibility.
- The desktop sidebar is 252px wide, fixed from `top: 0` to `bottom: 0`, and must never expose a light gap below it.
- The administration UI uses HSD deep red, near-black, white, and cool gray without reusing public-site banners.
- Public and administration navigation remain isolated.
- All data and mutations are explicitly labeled Mock; no screen may claim database, storage, or API persistence.
- Root pages must not overflow horizontally; wide tables scroll inside their own containers.
- Save and publish are separate states.
- High-risk identity, result, permission, publish, version, and delete actions require confirmation.
- Uploads expose waiting, uploading, processing, review, ready, and failed states.

---

### Task 1: Administration Domain Model and Navigation Shell

**Files:**
- Create: `app/data/admin-platform.ts`
- Create: `app/components/admin/AdminPageHeading.vue`
- Create: `app/components/admin/AdminStatusPill.vue`
- Modify: `app/layouts/admin.vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/unit/admin-platform.test.ts`
- Test: `tests/e2e/admin-platform.spec.ts`

**Interfaces:**
- Produces: `ADMIN_NAVIGATION: AdminNavigationGroup[]`
- Produces: `ADMIN_ROUTES: readonly string[]`
- Produces: `getAdminNavigationState(path: string): { groupId: string; itemId: string }`
- Produces: `<AdminPageHeading eyebrow title description>` and `<AdminStatusPill status>`

- [ ] **Step 1: Write failing navigation and full-height shell tests**

```ts
expect(ADMIN_NAVIGATION.map((group) => group.label)).toEqual([
  "工作台",
  "招新与考核",
  "组织与成员",
  "项目与活动",
  "内容与门户",
  "媒体与资源",
  "系统与权限"
]);
expect(getAdminNavigationState("/admin/resources")).toEqual({
  groupId: "media-resources",
  itemId: "resources"
});
```

Playwright must assert that the sidebar bounding box height equals the viewport height at 1440×1000 and 1366×900.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm exec vitest run tests/unit/admin-platform.test.ts
pnpm exec playwright test tests/e2e/admin-platform.spec.ts
```

Expected: failures because the navigation model and complete routes do not exist.

- [ ] **Step 3: Implement navigation data and reusable primitives**

```ts
export interface AdminNavigationItem {
  id: string;
  label: string;
  to: string;
}

export interface AdminNavigationGroup {
  id: string;
  label: string;
  items: AdminNavigationItem[];
}
```

Update `admin.vue` to render grouped navigation, preserve “返回官网”, show the current alliance-lead identity, and keep the identity footer inside the fixed dark sidebar.

- [ ] **Step 4: Add shell CSS**

Use `position: fixed; inset: 0 auto 0 0; height: 100dvh;` for the sidebar and `min-height: 100dvh` for both frame and workspace. Remove any content-dependent sidebar height.

- [ ] **Step 5: Run unit and shell tests**

Expected: navigation grouping, active route, isolation from public navigation, and full-height assertions pass.

- [ ] **Step 6: Commit**

```bash
git add app/data/admin-platform.ts app/components/admin app/layouts/admin.vue app/assets/css/main.css tests/unit/admin-platform.test.ts tests/e2e/admin-platform.spec.ts
git commit -m "feat: establish admin platform shell"
```

### Task 2: Action-Oriented Administration Dashboard

**Files:**
- Create: `app/data/admin-dashboard.ts`
- Create: `app/pages/admin/index.vue`
- Modify: `app/assets/css/main.css`
- Modify: `tests/unit/admin-platform.test.ts`
- Modify: `tests/e2e/admin-platform.spec.ts`

**Interfaces:**
- Consumes: `AdminPageHeading`, `AdminStatusPill`
- Produces: `ADMIN_DASHBOARD_METRICS`, `ADMIN_TODOS`, `ADMIN_RECRUITMENT_PROGRESS`, `ADMIN_RECENT_ACTIVITY`

- [ ] **Step 1: Write failing dashboard tests**

```ts
expect(ADMIN_DASHBOARD_METRICS.map((metric) => metric.label)).toEqual([
  "待处理事项",
  "待审核内容",
  "待发布内容",
  "存储使用情况"
]);
expect(ADMIN_TODOS.every((todo) => todo.to.startsWith("/admin/"))).toBe(true);
```

Browser assertions cover heading, four clickable metrics, priority todos, recruitment progress, media/storage status, quick-create menu, and recent actions.

- [ ] **Step 2: Verify RED**

Run the targeted unit and browser tests; expect missing dashboard data and route failures.

- [ ] **Step 3: Implement dashboard Mock data and page**

Use a two-column desktop work area: priority tasks and content state on the left, recruitment and storage state on the right. Keep the first metric row full-width and link each number to a filtered administration route.

- [ ] **Step 4: Implement quick-create disclosure**

The “新建” button opens a keyboard-accessible menu with links for flash news, announcement, project, activity, media upload, learning resource, and member creation.

- [ ] **Step 5: Run tests and commit**

```bash
git add app/data/admin-dashboard.ts app/pages/admin/index.vue app/assets/css/main.css tests
git commit -m "feat: add action-oriented admin dashboard"
```

### Task 3: Complete Recruitment Administration

**Files:**
- Create: `app/pages/admin/recruitment/batches.vue`
- Create: `app/pages/admin/recruitment/publish.vue`
- Modify: `app/pages/admin/recruitment.vue`
- Modify: `app/data/recruitment-admin.ts`
- Modify: `app/assets/css/main.css`
- Create: `tests/unit/admin-recruitment-workflow.test.ts`
- Modify: `tests/e2e/recruitment-admin.spec.ts`

**Interfaces:**
- Produces: `RecruitmentBatch`, `RecruitmentPublicationGroup`
- Produces: `getPublicationSummary(candidates): PublicationSummary`
- Retains: first-preference grouping, sequential White Ze rounds, regular-center-only offline final destinations.

- [ ] **Step 1: Write failing batch and publication tests**

Verify that internal saved results do not appear as published, White Ze remains excluded from adjustment targets, and publication groups expose candidate counts and selected state.

- [ ] **Step 2: Verify RED**

Run the targeted recruitment unit and E2E suites.

- [ ] **Step 3: Implement batch list**

Provide current, scheduled, closed, and draft batch cards with dates, center availability, owner, applicant count, and actions. A “新建批次” drawer demonstrates field structure without persistence.

- [ ] **Step 4: Refine the existing assessment workbench**

Preserve the table and candidate drawer, add a clear “内部结果” label, link to result publication, and ensure all visible controls mutate only the current Mock session.

- [ ] **Step 5: Implement result publication**

Show four center groups, unpublished count, validation warnings, candidate preview, affected user surfaces, and a two-step batch publication confirmation.

- [ ] **Step 6: Run tests and commit**

```bash
git add app/pages/admin/recruitment app/pages/admin/recruitment.vue app/data/recruitment-admin.ts app/assets/css/main.css tests
git commit -m "feat: complete recruitment administration prototype"
```

### Task 4: Organization, Members, Core People, and Honor Review

**Files:**
- Create: `app/data/admin-members.ts`
- Create: `app/pages/admin/members/index.vue`
- Create: `app/pages/admin/members/[id].vue`
- Create: `app/pages/admin/core-members.vue`
- Create: `app/pages/admin/honors.vue`
- Modify: `app/assets/css/main.css`
- Create: `tests/unit/admin-members.test.ts`
- Modify: `tests/e2e/admin-platform.spec.ts`

**Interfaces:**
- Produces: `AdminMember`, `CoreMemberPlacement`, `HonorReviewRecord`
- Produces: `filterAdminMembers(records, filters)`
- Produces: `getPublicProfilePreview(member)`

- [ ] **Step 1: Write failing member privacy and filtering tests**

Verify center, identity, grade, and public-state filtering. Verify that private avatars resolve to the HSD fallback in public preview data.

- [ ] **Step 2: Verify RED**

Run the new unit test and the member-route browser assertions.

- [ ] **Step 3: Implement member directory and member detail**

The directory uses a dense table. The detail page uses internal profile, public profile, and growth/honor tabs, with a public-page preview and a high-risk identity confirmation.

- [ ] **Step 4: Implement core-person configuration**

Use an ordered list with member picker, role, term, public state, drag-handle affordance, and public-about-page preview.

- [ ] **Step 5: Implement honor review**

Use review queue filters, proof-material state, approve/return actions, public consent, and featured-honor limits.

- [ ] **Step 6: Run tests and commit**

```bash
git add app/data/admin-members.ts app/pages/admin/members app/pages/admin/core-members.vue app/pages/admin/honors.vue app/assets/css/main.css tests
git commit -m "feat: add member and organization administration"
```

### Task 5: Projects, Activities, Content, and Homepage Configuration

**Files:**
- Create: `app/data/admin-content.ts`
- Create: `app/components/admin/AdminRecordWorkspace.vue`
- Create: `app/pages/admin/projects.vue`
- Create: `app/pages/admin/activities.vue`
- Create: `app/pages/admin/content/index.vue`
- Create: `app/pages/admin/content/home.vue`
- Modify: `app/assets/css/main.css`
- Create: `tests/unit/admin-content.test.ts`
- Modify: `tests/e2e/admin-platform.spec.ts`

**Interfaces:**
- Produces: `AdminContentRecord`, `AdminProjectRecord`, `AdminActivityRecord`, `HomepageSlot`
- Produces: `filterAdminRecords(records, query, status, category)`
- Produces: generic `<AdminRecordWorkspace>` for list/filter/drawer/editor-preview behavior.

- [ ] **Step 1: Write failing content-state tests**

Verify the allowed state path `draft → review → published → offline`, homepage slot capacity, and filtered record counts.

- [ ] **Step 2: Verify RED**

Run targeted tests and expect missing data/routes.

- [ ] **Step 3: Implement the reusable record workspace**

The component must render search, status/category filters, count, list table, row action, empty state, editor drawer, save-draft action, preview, and publish confirmation.

- [ ] **Step 4: Implement project and activity pages**

Projects expose center participation, members, status, assets, competition results, and homepage recommendation. Activities expose schedule, capacity, registration deadline, owner, registration fields, applicant drawer, cancellation state, and export affordance.

- [ ] **Step 5: Implement content list and homepage configuration**

Content covers flash news, announcements, help articles, and banners. Homepage configuration uses fixed slots with sortable Mock ordering and capacity limits instead of allowing arbitrary module deletion.

- [ ] **Step 6: Run tests and commit**

```bash
git add app/data/admin-content.ts app/components/admin/AdminRecordWorkspace.vue app/pages/admin/projects.vue app/pages/admin/activities.vue app/pages/admin/content app/assets/css/main.css tests
git commit -m "feat: add project activity and portal administration"
```

### Task 6: Media Library, Upload Queue, and Learning Resources

**Files:**
- Create: `app/data/admin-assets.ts`
- Create: `app/pages/admin/media.vue`
- Create: `app/pages/admin/resources.vue`
- Modify: `app/assets/css/main.css`
- Create: `tests/unit/admin-assets.test.ts`
- Modify: `tests/e2e/admin-platform.spec.ts`

**Interfaces:**
- Produces: `AdminAsset`, `AdminUploadTask`, `AdminLearningResource`, `ResourceVersion`
- Produces: `filterAdminAssets(assets, filters)`
- Produces: `canSelectAsset(asset): boolean`
- Produces: `getResourceAccessLabel(access)`

- [ ] **Step 1: Write failing asset eligibility and access tests**

```ts
expect(canSelectAsset({ processingStatus: "ready", reviewStatus: "approved" })).toBe(true);
expect(canSelectAsset({ processingStatus: "processing", reviewStatus: "pending" })).toBe(false);
expect(getResourceAccessLabel("center")).toBe("指定中心");
```

- [ ] **Step 2: Verify RED**

Run the new unit suite and media/resource route checks.

- [ ] **Step 3: Implement media library**

Use an image grid with list-density toggle, filters, batch-selection affordance, upload drawer, upload progress, processing/review states, usage locations, alt text, and recycle-bin confirmation.

- [ ] **Step 4: Implement learning resources**

Use a resource table and an editor containing basic information, file/version history, access scope, cover/preview, and publication settings. PDF preview, Office conversion, signed download, and virus scanning appear as honest future-service states.

- [ ] **Step 5: Run tests and commit**

```bash
git add app/data/admin-assets.ts app/pages/admin/media.vue app/pages/admin/resources.vue app/assets/css/main.css tests
git commit -m "feat: add media and learning resource administration"
```

### Task 7: Roles, Permissions, Audit Log, and Administration States

**Files:**
- Create: `app/data/admin-system.ts`
- Create: `app/pages/admin/roles.vue`
- Create: `app/pages/admin/logs.vue`
- Create: `app/pages/admin/forbidden.vue`
- Modify: `app/assets/css/main.css`
- Create: `tests/unit/admin-system.test.ts`
- Modify: `tests/e2e/admin-platform.spec.ts`

**Interfaces:**
- Produces: `AdminRole`, `PermissionMatrix`, `AdminAuditRecord`
- Produces: `getRolePermission(roleId, moduleId, action): boolean`
- Produces: `filterAuditRecords(records, filters)`

- [ ] **Step 1: Write failing permission tests**

Verify that the alliance lead has all prototype permissions, a center lead cannot edit another center’s assessment, and a media administrator cannot edit system permissions.

- [ ] **Step 2: Verify RED**

Run the system unit suite.

- [ ] **Step 3: Implement role matrix**

Allow role switching and demonstrate view/create/edit/review/publish/export permissions. Saving opens a confirmation with affected modules and users.

- [ ] **Step 4: Implement audit log and forbidden state**

Audit rows show actor, target, action, before/after summary, result, time, IP, and device. The forbidden page explains the missing permission and provides return/navigation actions.

- [ ] **Step 5: Run tests and commit**

```bash
git add app/data/admin-system.ts app/pages/admin/roles.vue app/pages/admin/logs.vue app/pages/admin/forbidden.vue app/assets/css/main.css tests
git commit -m "feat: add admin permissions and audit prototype"
```

### Task 8: Documentation, Full Verification, and Screenshot Delivery

**Files:**
- Modify: `README.md`
- Modify: `HSD需求文档.md`
- Modify: `init/AGENTS.md`
- Create: `artifacts/hsd-admin-dashboard-1440.png`
- Create: `artifacts/hsd-admin-pages-overview-1440.png`
- Create: representative page screenshots under `artifacts/admin/`

**Interfaces:**
- Consumes all administration routes and tests.
- Produces final documented prototype status and screenshot references.

- [ ] **Step 1: Update documentation**

Record the seven domains, routes, Mock boundary, upload architecture, role model, save/publish separation, and full-height sidebar correction.

- [ ] **Step 2: Run complete verification**

```bash
pnpm test
pnpm test:e2e
pnpm exec nuxi typecheck
pnpm build
git diff --check
```

Expected: all commands exit with status 0.

- [ ] **Step 3: Capture 1440px and 1366px screenshots**

Authenticate through the demo login, capture the dashboard, recruitment, members, media upload, resources, and permissions screens, and confirm the sidebar bottom is dark at every full-page length.

- [ ] **Step 4: Run GStack design review**

Review hierarchy, density, text contrast, state visibility, interaction consistency, and overflow. Apply only findings that preserve the confirmed administration information architecture.

- [ ] **Step 5: Re-run affected tests and commit**

```bash
git add README.md HSD需求文档.md init/AGENTS.md artifacts app tests
git commit -m "feat: finalize HSD administration prototype"
```
