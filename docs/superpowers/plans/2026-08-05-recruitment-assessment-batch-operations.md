# 招新批次与预备成员考核操作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. This plan was executed in the isolated worktree `codex/recruitment-assessment-batch-ops`.

**Goal:** 完成招新批次创建、考核活动队列、结果锁定和批次生命周期的可操作 Mock 链路。

**Architecture:** Pinia store 负责批次、报名和考核状态机；工作台只投影可操作记录，发布页保留全量投影。批次状态、审计、自动化失败和考核发布锁写入版本化 `localStorage`，真实后端按规格中的命令契约替换。

**Tech Stack:** Nuxt 4.5、Vue 3、Pinia 4、TypeScript 5.9、Vitest、Playwright。

## Global Constraints

- 所有报名必须包含 `batchId`；没有开放批次不产生预报名。
- 只有联盟总负责人可以创建或变更批次生命周期。
- 结果发布要求批次有效状态为 `closed`。
- 首次考核结果保存必须锁定对应成员报名。
- 普通中心调剂只能选择普通中心或 `not-admitted`，不能选择白泽。
- 本阶段不接入微信公众号接口、文章抓取、迁移或大模型摘要。

---

### Task 1: 考核队列与报名锁定

**Files:**
- Modify: `app/stores/recruitment-assessment.ts`
- Modify: `app/stores/recruitment-application.ts`
- Test: `tests/unit/recruitment-assessment.test.ts`

- [x] 新增 `getActionableCandidates(batchId)`，过滤已完成结果并保留待调剂记录。
- [x] `advanceAssessmentRound` 同时检查当前轮结果和待调剂决定。
- [x] `saveRoundOutcome` 首次写入结果时调用 `lockApplicationForAssessment`。
- [x] `reconcileApplications` 不覆盖已有考核记录的中心和调剂意愿。
- [x] 发布前检查批次有效状态为 `closed`。
- [x] 通过考核/批次领域测试（当前全量单元测试 320/320）。

### Task 2: 调剂联合选择与工作台交互

**Files:**
- Modify: `app/components/admin/RecruitmentAssessmentWorkbench.vue`
- Modify: `tests/e2e/recruitment-admin.spec.ts`
- Modify: `tests/e2e/recruitment-batch-context.spec.ts`

- [x] 将“线下决定”和“最终中心”合并为一个 `最终调剂结果` select。
- [x] 保存成功后关闭抽屉；处理完成记录从工作台列表移除。
- [x] 保留白泽通过下一轮回显，移除发布/已完成筛选项。
- [x] 更新调剂、抽屉关闭和行隐藏的 E2E 断言。

### Task 3: 批次创建、权限和持久化

**Files:**
- Modify: `app/types/recruitment-batch.ts`
- Modify: `app/stores/recruitment-batch.ts`
- Modify: `app/pages/admin/recruitment/batches/index.vue`
- Modify: `tests/unit/recruitment-batch-rules.test.ts`

- [x] 只允许联盟总负责人 `createBatch`，创建草稿并固定负责人。
- [x] 去掉报名表/负责人配置前置条件，统一用户端报名表。
- [x] 持久化批次、生命周期审计、自动化失败和考核发布锁。
- [x] 已发布结果批次禁止重新开放。
- [x] 日期型截止日转换到当天 `23:59:59.999`。
- [x] 普通管理员隐藏新建入口，负责人创建后草稿出现在列表。

### Task 4: 样式与验证

**Files:**
- Modify: `app/assets/css/main.css`
- Modify: `tests/unit/recruitment-application.test.ts`

- [x] 将批次开放中心复选框固定为 20px，避免继承通用表单控件尺寸。
- [x] 为持久化引入的 localStorage 状态在应用单测中清理测试边界。
- [x] 类型检查通过，单元测试 320/320 通过，生产构建通过；批次日期展示已按 `Asia/Shanghai` 修正并补充单测。
- [ ] 本机 Chrome/Playwright E2E 仍受既有 `EMFILE`/Chrome `SIGABRT` 环境问题阻塞，需在 CI 或可用浏览器环境复跑。
