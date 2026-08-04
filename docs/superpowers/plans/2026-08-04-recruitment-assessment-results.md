# 招新考核与结果发布重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将预备成员考核和结果发布绑定到当前招新批次，用全局考核轮次驱动各中心的可编辑状态，并把保存、发布和成员投影联动做成可验证的前端 Mock。

**Architecture:** `RecruitmentBatch` 仍是根实体；新增 assessment domain/store 保存每个批次的全局轮次、候选人轮次结果、最终内部结论和发布状态。页面只通过 Store selector/action 读写，发布采用整批原子 Mock 操作，并复用现有成员档案与成员管理投影。

**Tech Stack:** Nuxt 4, Vue 3, Pinia, TypeScript, Vitest, Playwright.

## Global Constraints

- 同一批次只允许一个全局当前考核轮次，轮次只为第一轮、第二轮、第三轮。
- 白泽开发中心执行三轮；其他中心只执行第一轮，不能在管理端出现第二轮或第三轮控件。
- 只有当前全局轮次且前置轮次通过的候选人可编辑；全局轮次推进后上一轮锁定。
- 保存内部结果不等于发布，不得直接让成员端看到结果或改变身份。
- 结果发布按当前 `batchId` 整批处理，不能跨批次选择；存在未完成或线下调剂待录入时禁止发布。
- 预备成员转正式成员只能复用既有账号和档案；Mock 失败时状态整体回滚。
- 保留 `.tools`、`node_modules` 和其他无关未跟踪路径；不实现后端、数据库或真实认证。

---

### Task 1: 考核类型、轮次规则与适配器

**Files:**
- Create: `app/types/recruitment-assessment.ts`
- Create: `app/utils/recruitment-assessment-rules.ts`
- Modify: `app/data/recruitment-admin.ts`
- Create: `tests/unit/recruitment-assessment-rules.test.ts`

**Interfaces:**
- `AssessmentRoundNumber = 1 | 2 | 3`
- `AssessmentOutcome = "pending" | "passed" | "failed"`
- `getAssessmentRounds(center): AssessmentRoundNumber[]`
- `getCurrentAssessmentRound(record, globalRound): AssessmentRoundNumber | undefined`
- `isAssessmentRoundEditable(record, round, globalRound): boolean`
- `getAssessmentProcessingStatus(record): AssessmentProcessingStatus`
- 静态 `AdminCandidate` 通过 `batchId` 和 `memberId` 适配到当前批次考核记录；旧字段保留兼容现有报名页测试。

- [x] 写红灯测试：普通中心仅一轮；白泽三轮；全局轮次锁定前置轮次；未通过与调剂状态；完成记录不能编辑。
- [x] 运行 `pnpm exec vitest run tests/unit/recruitment-assessment-rules.test.ts` 并确认失败源于缺失领域函数。
- [x] 实现最小类型、规则和静态数据适配。
- [x] 重新运行聚焦测试并保持现有 recruitment admin 单测通过。

### Task 2: 考核 Store 与保存/推进命令

**Files:**
- Create: `app/stores/recruitment-assessment.ts`
- Create: `tests/unit/recruitment-assessment.test.ts`

**Interfaces:**
- `useRecruitmentAssessmentStore.currentRound(batchId)`
- `useRecruitmentAssessmentStore.getCandidates(batchId)`
- `saveRoundOutcome({ batchId, candidateId, round, outcome, internalNote, now })`
- `advanceAssessmentRound(batchId, confirmed, now, reason)`
- `recordAdjustmentDecision({ batchId, candidateId, finalCenter, admitted, now })`
- `getPublicationSummary(batchId)`
- `publishBatchResults(batchId, confirmed, now, reason)`

- [x] 写红灯测试：保存通过推进白泽下一轮、保存未通过分别进入调剂待录入或未录取、保存不会发布、非当前轮次拒绝、owner-only 推进、整批发布前置条件。
- [x] 运行聚焦测试确认红灯。
- [x] 实现 Pinia Store、批次版本校验、LocalStorage Mock 持久化和错误码。
- [x] 让发布调用现有 `member-administration`，复用账号并同步正式成员投影；失败回滚。
- [x] 运行 Store 与既有 unit suite。

### Task 3: 管理端考核台与结果发布页面

**Files:**
- Modify: `app/pages/admin/recruitment/index.vue`
- Modify: `app/pages/admin/recruitment/batches/[batchId]/assessment.vue`
- Modify: `app/pages/admin/recruitment/publish.vue`
- Modify: `app/pages/admin/recruitment/batches/[batchId]/publish.vue`
- Modify: `app/pages/member/results.vue`
- Modify: `app/data/member-results.ts`
- Modify: `tests/e2e/recruitment-admin.spec.ts`
- Modify: `tests/e2e/recruitment-batch-context.spec.ts`

**Interfaces:**
- 页面顶部显示批次名称、`batchId`、全局当前轮次和推进/发布状态。
- 当前阶段筛选只展示“第一轮考核、第二轮考核、第三轮考核”；处理状态单独展示。
- 轮次控件使用 `v-model` 草稿，保存按钮调用 Store action；取消恢复打开时快照。
- 结果发布页面按当前批次整批复核，确认按钮调用 Store action 并显示成功/失败原因。
- 成员结果中心只读取已发布的 assessment projection。

- [x] 先更新 E2E 断言覆盖批次上下文、普通中心仅一轮、白泽全局轮次锁定、保存后列表更新、发布后成员结果中心更新。
- [x] 运行聚焦 E2E，确认旧页面行为红灯。
- [x] 接入 Store selectors/actions，移除页面本地候选人副本和 `published = true` 占位状态。
- [x] 保持抽屉、筛选、键盘关闭、响应式结构和 Mock 边界文案。
- [ ] 运行 E2E 与必要的视觉视口检查（Playwright 可发现 69 个用例，但本机 Chrome 启动即 SIGABRT）。

### Task 4: 全量验证与审查

**Files:**
- Modify only files required by failing verification.

- [x] 搜索并移除考核页中遗留的 `ADMIN_CANDIDATES` 直接写入、`:value` 只读轮次控件、硬编码 `CURRENT`/旧批次阶段。
- [x] `pnpm run test:unit`
- [x] `pnpm run typecheck`
- [x] `pnpm run build`
- [ ] `NUXT_TELEMETRY_DISABLED=1 pnpm run test:e2e`（Chrome 启动即 SIGABRT，无法进入断言）。
- [x] 复查批次隔离、身份边界、保存与发布错误回滚，记录无法运行的浏览器验证。
