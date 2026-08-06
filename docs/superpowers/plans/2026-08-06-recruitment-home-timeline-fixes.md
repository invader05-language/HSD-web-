# 招新考核与门户时间线优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让开放中的招新批次可以录入已有候选人考核结果，同时恢复首页与“动态与活动”的公开内容联动并修复活动日期布局。

**Architecture:** 保留考核 Store 的候选人命令与批次命令边界，只把报名状态门禁从候选人写入中移除，并把 `closed` 门禁放到轮次推进和整批发布。门户继续通过 `usePublishedPortal` 读取统一目录，增加空槽运行时回退和活动 `eventAt` 语义字段；页面只消费投影，不写回配置。

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Pinia, Vitest, Playwright, CSS Grid。

## Global Constraints

- 本项目产品名称统一为“白云HSD开发者部落”，遵守 `init/AGENTS.md` 的首页顺序、快讯保留和响应式基线。
- 不新增后端、数据库、真实认证或持久化实现；Mock 字段和错误码必须可直接交接后端。
- 本次不运行本地单测、类型检查、生产构建或本地 E2E；仅更新回归用例并由 CI 验证。
- 不修改 `main`，所有改动留在 `codex/recruitment-home-timeline-fixes`。

---

### Task 1: 考核开放批次写入与批次级门禁

**Files:**
- Modify: `app/stores/recruitment-assessment.ts:405-570`
- Modify: `app/components/admin/RecruitmentAssessmentWorkbench.vue:22-336`
- Modify: `app/components/admin/RecruitmentPublicationWorkbench.vue:1-84`
- Test: `tests/unit/recruitment-assessment.test.ts`
- Test: `tests/e2e/recruitment-batch-context.spec.ts`

**Interfaces:**
- `saveRoundOutcome(input)` and `recordAdjustmentDecision(input)` accept effective batch status `open | paused | closed`.
- `advanceAssessmentRound(batchId, confirmed, now, reason?)` and `publishBatchResults(batchId, confirmed, now, reason?)` call a shared closed-only assertion.
- UI exposes `effectiveBatchStatus` copy and keeps save errors inside the drawer.

- [ ] **Step 1: Update unit tests first**

Replace the old “open or paused writes are rejected” case with assertions that an owner can save a first-round result while the batch is open, can save an adjustment decision while paused, and still receives `ASSESSMENT_BATCH_NOT_CLOSED` when trying to advance or publish. Keep existing draft/archived read-only assertions.

- [ ] **Step 2: Implement the Store gate split**

Make `assertAssessmentWritable` call only `assertCurrentBatch`. Add `assertAssessmentBatchClosed` that reads `getEffectiveRecruitmentBatchStatus(...).status` and throws `ASSESSMENT_BATCH_NOT_CLOSED` unless it is `closed`. Call the new assertion at the beginning of `advanceAssessmentRound` and `publishBatchResults`; leave candidate save and adjustment commands on the writable assertion.

- [ ] **Step 3: Make the assessment UI communicate both states**

Import `getEffectiveRecruitmentBatchStatus`, derive the current effective status, show a status notice below the heading, disable the global advance button while the status is not `closed`, and keep candidate round selects enabled for authorized current-round candidates in `open`, `paused`, and `closed` states.

- [ ] **Step 4: Surface save errors in the drawer and publication gate in its page**

Render `saveError` with `role="alert"` in the drawer body. Add the effective batch status to the publication workbench and disable its publish action when not closed, with copy that distinguishes “可录入已有候选人” from “关闭后才能整批发布”.

- [ ] **Step 5: Update CI regression flows**

Remove the forced-close prerequisite from the candidate save scenario, add an assertion that open-batch save persists after reopening, and add a closed-state step before global round advancement. Keep the adjustment decision test as two independent saves.

- [ ] **Step 6: Commit the assessment slice**

```bash
git add app/stores/recruitment-assessment.ts app/components/admin/RecruitmentAssessmentWorkbench.vue app/components/admin/RecruitmentPublicationWorkbench.vue tests/unit/recruitment-assessment.test.ts tests/e2e/recruitment-batch-context.spec.ts
git commit -m "fix: allow assessment writes before batch close"
```

### Task 2: Homepage projection fallback and public copy

**Files:**
- Modify: `app/composables/usePublishedPortal.ts:10-98`
- Modify: `app/pages/index.vue:26-140`
- Modify: `app/pages/admin/content/home.vue:211-215`
- Test: `tests/unit/portal-config.test.ts`
- Test: `tests/unit/home-content.test.ts`
- Test: `tests/e2e/home.spec.ts`

**Interfaces:**
- `resolveHomepageProjection` returns the same `HomepageProjection` shape and adds `automatic-fallback` warnings when an empty `flash` or `news` slot is populated at runtime.
- `flash` auto-fallback is one latest valid flash; `news` auto-fallback is up to three latest valid article/notice items.

- [ ] **Step 1: Add projection tests first**

Add a unit case with empty `flash` and `news` configuration and a mixed catalog, asserting only flash items enter `flash`, only article/notice enter `news`, latest order is used, and warnings use `automatic-fallback`. Update the stale-reference case to assert same-type manual fallback remains unchanged.

- [ ] **Step 2: Implement empty-slot runtime fallback**

Keep existing manual-reference resolution. After configured references are processed for `flash` and `news`, fill remaining capacity only when the configured reference list is empty, using the allowed entity types and `available` flag. Mark each automatic item with `fallbackFor: "automatic"` and emit an `automatic-fallback` warning without mutating `PortalConfig`.

- [ ] **Step 3: Adjust public empty-state copy and admin warning copy**

Change the flash empty copy to one inline `HSD 快讯 · 暂无新消息`. Keep the black band and its heading. Keep the news section structure; when no article/notice exists, use visitor-facing copy “当前暂无动态，近期内容将在此更新”. Add a dedicated admin warning sentence for automatic fallback.

- [ ] **Step 4: Update regression assertions**

Change `tests/e2e/home.spec.ts` to expect seeded published flash/news content and retain no technical empty-state wording. Extend `tests/unit/home-content.test.ts` to assert the homepage still reads `usePublishedPortal` and uses the new visitor copy.

- [ ] **Step 5: Commit the portal slice**

```bash
git add app/composables/usePublishedPortal.ts app/pages/index.vue app/pages/admin/content/home.vue tests/unit/portal-config.test.ts tests/unit/home-content.test.ts tests/e2e/home.spec.ts
git commit -m "fix: link homepage updates to published portal fallback"
```

### Task 3: Activity event date and responsive timeline

**Files:**
- Modify: `app/types/portal-content.ts:80-100`
- Modify: `app/composables/usePortalCatalog.ts:28-43`
- Modify: `app/pages/activities/index.vue:15-72`
- Modify: `app/pages/index.vue:38-43,222-227`
- Modify: `app/assets/css/main.css:2019-2056,4663-4672,5062-5072`
- Test: `tests/unit/portal-config.test.ts` or a focused new catalog test
- Test: `tests/e2e/content-details.spec.ts`

**Interfaces:**
- `PortalCatalogItem.eventAt?: string` is set for activity records and absent for content records.
- Timeline date helper returns `eventAt` for activities and `publishedAt` for article/notice records.

- [ ] **Step 1: Add semantic date regression assertions**

Assert an activity catalog item exposes `eventAt` from its activity date and that news/notice items still use `publishedAt`. Add a Playwright assertion that the activity timeline contains the full date as one non-wrapping date element.

- [ ] **Step 2: Implement eventAt mapping and timeline ordering**

Add optional `eventAt`, map `activity.date` to an ISO timestamp, and use a local `timelineDate` helper in `/activities` for both sorting and `<time datetime>`. Use the same field for homepage recent activity day/month rendering.

- [ ] **Step 3: Replace the fixed date grid track**

Use `grid-template-columns: minmax(210px, 230px) minmax(0, 1fr) max-content`, `white-space: nowrap`, and `min-width: 0` for desktop. At tablet width move the action to a second grid row; at phone width keep the single-column stack. Preserve the existing content hierarchy and touch target sizes.

- [ ] **Step 4: Commit the activity slice**

```bash
git add app/types/portal-content.ts app/composables/usePortalCatalog.ts app/pages/activities/index.vue app/pages/index.vue app/assets/css/main.css tests/unit/portal-config.test.ts tests/e2e/content-details.spec.ts
git commit -m "fix: keep activity dates readable across portal layouts"
```

### Task 4: Static verification and handoff

**Files:**
- Modify: `docs/superpowers/specs/2026-08-06-recruitment-home-timeline-fixes-design.md`
- Modify: `docs/superpowers/plans/2026-08-06-recruitment-home-timeline-fixes.md`
- Modify: `HSD需求文档.md`
- Modify: `README.md`

- [ ] **Step 1: Update project handoff documentation**

Record the open/paused assessment policy, closed-only global commands, runtime homepage fallback, `eventAt` semantics, and the deferred local test policy in the requirements and route handoff sections.

- [ ] **Step 2: Run static checks only**

Run `git diff --check`, inspect all changed files, search for stale `ASSESSMENT_BATCH_NOT_CLOSED` assumptions and old homepage empty copy, and verify no `.pnpm-store` or generated output is staged. Do not run local unit tests, typecheck, build, or Playwright in this task.

- [ ] **Step 3: Commit docs and final handoff**

```bash
git add docs/superpowers/specs/2026-08-06-recruitment-home-timeline-fixes-design.md docs/superpowers/plans/2026-08-06-recruitment-home-timeline-fixes.md HSD需求文档.md README.md
git commit -m "docs: record recruitment and homepage projection boundaries"
```
