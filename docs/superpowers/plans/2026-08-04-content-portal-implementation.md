# HSD 内容与门户发布实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“内容与门户”从静态原型改造成可保存、审核、发布、下架并同步用户端公开投影的前端 Mock 实现，同时保留明确的后端自动化交接边界。

**Architecture:** 业务领域继续维护项目、活动、招新批次、成员、画廊和资源事实；官网内容 Store 维护新闻、公告和 HSD 快讯的工作版本与已发布版本；门户配置 Store 只保存业务引用、排序和预定义主视觉。用户端只读 `usePublishedPortal` 投影，业务事件通过独立 automation Mock 生成快讯草稿，生产后端契约不由前端替代。

**Tech Stack:** Nuxt 4.5.1, Vue 3, Pinia 4, TypeScript, Vitest, Playwright, schema-versioned localStorage Mock.

## Global Constraints

- 状态链路固定为 `草稿 -> 待审核 -> 待发布 -> 已发布 -> 已下架`，不得跳过审核直接发布。
- 普通管理员可以创建、编辑、保存、预览、提交审核；只有 `owner` 可以退回、审核通过、发布、下架和发布门户配置。
- 用户端只能读取最近一次已发布版本；工作版本、拒绝原因和审计记录不得进入公开投影。
- HSD 快讯业务事件只创建草稿；事件为 `recruitment.batch.opened` 和 `activity.registration.opened`，幂等键为 `sourceDomain + sourceId + eventType + sourceVersion`。
- 本阶段不接入微信公众号、文章抓取/迁移或大模型；仅保留 `originType`、`originUrl`、`externalId` 等可选字段，不展示同步入口。
- 帮助中心功能开关固定为 `helpCenter: false`，旧路由重定向并只显示一次“当前版本暂未开放”。登录页显示联系联盟总负责人的说明。
- 门户发布是整份原子发布；失效引用按同推荐位、同内容类型、最新且未占用的已发布候选自动补位，不修改管理员草稿。
- 所有持久化 Mock 数据带 schema 版本并容忍 localStorage 不可用；失败时保留草稿并显示可执行原因。
- 禁止继续把 `AdminRecordWorkspace` 当作官网内容的领域编辑器；内容编辑使用独立完整工作页。

---

### Task 1: 内容领域模型、版本化 Store、公开目录和自动化 Mock

**Files:**
- Create: `app/types/portal-content.ts`, `app/types/portal-config.ts`
- Create: `app/stores/portal-content.ts`, `app/stores/portal-config.ts`
- Create: `app/composables/usePortalCatalog.ts`, `app/composables/usePublishedPortal.ts`
- Create: `app/services/portal-automation.mock.ts`
- Modify: `app/stores/recruitment-batch.ts`, `app/stores/activities.ts` or the current activity owner store, and their successful open/registration actions
- Create: `tests/unit/portal-content.test.ts`, `tests/unit/portal-config.test.ts`, `tests/unit/portal-automation.test.ts`

**Interfaces:**
- `PortalContentRecord` exposes `id`, `kind`, `slug`, `title`, `summary`, `target`, `status`, `revision`, `blocks`, `originType`, `sourceValidity`, timestamps, and audit metadata.
- `usePortalContentStore()` exposes `createDraft`, `updateDraft`, `submitForReview`, `returnToDraft`, `approve`, `publish`, `unpublish`, `getPublicById`, and `retryAutomationDraft`.
- `usePortalConfigStore()` exposes draft and published configs plus `saveDraft`, `preview`, and atomic `publish`.
- `usePortalCatalog()` returns `PortalCatalogItem[]` from published content and read-only adapters for existing public project/activity/gallery/resource fixtures.
- `usePublishedPortal()` resolves public homepage slots and applies the documented fallback without mutating config.
- `PortalAutomationServiceMock.createFromEvent(event)` returns `{ status: "created" | "duplicate" | "failed", contentId?: string, errorCode?: string }`.

- [ ] Write tests for state transitions, revision isolation, permission errors, persistence fallback, duplicate automation events, and same-slot fallback.
- [ ] Run `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/portal-content.test.ts tests/unit/portal-config.test.ts tests/unit/portal-automation.test.ts` and verify the new tests fail for missing APIs.
- [ ] Implement the smallest typed stores and pure projection helpers; seed existing flash/news/notice records as published revisions and use a schema-versioned localStorage adapter.
- [ ] Add event hooks only after a batch/activity command succeeds; never generate from page mount, getters, queries, or `/join` visits.
- [ ] Re-run the focused tests, then run the existing unit suite and commit `feat: add portal content and publication stores`.

### Task 2: Disable Help Center and clean navigation/routing/copy

**Files:**
- Modify: `app/config/release-features.ts`, `app/data/admin-platform.ts`, `app/data/site.ts`, `app/middleware/release-features.global.ts`, `app/utils/admin-release-access.ts`
- Modify: `app/components/SiteFooter.vue`, `app/pages/index.vue`, `app/pages/join.vue`, `app/pages/login.vue`
- Modify: `app/pages/help.vue`, `app/pages/admin/content/help.vue`
- Create/modify: `tests/unit/admin-release-features.test.ts`, `tests/unit/login-page-copy.test.ts`, `tests/e2e/footer.spec.ts`, `tests/e2e/home.spec.ts`

**Interfaces:** `resolveDisabledRoute` must map `/help` to `/`; `/admin/content/help` to `/admin/content`; the feature flag controls both navigation entries and route behavior.

- [ ] Add failing unit assertions for `helpCenter: false`, no Help navigation/link, and the exact owner-contact copy on login.
- [ ] Run the focused tests and confirm failure.
- [ ] Implement centralized flag filtering, one-time `notice` query handling, remove all Help links, rename the user nav label to `动态与活动`, and replace the login help link with the specified text.
- [ ] Verify desktop/mobile footer and route redirects with focused unit/E2E tests and commit `feat: disable help center and update portal navigation`.

### Task 3: Rebuild admin official-content workflow

**Files:**
- Create: `app/pages/admin/content/new.vue`, `app/pages/admin/content/[id].vue`, `app/pages/admin/content/[id]/preview.vue`
- Modify: `app/pages/admin/content/index.vue`, `app/components/admin/AdminRecordWorkspace.vue` only for shared visual primitives, `app/data/admin-content.ts`, `app/pages/admin/index.vue`
- Create/modify: `tests/unit/admin-content.test.ts`, `tests/e2e/admin-platform.spec.ts`

**Interfaces:** Forms call the Store commands from Task 1; route query `?create=flash|article|notice` opens the corresponding new form; statuses displayed are `草稿/待审核/待发布/已发布/已下架`.

- [ ] Add tests for create/save/refresh persistence, invalid transitions, ordinary-admin permission denial, owner review/publish/unpublish, and dashboard counts.
- [ ] Run tests to establish red state.
- [ ] Replace the dead top-level button and generic editor with a real list plus dedicated new/edit/preview pages. Use structured blocks (`heading`, `paragraph`, `image`) and retain unsaved drafts on validation/storage errors.
- [ ] Wire dashboard filters and quick-create links to the content Store; remove Help records from the active content categories.
- [ ] Run focused unit/E2E tests and commit `feat: implement official content workflow`.

### Task 4: User-facing published projection and 动态与活动

**Files:**
- Modify: `app/pages/index.vue`, `app/pages/activities/index.vue`, `app/pages/activities/[slug].vue`, `app/data/site.ts`
- Create: `app/pages/updates/[slug].vue`
- Modify: `app/data/activities.ts` only to expose adapter-compatible public fields; remove direct admin fixture imports.
- Create/modify: `tests/unit/content-details.test.ts`, `tests/unit/home-content.test.ts`, `tests/e2e/content-details.spec.ts`, `tests/e2e/home.spec.ts`

**Interfaces:** `/activities` accepts `view=all|activities|articles|notices`; `/updates/:slug` resolves published article/notice only; `usePublishedPortal` supplies homepage flash/news/slots.

- [ ] Add tests for all four views, descending public time order, hidden drafts/unpublished content, stable activity detail links, and update details.
- [ ] Run focused tests and confirm red state.
- [ ] Replace static homepage reads with the published projection; implement tabs and aggregate cards while preserving `/activities/:slug` for activities and using `/updates/:slug` for article/notice.
- [ ] Ensure expired/unavailable sources are excluded and empty states are explicit.
- [ ] Run focused unit/E2E tests and commit `feat: connect published portal projection to public pages`.

### Task 5: Portal configuration, visuals, atomic publication and fallback UI

**Files:**
- Modify: `app/pages/admin/content/home.vue`, `app/pages/admin/content/banners.vue`
- Modify: `app/components/PageBanner.vue`, `app/data/admin-content.ts`, `app/assets/css/main.css`
- Create/modify: `tests/unit/portal-config.test.ts`, `tests/e2e/admin-platform.spec.ts`, `tests/e2e/home.spec.ts`

**Interfaces:** `/admin/content/home?view=visuals` is the merged visual view; `/admin/content/banners` redirects there. Slot capacities are flash 1, news 3, projects 4, activities 3, gallery 1, resources 3.

- [ ] Add tests for replacing/removing/reordering references, duplicate and invalid-reference rejection, draft preview isolation, owner-only atomic publication, and same-type fallback with no-candidate empty state.
- [ ] Run focused tests to confirm red state.
- [ ] Implement slot selectors against `usePortalCatalog`, keyboard-accessible ordering controls, preview against draft config, owner confirmation for full publication, and predefined home/join visual slots. CTA availability remains controlled by recruitment batch state.
- [ ] Make Banner route redirect to the visual tab and remove its disconnected local array.
- [ ] Run focused tests and commit `feat: implement portal configuration publication`.

### Task 6: Migration cleanup, responsive/a11y verification, and full validation

**Files:**
- Modify/remove: remaining direct reads of `app/data/home.ts` and admin-only content fixtures once adapters are live; preserve only seed data consumed by stores.
- Modify: `tests/e2e/*.spec.ts` only where current approved copy/routes changed.
- Create: `.superpowers/sdd/progress.md` ledger entries during execution (ignored scratch file).

- [ ] Run `rg` to prove public pages no longer read admin content fixtures or static homepage arrays directly.
- [ ] Run `sh scripts/with-hsd-node.sh corepack pnpm run test:unit`.
- [ ] Run `sh scripts/with-hsd-node.sh corepack pnpm run typecheck`.
- [ ] Run `sh scripts/with-hsd-node.sh corepack pnpm run build`.
- [ ] Run `NUXT_TELEMETRY_DISABLED=1 sh scripts/with-hsd-node.sh corepack pnpm run test:e2e`; record any Chrome `SIGABRT` or bundled Chromium/EMFILE environment failure separately from product failures.
- [ ] Verify 1440px, 390px, keyboard navigation, route redirects, owner/ordinary-admin permissions, and public projection behavior with fresh evidence before claiming completion.
- [ ] Commit only scoped implementation changes and report the backend requirement document as still `BACKEND_REQUIRED`.

## Self-review

- Spec coverage: Tasks 1-2 cover data boundaries, identity, automation, Help Center and routing; Tasks 3-5 cover admin workflow, public projection, portal configuration and fallback; Task 6 covers migration, responsive/a11y and all validation criteria.
- Placeholder scan: each task names concrete files, commands, states and expected behavior, with no unresolved implementation placeholders.
- Type consistency: all later tasks consume the named Store/composable boundaries from Task 1 and preserve the existing recruitment/activity owner stores.
