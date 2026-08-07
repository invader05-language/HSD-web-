# Gallery Direct Upload Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将画廊管理改造成独立新建/编辑页，并在编辑器内直接上传和管理素材，不再依赖独立媒体素材库。

**Architecture:** `/admin/gallery` 只负责列表和导航；`/admin/gallery/new` 与 `/admin/gallery/[id]` 共用 `GalleryEditor`。本计划先建立通用附件、IndexedDB Mock 适配器、上传审阅器与公开渲染器，再接入画廊；同一轮后续活动和项目计划直接复用。Store 保存草稿和发布快照，用户端只读取已发布快照。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、Pinia、现有管理端 CSS、Vitest、Playwright。

## Global Constraints

- 不把 `/admin/media` 作为画廊新建、编辑或发布的前置流程。
- 不在画廊编辑器显示 Slug；Slug 由 Store 根据标题生成，已发布 Slug 不可修改。
- 制作团队字段保留，因为用户端详情页已经展示该字段。
- 草稿允许字段或素材暂时不完整；直接发布必须完成全部必填字段并且所有附件 ready。
- 新素材默认只归属于当前内容；不实现跨内容复用选择器。
- 本阶段只接入画廊；同一轮随后执行活动和项目计划。
- 本轮完成全部代码后再统一执行单测、typecheck、build 和 E2E。

---

### Task 1: 定义直接上传附件契约并兼容历史画廊数据

**Files:**
- Create: `app/types/content-media.ts`
- Create: `app/utils/content-media-storage.ts`
- Create: `app/composables/useContentMediaUpload.ts`
- Modify: `app/data/gallery.ts`
- Modify: `app/types/gallery.ts`
- Modify: `app/stores/gallery.ts`
- Test: `tests/unit/gallery-workflow.test.ts`

- [ ] **Step 1: 补充失败测试**

覆盖以下行为：新附件保存到画廊草稿；历史 `assetId` 数据仍可 hydrate；缺少 ready 附件时发布抛出 `GALLERY_INCOMPLETE`；素材状态为 failed 或缺少替代文本时不可发布。

- [ ] **Step 2: 定义 `ContentMediaAttachment`**

在 `app/types/content-media.ts` 定义 `id`、可选 `mediaId`/`localBlobId`、`role`、`kind`、`title`、`caption`、`alt`、`aspect`、`sortOrder`、可选 `url`/`thumbnailUrl`、`status` 和可选错误信息。GalleryAsset 兼容旧字段，但新建数据使用内容附件字段。

- [ ] **Step 3: 建立可刷新恢复的 Mock 上传适配器**

`app/utils/content-media-storage.ts` 使用 IndexedDB 的 `hsd-content-media/blobs` object store 按 `localBlobId` 保存 Blob、读取 Blob 和生成对象 URL；`app/composables/useContentMediaUpload.ts` 负责格式/大小校验、保存、状态转换和对象 URL 生命周期。对象 URL 不写入 `localStorage`，组件卸载时调用 `URL.revokeObjectURL`。Mock 移除附件只解除内容关系，不立即物理删除 Blob，避免破坏仍被公开快照引用的素材。

- [ ] **Step 4: 增加 Gallery Store 完整性校验**

新增 `assertCompleteGallery(album)`，校验标题、分类、年份、归属中心、摘要、制作团队和至少一个附件；每项附件必须为 `detail`、状态为 `ready`，且标题、说明、替代文本和比例完整。`publish` 必须调用该方法。

- [ ] **Step 5: 保留 v1 历史数据**

提升画廊持久化版本；旧版 `assetId` 附件映射为 legacy 内容附件，不再依赖新的选择器，也不删除既有公开快照。

- [ ] **Step 6: 暂不执行测试**

按本轮约束只完成测试文件编写，不运行 Vitest。

### Task 2: 抽取通用上传组件

**Files:**
- Create: `app/components/admin/ContentMediaUploader.vue`
- Create: `app/components/ContentMediaView.vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/unit/gallery-workflow.test.ts`

- [ ] **Step 1: 建立上传适配器边界**

组件接收 `mode: "cover" | "collection"` 和 `modelValue: ContentMediaAttachment[]`，通过 `update:modelValue` 返回附件列表；文件选择先进入 `uploading`，Mock 适配器持久化 Blob 后标记 `ready`。封面模式只接受一张 JPEG/PNG/WebP；集合模式接受 JPEG/PNG/WebP/MP4/WebM。真实 API 接入时只替换适配器。

- [ ] **Step 2: 实现素材操作**

支持添加图片/视频、删除、排序、编辑标题/说明/替代文本/比例，并显示上传状态和错误信息。`ContentMediaView` 同时处理后端 URL 和 IndexedDB Blob，按 `kind` 渲染图片或带 controls 的视频。文档和超限文件拒绝添加，并显示具体原因。

- [ ] **Step 3: 增加编辑器专用样式**

为上传区域增加白底内边距、素材项间距、预览尺寸和移动端单列布局，不修改媒体库页面的其他样式。

### Task 3: 实现独立画廊新建/编辑页

**Files:**
- Create: `app/components/admin/GalleryEditor.vue`
- Create: `app/pages/admin/gallery/new.vue`
- Create: `app/pages/admin/gallery/[id].vue`
- Modify: `app/pages/admin/gallery.vue`
- Modify: `app/components/GalleryMediaFrame.vue`
- Modify: `app/components/GalleryLightbox.vue`
- Modify: `app/pages/gallery/index.vue`
- Modify: `app/pages/gallery/[slug].vue`
- Test: `tests/e2e/activity-gallery-workflows.spec.ts`

- [ ] **Step 1: 把列表页改成只读导航**

删除 `selectedId`、内嵌表单、素材库复选框和 `ADMIN_ASSETS` 依赖。列表“编辑专题”跳转 `/admin/gallery/:id`，新建按钮跳转 `/admin/gallery/new`。

- [ ] **Step 2: 实现 GalleryEditor 字段**

保留标题、分类、年份、归属中心、摘要、制作团队和直接上传附件；删除 Slug 输入框。中心管理员只能选择所属中心，联盟总负责人可选择全部中心。

- [ ] **Step 3: 实现真实草稿保存**

保存草稿调用 Store 的 `createDraft` 或 `updateDraft`，只有持久化成功后显示成功提示；失败时保留表单和附件状态。新建保存后跳转编辑页并保留成功提示。

- [ ] **Step 4: 实现直接发布**

发布按钮在 `isComplete`、无上传任务且未保存/发布时可用；发布处理再次校验并写入 `publishedSnapshot`。发布成功返回画廊列表，用户端才能读取新专题。

- [ ] **Step 5: 实现权限和空状态**

编辑页处理不存在、越权、草稿和已发布预览状态；越权跳转 `/admin/forbidden`，已发布专题提供用户端预览链接。

- [ ] **Step 6: 接通用户端图片与视频渲染**

画廊列表使用排序后第一项作为专题封面并显示图片或视频缩略预览；`GalleryMediaFrame` 和 `GalleryLightbox` 根据 `kind` 使用 `ContentMediaView`，图片保持现有放大浏览，视频显示 controls 且不自动播放。素材失败时使用现有 HSD fallback，不造成页面空白。

### Task 4: 更新导航、文档和回归覆盖

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-06-activity-gallery-domain-linkage-design.md`
- Test: `tests/unit/gallery-workflow.test.ts`
- Test: `tests/e2e/activity-gallery-workflows.spec.ts`

- [ ] **Step 1: 更新路由和媒体架构说明**

记录画廊新建/编辑子路由、直接上传流程、发布快照和 `/admin/media` 非前置依赖；说明活动和项目后续复用通用上传契约。

- [ ] **Step 2: 补齐单元覆盖**

覆盖草稿持久化、上传状态、替代文本校验、发布快照隔离、历史数据 hydrate 和中心权限边界。

- [ ] **Step 3: 更新 E2E 场景**

覆盖管理员进入新建页、直接添加素材、保存草稿、补齐字段发布、用户端列表/详情渲染和已有专题编辑跳转。

- [ ] **Step 4: 统一验证**

全部本轮开发结束后执行：

```bash
sh scripts/with-hsd-node.sh corepack pnpm run test:unit
sh scripts/with-hsd-node.sh corepack pnpm run typecheck
sh scripts/with-hsd-node.sh corepack pnpm run build
CI=1 HSD_E2E_PORT=49880 HSD_E2E_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' sh scripts/with-hsd-node.sh corepack pnpm exec playwright test
git diff --check
```

## Acceptance Checklist

- `/admin/gallery` 不再显示底部编辑器。
- 点击新建和编辑均进入独立子页。
- 编辑器不显示 Slug，输入框与白色底板有明确边距。
- 画廊可在编辑页直接添加图片/视频，不需要进入媒体素材库。
- 草稿保存后不会出现在用户端。
- 缺少任一必填字段、素材仍在处理、素材失败或缺少替代文本时不能发布。
- 发布后 `/gallery` 和 `/gallery/[slug]` 能渲染已发布附件。
- 制作团队在用户端继续展示。
- 画廊列表使用第一项素材作为专题封面，详情和灯箱可正常展示图片与播放视频。
- 活动和项目计划可以直接复用 `ContentMediaUploader`、`ContentMediaView` 和 IndexedDB Mock 适配器。
