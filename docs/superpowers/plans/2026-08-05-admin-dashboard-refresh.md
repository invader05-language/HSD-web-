# Admin Dashboard Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“管理工作台”改造成基于业务状态的只读运营投影，按权限展示招新、内容、门户和媒体事项，并以 Mock/API 双 Gateway 为后端接入边界。

**Architecture:** `AdminDashboardSnapshot` 是唯一前端展示契约；`MockDashboardGateway` 从现有 Pinia stores 组合快照，`ApiDashboardGateway` 只负责调用未来的 `GET /api/admin/dashboard`，不复制业务状态机。页面只消费快照和语义化 `DashboardTarget`，通过统一路由映射进入业务模块；API 失败显示错误态，不静默回退 Mock。

**Tech Stack:** Nuxt 4, Vue 3 Composition API, Pinia, TypeScript strict, Vitest, Playwright, existing admin CSS.

## Global Constraints

- 工作必须在 `codex/admin-dashboard-refresh` 隔离工作树完成，根工作树和其他 worktree 不得修改。
- 不实现后端、数据库、真实认证或持久化；API Gateway 只提供可编译的未来接入边界。
- `GET /api/admin/dashboard` 的权限、指标、当前批次选择必须由后端最终裁决；前端 Mock 不得被当作生产权限依据。
- Snapshot `schemaVersion` 固定为 `1`，时间使用 ISO UTC，展示时区固定为 `Asia/Shanghai`。
- 当前操作批次选择顺序固定为：开放/暂停批次，其次有未完成考核或结果发布事项的已结束批次，其次最近的下一批次，最后为空。
- 所有跳转使用语义化 `DashboardTarget`，禁止 Gateway 直接返回任意 URL。
- 工作台不再展示虚构的容量配额；媒体区只展示素材处理状态和异常数量。
- 快捷新建只保留已有可用目的地：HSD 快讯、新闻、公告、成员；删除无实现的项目、活动、媒体、资料直达命令。
- 角色能力至少覆盖：`recruitment.batch.manage`、`recruitment.assessment.edit`、`recruitment.result.publish`、`content.create`、`content.review`、`content.publish`、`portal.configure`、`portal.publish`、`member.create`。
- 关键状态、权限、批次选择和路由必须有单元测试；页面必须保留桌面和 390px 移动端可用布局。

---

### Task 1: Dashboard contract and dual Gateway

**Files:**
- Create: `app/types/admin-dashboard.ts`
- Create: `app/utils/admin-dashboard-routes.ts`
- Create: `app/services/admin-dashboard/dashboard-gateway.ts`
- Create: `app/services/admin-dashboard/mock-dashboard.gateway.ts`
- Create: `app/services/admin-dashboard/api-dashboard.gateway.ts`
- Create: `app/composables/useAdminDashboard.ts`
- Create: `tests/unit/admin-dashboard.test.ts`
- Modify: `nuxt.config.ts` only if a public `adminDashboardApiBase` runtime option is needed.

**Interfaces:**
- `DashboardTarget` has `module: "recruitment" | "content" | "portal" | "media" | "member"`, `action: string`, optional `resourceType` and `resourceId`.
- `AdminDashboardSnapshot` has `schemaVersion`, `generatedAt`, `timezone`, `operator`, `metrics`, `tasks`, `recruitment`, `content`, `portal`, `media`, and `warnings`.
- `AdminDashboardGateway` exposes `getSnapshot(options?: { now?: Date }): Promise<AdminDashboardSnapshot>`.
- `useAdminDashboard(options?: { gateway?: AdminDashboardGateway })` exposes `snapshot`, `loading`, `error`, and `refresh`.

- [ ] **Step 1: Write failing tests** for target-to-route mapping, capability filtering, current batch selection order, warning aggregation, API response validation, and API failure propagation.
- [ ] **Step 2: Run the focused test** with `env PATH=/Users/AnpointWork/HSDweb/node_modules/.bin:$PATH /Users/AnpointWork/HSDweb/node_modules/.bin/vitest run tests/unit/admin-dashboard.test.ts`; it must fail before implementation.
- [ ] **Step 3: Implement the types, semantic route mapper, Mock Gateway store projection, API Gateway validator, and composable.** Mock reads existing session, recruitment batch/assessment/application, portal content/config, admin assets, and activity stores without creating a second source of truth. API Gateway accepts an injected fetcher for tests and never falls back to Mock on errors.
- [ ] **Step 4: Re-run the focused tests**, then run the existing admin platform unit tests to catch contract regressions.

### Task 2: Approved prototype UI and responsive workbench

**Files:**
- Modify: `app/pages/admin/index.vue`
- Modify: `app/assets/css/main.css` in the existing admin dashboard section.
- Modify: `tests/e2e/admin-platform.spec.ts` to assert the new operational sections and remove fake storage assertions.
- Modify: `tests/unit/admin-platform.test.ts` for navigation and quick-action expectations.

**Interfaces:**
- Consumes `useAdminDashboard()` and the contract from Task 1; the page must not read `ADMIN_TODOS`, static recruitment progress, or static storage capacity directly.
- Uses `dashboardTargetToRoute(target)` for every `NuxtLink` destination.

- [ ] **Step 1: Update tests** to require the approved prototype hierarchy: operator/header, warning strip only when warnings exist, four actionable metrics, priority queue, current recruitment batch context, content activity, portal state, and media health.
- [ ] **Step 2: Run focused unit/E2E tests** and record the expected failures from the old static page.
- [ ] **Step 3: Replace the page template** with snapshot-driven sections, capability-aware quick actions, an explicit loading/error/empty state, and semantic targets. The current batch must show its batch id/name/status and link to batch-aware assessment or publication routes.
- [ ] **Step 4: Refine existing admin CSS** for the approved dark-sidebar/red-accent visual language, stable metric/card dimensions, grid-to-single-column behavior at 390px, and no fake storage quota.
- [ ] **Step 5: Run focused tests and inspect the page at desktop and mobile viewports** when the local server is available.

### Task 3: Backend contract and AI handoff

**Files:**
- Create: `docs/contracts/admin-dashboard.openapi.yaml`
- Create: `docs/contracts/admin-dashboard-field-sources.md`
- Create: `docs/contracts/examples/admin-dashboard-owner.json`
- Create: `docs/contracts/examples/admin-dashboard-center-admin.json`
- Create: `docs/handoffs/2026-08-05-admin-dashboard-backend.md`

- [ ] **Step 1: Document the `GET /api/admin/dashboard` response** with exact enums, ISO UTC date rules, `Asia/Shanghai` display timezone, semantic targets, capabilities, warning codes, and nullable recruitment context.
- [ ] **Step 2: Document field ownership** for metrics, task queue, current-batch selection, content/portal/media summaries, permission scope, PII restrictions, and transactional consistency.
- [ ] **Step 3: Add owner and center-admin examples** that demonstrate global versus center-scoped capabilities and resource ids.
- [ ] **Step 4: Add a handoff** explaining that the backend must not trust a client account id, return arbitrary URLs, duplicate the recruitment state machine, or silently substitute Mock data when the API is unavailable.

### Task 4: Verification and integration review

**Files:**
- Modify only files required by failing tests or type errors from Tasks 1-3.

- [ ] **Step 1: Run focused unit tests and the full unit suite.** Existing baseline failure `recruitment-batch-rules.test.ts` must be distinguished from regressions.
- [ ] **Step 2: Run `nuxt typecheck` and `nuxt build` using the available HSD Node wrapper or the documented system-runtime fallback if Node 22.19.0 is unavailable.**
- [ ] **Step 3: Run the admin Playwright suite; if Chrome `SIGABRT` or Nuxt `EMFILE` recurs, preserve the exact command and error as an environment limitation rather than claiming pass.
- [ ] **Step 4: Review the final diff for scope, privacy, capability leaks, route correctness, desktop/mobile overlap, and backend handoff completeness. Do not commit or push without explicit authorization.
