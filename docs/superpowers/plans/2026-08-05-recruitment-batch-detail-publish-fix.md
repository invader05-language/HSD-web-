# 招新批次详情页与发布交互修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task with review checkpoints.

**Goal:** 将招新批次详情页落地为状态清晰、可操作且可追溯的工作区，并修复发布冲突反馈和开放中心布局。

**Architecture:** Pinia 保留批次生命周期和时间冲突规则，新增统一的发布准备检查结果供详情页和 `publishBatch` 共用。详情页按批次状态投影同一页面骨架，`archived` 只读；列表、编辑器和审计表使用现有管理端组件与样式体系。

**Tech Stack:** Nuxt 4.5、Vue 3、Pinia 4、TypeScript 5.9、Vitest、Playwright。

## Global Constraints

- 只有联盟总负责人可以编辑批次或变更批次生命周期。
- 暂停批次仍属于已发布批次，继续参与时间冲突检查。
- 用户报名仍自动绑定唯一开放批次；本任务不改变用户端报名归属。
- 已发布考核结果的批次保持只读，不允许重新开放。
- 本任务不接入真实后端、数据库、微信公众号或大模型。
- 所有用户可见错误使用中文，内部错误代码仅保留在领域结果、测试和日志。

---

### Task 1: 发布准备检查与错误契约

**Files:**
- Modify: `app/types/recruitment-batch.ts`
- Modify: `app/stores/recruitment-batch.ts`
- Test: `tests/unit/recruitment-batch-rules.test.ts`

- [ ] 为时间冲突、已有开放批次和配置缺失定义结构化准备检查结果。
- [ ] 暴露 `getPublishReadiness(batchId, now)`，返回 `ok`、`code`、人类可用字段和冲突批次元数据。
- [ ] `publishBatch` 复用同一检查并保证失败不改变批次、版本和审计记录。
- [ ] 补充非冲突成功、冲突失败、暂停批次冲突和原子性测试。

### Task 2: 批次详情工作区与状态投影

**Files:**
- Modify: `app/pages/admin/recruitment/batches/[batchId].vue`
- Create or modify: `app/components/admin/RecruitmentBatchContextWorkspace.vue`
- Create or modify: `app/components/admin/RecruitmentBatchAuditTable.vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/e2e/recruitment-batch-context.spec.ts`

- [ ] 将页面组织为批次概览、状态/发布检查、批次工作区、生命周期记录四段。
- [ ] 工作区入口明确连接报名名单、预备成员考核、结果发布，并显示数量和状态。
- [ ] `draft`、`closed`、`archived` 使用不同权限投影；只有 `archived` 完全只读。
- [ ] 审计动作、状态、原因和时间全部中文化，并按 `Asia/Shanghai` 显示。
- [ ] 桌面端和 390px 移动端不出现溢出或重叠。

### Task 3: 编辑草稿、开放中心和列表入口

**Files:**
- Modify: `app/pages/admin/recruitment/batches/index.vue`
- Modify: `app/pages/admin/recruitment/batches/[batchId].vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/e2e/recruitment-admin.spec.ts`

- [ ] 草稿详情提供编辑名称、报名时间和开放中心的入口，使用现有批次更新命令。
- [ ] 开放中心名称左侧、20px 原生复选框右侧，整行可点击。
- [ ] `archived` 显示“查看归档”，`closed` 显示“处理收尾”，其余状态显示“进入批次”。
- [ ] 普通管理员不能看到或执行批次编辑和生命周期命令。

### Task 4: 发布弹窗与回归验证

**Files:**
- Modify: `app/pages/admin/recruitment/batches/[batchId].vue`
- Modify: `tests/e2e/recruitment-batch-context.spec.ts`

- [ ] 发布前阻塞冲突并展示冲突批次、时间和解决入口。
- [ ] 发布成功关闭弹窗、清空原因、刷新状态和审计。
- [ ] 业务失败关闭弹窗并在页面操作区显示中文错误；未知错误留在弹窗中可重试。
- [ ] 覆盖草稿发布成功、冲突失败、归档只读和列表入口语义。
- [ ] 运行单测、类型检查、生产构建和 E2E；记录本机浏览器环境阻塞而不伪报通过。
