# Activity Direct Upload Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既有活动独立新建/编辑工作流中加入“一张必填封面 + 多张可选详情素材”的直接上传、发布审阅和用户端公开展示闭环。

**Architecture:** `ActivityEditor` 继续通过 `useActivitiesStore` 保存草稿和发布快照。活动领域增加 `cover` 与 `details` 附件字段；编辑器使用共享 `ContentMediaUploader` 的封面和集合模式，用户端卡片和详情只读取 `publishedSnapshot` 中已完成审阅的附件。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、Pinia、现有管理端 CSS、Vitest、Playwright。

## Global Constraints

- 不将 `/admin/media` 或 `ADMIN_ASSETS` 作为活动素材上传、编辑和发布的前置条件。
- 活动必须有一个且仅有一个图片 `cover`；详情 `detail` 素材可为空，但已添加的全部素材必须在发布时为 `ready`，且标题、说明、替代文本和比例完整。
- 保存草稿允许没有封面、存在上传中素材或字段不完整；发布接口与 Store 都必须拒绝不完整活动。
- 直接上传素材只归属当前活动，不提供跨活动、画廊或项目的素材选择器。
- 活动公开列表读取封面，公开详情读取封面和详情素材；草稿与后续未发布修改不得改变用户端。
- 本轮按用户要求只编写测试、暂不执行 Vitest、typecheck、build 或 E2E，待全部开发结束后统一验证。

---

### Task 1: 扩展活动附件领域与发布完整性校验

**Files:**
- Modify: `app/types/content-media.ts`
- Modify: `app/types/activity.ts`
- Modify: `app/data/activities.ts`
- Modify: `app/stores/activities.ts`
- Test: `tests/unit/activity-workflow.test.ts`

**Interfaces:**
- `ContentMediaAttachment` 提供 `id`、`role: "cover" | "detail"`、`kind: "image" | "video"`、`status`、`url?`、`thumbnailUrl?`、`title`、`caption`、`alt`、`aspect` 与 `sortOrder`。
- `ActivityDraftInput` 增加 `cover: ContentMediaAttachment | null`、`details: ContentMediaAttachment[]`；`PublishedActivity` 继承该快照字段。
- Store 提供 `assertCompleteActivity(activity)`，且 `publish(id)` 始终调用它。

- [ ] **Step 1: 写入失败单元测试**

在 `tests/unit/activity-workflow.test.ts` 新增：缺少封面时发布抛出 `ACTIVITY_INCOMPLETE`；封面为 `processing` 或 `alt` 为空时发布失败；编辑已发布活动的封面/详情素材后公开快照仍保持旧版本；重新发布后公开快照才替换。

- [ ] **Step 2: 定义通用附件类型和种子兼容转换**

复用画廊阶段建立的 `app/types/content-media.ts`，并在 `app/data/activities.ts` 为种子活动补齐图片 `cover`，可选的 `details` 为空数组。`app/stores/activities.ts` 将旧版本持久化数据缺失的附件字段转换为 `cover: null`、`details: []`，历史公开活动保持可读，管理员再次发布前须补齐封面。

- [ ] **Step 3: 加强 Store 发布校验**

在既有文本字段和议程校验后验证：`cover` 存在、`role === "cover"`、`kind === "image"`、`status === "ready"`、`alt.trim()` 非空；`details` 每项具有 `role === "detail"`、`ready` 状态和完整的标题、说明、替代文本、比例。校验失败统一抛出 `ACTIVITY_INCOMPLETE`，禁止任何页面绕过。

- [ ] **Step 4: 暂不运行测试**

保留待统一执行命令：

```bash
sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/activity-workflow.test.ts
```

### Task 2: 在 ActivityEditor 实现封面上传、详情素材审阅与发布状态

**Files:**
- Modify: `app/components/admin/ContentMediaUploader.vue`
- Modify: `app/components/ContentMediaView.vue`
- Modify: `app/components/admin/ActivityEditor.vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/unit/activity-workflow.test.ts`

**Interfaces:**
- `ContentMediaUploader` 接受 `mode: "cover" | "collection"`、`modelValue` 和 `update:modelValue`；封面模式最多输出一项 `cover`，集合模式输出可排序 `detail` 数组。
- `ActivityEditor` 将上传结果映射到表单的 `cover`、`details`，继续 emits `saved(id)` 与 `published(id)`。

- [ ] **Step 1: 建立可审阅上传组件**

实现拖放/文件选择、图片和视频格式过滤、上传进度、处理状态、失败重试、缩略图预览、替代文本、标题、说明、比例、删除与排序。Mock 适配器将 Blob 存入共享 IndexedDB，并只把 `localBlobId` 与附件元数据交给 Store，不把原始文件保存到 `localStorage`。

- [ ] **Step 2: 为活动增加“活动视觉”区**

在基本信息之后增加“活动封面”和“详情素材”两个小节。封面显示替换和移除；详情素材支持多项审阅网格。发布前错误提示必须明确指出“活动封面”或具体未完成素材，草稿保存仍允许不完整。

- [ ] **Step 3: 完善发布按钮禁用逻辑和视觉预览**

当表单不完整、封面不完整、任一附件处于 `uploading`/`processing`/`failed` 或替代文本为空时禁用发布。宽屏用内联预览展示用户端封面及详情素材顺序，窄屏堆叠显示；编辑器与白色底板保持不少于 26px 内边距。

### Task 3: 让活动公开页渲染已发布素材并更新文档

**Files:**
- Modify: `app/pages/activities/index.vue`
- Modify: `app/pages/activities/[slug].vue`
- Modify: `app/components/PageBanner.vue`
- Modify: `app/composables/usePortalCatalog.ts`
- Modify: `app/types/portal-content.ts`
- Modify: `app/data/activities.ts`
- Modify: `docs/handoffs/2026-08-07-content-direct-upload-backend.md`
- Test: `tests/e2e/activity-gallery-workflows.spec.ts`

**Interfaces:**
- `PortalCatalogItem` 增加可选 `media: ContentMediaAttachment`；活动目录项传递公开封面。
- 活动列表和 `PageBanner` 使用 `ContentMediaView` 渲染 `publishedSnapshot.cover`；详情页使用同一封面和按 `sortOrder` 排列的 `publishedSnapshot.details`。

- [ ] **Step 1: 改造公开活动卡片和详情**

动态列表仅为活动条目增加封面缩略图，新闻和公告保持现有文字布局；封面缺失时显示现有占位视觉，不读取草稿。`PageBanner` 接受公开附件并复用 `ContentMediaView`；详情页以语义化 `<figure>`/`<video>` 呈现已发布详情素材。草稿活动与未发布附件不得透过 slug 详情页公开。

- [ ] **Step 2: 补充延期 E2E 场景**

加入：管理员上传活动封面、保存草稿后用户端不可见或仍显示旧快照、补齐字段发布后列表/详情显示封面与详情素材、重新发布后才更新公开图像。只写测试，不运行。

- [ ] **Step 3: 更新后端交接和统一验证清单**

在交接文档明确 `contentType: "activity"` 的 `cover`/`detail` 角色及发布校验。三个模块开发完成后统一运行项目的全量单测、typecheck、build、Playwright 和 `git diff --check`。

## Acceptance Checklist

- 活动新建/编辑页可直接上传、预览、替换和删除活动封面，并可审阅多张详情素材。
- 一张完成处理且填写替代文本的封面是活动发布前置条件；详情素材可为空。
- 已添加的任何失败、处理中或缺少替代文本的素材都阻止发布，但不阻止保存草稿。
- `/activities` 和 `/activities/[slug]` 仅渲染公开快照素材；编辑中的新图不会提前向用户端曝光。
- 活动素材不依赖媒体素材库，也不支持跨内容选择复用。
