# Project Direct Upload Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立项目从管理端草稿、新建/编辑、封面与详情素材上传、发布到用户端项目列表、详情页和首页项目槽位的完整闭环。

**Architecture:** 新增 `useProjectsStore` 作为项目的唯一事实来源，持久化草稿与 `publishedSnapshot`。`/admin/projects` 只保留列表和入口，`/admin/projects/new` 与 `/admin/projects/[id]` 使用 `ProjectEditor`。项目附件复用 `ContentMediaUploader`，每个项目必须有一个 `cover`，可以拥有零至多项 `detail`；公开页面只读取已发布快照。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、Pinia、现有管理端 CSS、Vitest、Playwright。

## Global Constraints

- 不使用 `/admin/media` 或 `ADMIN_ASSETS` 作为项目素材选择流程。
- 项目素材只归属当前项目；不提供跨内容素材复用选择器。
- 保存草稿允许项目字段和素材不完整；直接发布必须存在一个状态为 `ready` 且具有替代文本的图片封面，全部已关联详情素材也必须为 `ready` 且标题、说明、替代文本和比例完整。
- 联盟总负责人可管理并发布全部项目；中心管理员可管理并直接发布所属中心项目；服务端仍需重复校验。
- 项目发布只替换 `publishedSnapshot`；草稿、素材新增/删除和排序不应提前影响 `/projects`、`/projects/[slug]` 或首页。
- `PROJECT_DETAILS`、`PROJECTS` 与 `ADMIN_PROJECT_RECORDS` 是静态样例；迁移后只可作为种子/回退，不能作为项目写入的唯一来源。
- 本轮按用户要求暂不执行 Vitest、typecheck、build 或 E2E；全部开发完成后统一执行验证。

---

### Task 1: 建立项目领域模型、种子迁移与草稿/公开快照 Store

**Files:**
- Create: `app/types/project.ts`
- Create: `app/stores/projects.ts`
- Modify: `app/data/projects.ts`
- Modify: `app/data/admin-content.ts`
- Test: `tests/unit/project-workflow.test.ts`

**Interfaces:**
- `ProjectDraftInput` 必须包含 `title`、`category`、`year`、`description`、`achievement`、`projectStage`、`challenge`、`solution`、`technologies`、`memberCount`、`ownerCenterId`、`cover: ContentMediaAttachment | null` 与 `details: ContentMediaAttachment[]`；不再包含 `team` 或 `collaboratingCenterIds`。
- `ManagedProject` 包含草稿字段、`id`、`slug`、`publicationStatus: "draft" | "published" | "unpublished"`、`publishedSnapshot?`、审计时间和创建人，避免把业务阶段和发布状态都命名为 `status`。
- Store 提供 `createDraft(input)`、`updateDraft(id, input)`、`publish(id)`、`unpublish(id)`、`getManageableProjects()`、`getPublicProjects()`、`getPublicBySlug(slug)` 与 `canManageProject(id)`。

- [ ] **Step 1: 写入失败单元测试**

在 `tests/unit/project-workflow.test.ts` 创建最小项目草稿，断言保存后仍不是公开项目；缺少封面时 `publish` 抛出 `PROJECT_INCOMPLETE`；编辑已发布项目的草稿后 `getPublicBySlug` 仍返回旧封面和旧文本；再次 `publish` 后公开快照才更新。

- [ ] **Step 2: 定义项目类型并迁移静态种子**

在 `app/types/project.ts` 定义上述接口及 `PublishedProject`。在 `app/data/projects.ts` 将现有 `PROJECT_DETAILS` 和 `PROJECTS` 合并映射为初始项目种子，完整保留 `description`、`achievement`、项目阶段、挑战、方案和技术栈，补齐稳定 `ownerCenterId`、封面附件与详情附件。公开页面改造后删除对 `findProject` 静态查询的依赖；旧种子中的制作团队和协作中心字段不得进入项目领域模型。

- [ ] **Step 3: 实现 Pinia Store 与完整性校验**

在 `app/stores/projects.ts` 使用版本化 `localStorage` 保存项目元数据；附件 Blob 继续由共享 IndexedDB 适配器管理。`assertCompleteProject` 校验所有非空业务字段、`cover?.role === "cover"`、`cover.kind === "image"`、封面 `ready`、封面 `alt`，以及详情素材的状态、标题、说明、替代文本和比例。`publish` 在权限校验后调用该函数并复制不可变 `publishedSnapshot`。

- [ ] **Step 4: 更新管理样例读取边界**

让 `app/data/admin-content.ts` 的静态项目记录只保留兼容样例或由项目 Store 的管理投影替代。不要让 `AdminRecordWorkspace` 的假编辑状态继续成为项目管理的写入路径。

- [ ] **Step 5: 暂不运行测试**

按全局约束只保存测试文件，记录测试命令为 `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/project-workflow.test.ts`，不在本任务阶段执行。

### Task 2: 建立项目独立新建/编辑页与封面、详情素材审阅

**Files:**
- Create: `app/components/admin/ProjectEditor.vue`
- Create: `app/pages/admin/projects/new.vue`
- Create: `app/pages/admin/projects/[id].vue`
- Modify: `app/pages/admin/projects.vue`
- Modify: `app/components/admin/ContentMediaUploader.vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/unit/project-workflow.test.ts`

**Interfaces:**
- `ProjectEditor` 接受 `project?: ManagedProject` 和 `mode: "create" | "edit"`，并 emits `saved(id)`、`published(id)`、`cancelled()`。
- `ContentMediaUploader` 支持 `mode: "cover" | "collection"`；封面模式只允许一项 `role: "cover"`，集合模式产生 `role: "detail"` 列表。

- [ ] **Step 1: 改造项目列表为导航页**

删除 `/admin/projects` 中的静态“新建项目”按钮和伪工作区写入入口，改为前往 `/admin/projects/new` 的 `NuxtLink`。每条可管理项目提供 `/admin/projects/:id` 编辑链接；保留概览，但统计值从 Store 的管理投影计算。

- [ ] **Step 2: 实现 ProjectEditor 基础字段与权限选择**

建立标题、分类、年份、简介、当前成果、项目阶段、挑战、解决方案、技术栈、项目成员数和归属中心字段。联盟总负责人可以选择全部中心，中心管理员的归属中心固定为其所属中心。不要显示 Slug、制作团队或协作中心输入项。

- [ ] **Step 3: 实现封面与详情素材工作区**

在项目基本信息后放置“项目封面”和“项目详情素材”两个区域。封面区域显示单个预览、上传/替换/移除和替代文本编辑；详情区显示上传队列、缩略图网格、排序、删除、标题/说明/替代文本/比例编辑及大图/视频预览。两个区域都显示 `uploading`、`processing`、`ready`、`failed` 状态。

- [ ] **Step 4: 实现草稿和发布行为**

保存草稿只调用 `createDraft` 或 `updateDraft`，持久化成功后才显示“草稿已保存”。发布按钮在表单完整、封面完整、无上传/处理/失败附件时可用；处理函数仍调用 Store `publish`，防止绕过前端按钮。新建保存后跳转 `/admin/projects/:id`，发布成功返回 `/admin/projects`。

- [ ] **Step 5: 添加审阅与响应式样式**

在宽屏中让素材缩略图区和用户端呈现预览并列；窄屏改为纵向，保证图片不裁切、视频有明显标识、状态与删除操作可键盘访问。编辑器白底必须具有 26px 左右内边距，字段网格的行/列间距不小于 18px。

### Task 3: 使用户端、门户目录与首页读取项目公开投影

**Files:**
- Modify: `app/pages/projects/index.vue`
- Modify: `app/pages/projects/[slug].vue`
- Modify: `app/composables/usePortalCatalog.ts`
- Modify: `app/types/portal-content.ts`
- Modify: `app/pages/index.vue`
- Modify: `app/components/PageBanner.vue`
- Modify: `app/components/ContentMediaView.vue`
- Modify: `app/data/projects.ts`
- Test: `tests/e2e/activity-gallery-workflows.spec.ts`

**Interfaces:**
- 用户端查询使用 `useProjectsStore().getPublicProjects()` 和 `getPublicBySlug(slug)`；静态数据只用于 Store 的首次种子初始化，不在公开页面建立第二套回退事实来源。
- 用户端卡片用 `cover.url`；详情页用 `cover` 和按 `sortOrder` 排列的 `details`。
- `PortalCatalogItem.media` 传递公开项目封面，首页项目槽位使用同一附件。

- [ ] **Step 1: 列表与详情改读公开项目**

在 `/projects` hydrate Store 后基于公开项目进行筛选；`/projects/[slug]` 找不到公开快照时呈现 404/空状态，不能展示草稿。卡片、详情首屏读取封面，详情区只在有 `details` 时呈现有语义的图片/视频列表，所有 `<img>` 使用附件 `alt`。

- [ ] **Step 2: 更新门户目录和首页推荐数据**

让 `usePortalCatalog` 的项目项来自项目公开投影，保持既有 `/projects/:slug` 链接和 `eligibleSlots: ["projects"]`，并把公开封面写入 `PortalCatalogItem.media`。首页精选项目使用 `ContentMediaView` 替换 `MediaPlaceholder`；未发布项目不得进入门户目录或首页。

- [ ] **Step 3: 补充端到端场景但不运行**

在 `tests/e2e/activity-gallery-workflows.spec.ts` 或新项目规格中加入：管理员创建项目、上传封面与详情素材、保存草稿后用户端不可见、补齐字段发布后用户端列表/详情/首页可见、编辑草稿不改变已发布素材、重新发布后更新。按全局约束本阶段不运行。

### Task 4: 更新交接文档并执行统一验证

**Files:**
- Modify: `README.md`
- Modify: `docs/handoffs/2026-08-07-content-direct-upload-backend.md`
- Modify: `docs/superpowers/specs/2026-08-07-gallery-direct-upload-design.md`
- Test: `tests/unit/project-workflow.test.ts`
- Test: `tests/e2e/activity-gallery-workflows.spec.ts`

- [ ] **Step 1: 更新路由、附件角色与后端契约文档**

记录 `/admin/projects/new`、`/admin/projects/[id]`、`cover | detail` 附件角色、项目发布快照和首页公开投影。明确后端的发布接口对 `contentType: "project"` 执行与前端一致的状态、替代文本和中心范围校验。

- [ ] **Step 2: 统一运行延期验证**

在画廊、活动和项目的上传功能全部完成后，运行：

```bash
sh scripts/with-hsd-node.sh corepack pnpm run test:unit
sh scripts/with-hsd-node.sh corepack pnpm run typecheck
sh scripts/with-hsd-node.sh corepack pnpm run build
CI=1 HSD_E2E_PORT=49880 HSD_E2E_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' sh scripts/with-hsd-node.sh corepack pnpm exec playwright test
git diff --check
```

Expected: 四项命令均通过，`git diff --check` 无输出；浏览器复核确认项目草稿不公开、发布后封面和详情素材正确呈现。

## Acceptance Checklist

- `/admin/projects` 只展示项目管理列表、状态和新建/编辑入口，不含底部伪编辑器。
- 项目新建和编辑均在独立子页完成，草稿和用户端公开内容隔离。
- 项目必须有一个完成处理并填好替代文本的封面才可发布；详情素材可为空。
- 已上传素材有上传进度、失败状态、预览、排序、删除和替代文本审阅能力。
- 已发布项目在 `/projects`、`/projects/[slug]`、门户目录及首页项目槽位一致呈现；草稿不泄露。
- 前端和后端都不把独立媒体素材库当作新建、编辑或发布的前置流程。
- 项目管理端和用户端均不再展示或传输“制作团队”“协作中心”；历史草稿迁移后保留项目与素材，但清理这两个旧字段。
