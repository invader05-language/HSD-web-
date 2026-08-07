# HSDweb 后端接手交接：内容模块直接上传

## 1. Summary

- **Task**: 将画廊、活动、项目展示改为在各自的新建/编辑页直接上传图片或视频，不再把独立“媒体素材库”作为管理员必经流程。活动与项目采用“一张必填图片封面 + 多张可选详情素材”；画廊采用可排序多素材专题。
- **Status**: 前端直接上传闭环已实现为 Mock；活动、画廊、项目均有独立新建/编辑页、草稿/公开快照隔离、素材审阅和用户端公开投影；等待后端接口和真实持久化实现。
- **Current branch and HEAD**: `codex/activity-gallery-workflows` 基于 `07d64ea`，当前有未提交的直接上传实现；不要覆盖或重置这些改动。
- **Base or integration target**: `origin/main` currently points to the same `07d64ea`；本次未检查远程最新变化。
- **Handoff intent**: 后端同事及其 AI 应先按本文和设计/计划文档对齐上传、附件归属、状态校验和公开快照契约，再实现 API、数据库和对象存储。

## 2. Decisions And Scope

- 管理端不再提供 `/admin/media` 页面或“媒体素材库”导航入口；历史地址会回到管理台。管理员在对应内容的编辑页直接上传素材。
- 画廊、活动、项目在各自的新建/编辑页直接添加素材；默认素材只归属于当前内容，不提供跨内容复用选择器。
- 后端仍需要通用上传服务、对象存储、媒体处理状态和附件记录，但这些是基础设施，不等同于管理员操作页面。
- 已发布内容使用公开快照；素材后续变化不会自动改变用户端，必须重新编辑并发布。
- 画廊的“制作团队”字段保留，用户端 `/gallery/[slug]` 已展示该字段。
- 项目管理不再有“制作团队”或“协作中心”字段；项目只保留归属中心作为管理范围，项目 DTO、草稿、发布快照和用户端详情均不得传输或展示这两个旧字段。历史项目迁移时保留项目与素材并清理旧字段。
- 管理员和联盟负责人同时是平台成员账号，成员空间必须有对应成员档案；管理员从官网账号菜单可返回 `/admin`。
- 三种内容都使用同一上传与附件契约。项目当前前端仍为静态样例，前端实现前必须先建立 `useProjectsStore`、独立新建/编辑路由和公开投影；后端可按相同内容类型先提供接口。

**Out of scope:** 当前分支没有真实 API、数据库、对象存储、转码、病毒扫描、CDN 或后端鉴权实现；`ADMIN_ASSETS` 仍是前端 Mock 数据，不应被当作生产媒体库。

## 3. Completed Frontend Work

- [x] `app/stores/activities.ts`: 活动草稿、公开快照、报名和权限范围的 Pinia Mock Store。
- [x] `app/pages/admin/activities.vue`: 活动列表与状态导航；新建/编辑已规划为独立子页。
- [x] `app/pages/admin/activities/new.vue`: 活动独立新建页。
- [x] `app/pages/admin/activities/[id].vue`: 活动独立编辑页和中心权限判断。
- [x] `app/components/admin/ActivityEditor.vue`: 活动草稿保存、发布完整性校验和结构化时间选项。
- [x] `app/stores/gallery.ts`: 画廊草稿、发布快照、下架和中心范围的 Pinia Mock Store。
- [x] `app/pages/admin/gallery.vue`: 只保留专题列表和新建/编辑入口，不再嵌入底部编辑器或素材库复选框。
- [x] `app/pages/admin/gallery/new.vue`、`app/pages/admin/gallery/[id].vue`、`app/components/admin/GalleryEditor.vue`: 画廊独立新建/编辑页、草稿/发布和素材审阅。
- [x] `app/types/content-media.ts`、`app/components/admin/ContentMediaUploader.vue`、`app/components/ContentMediaView.vue`: 活动、画廊、项目共用的上传/预览/元数据契约。
- [x] `app/stores/projects.ts`、`app/pages/admin/projects/new.vue`、`app/pages/admin/projects/[id].vue`、`app/components/admin/ProjectEditor.vue`: 项目从静态管理台补齐独立领域 Store、编辑页和发布快照。
- [x] 项目领域模型已移除 `team` / `collaboratingCenterIds`；管理端编辑器与用户端项目详情不再展示这两个字段，并对旧项目本地缓存执行版本迁移。
- [x] `app/stores/member-profile.ts` 为管理员对应的正式成员补齐成员档案，避免 `/member`、`/member/profile`、`/member/results` 和 `/join/apply` 因缺档案白屏。
- [x] `app/components/SiteHeader.vue` 为有管理权限的成员账号增加“进入管理端”入口。
- [x] `app/pages/admin/activities/new.vue`、`app/pages/admin/activities/[id].vue`、`app/components/admin/ActivityEditor.vue`: 活动独立新建/编辑页、结构化时间选项和直接上传封面/详情素材。
- [x] `app/pages/gallery/index.vue`、`app/pages/gallery/[slug].vue`: 用户端只读取已发布画廊快照；详情页展示制作团队和附件。
- [x] `app/pages/admin/content/new.vue`、`app/pages/admin/content/[id].vue`、`app/components/admin/PortalContentEditor.vue`: 官网内容正文图片改为编辑页直接上传、预览和发布，不再依赖媒体素材库。
- [x] `app/pages/admin/content/home.vue`: 门户首页/加入我们主视觉改为直接上传并在草稿预览；门户推荐位显示每类候选的真实来源说明，旧的黄色配置提示已移除。
- [x] `app/stores/portal-content.ts`、`app/stores/portal-config.ts`: 本地 Mock 存储版本已升级并兼容旧 `assetId` 数据，迁移为 `media.legacyAssetId`，不会在升级时清空草稿或公开版本。
- [x] `app/composables/usePortalCatalog.ts`、`app/pages/index.vue`、`app/components/PageBanner.vue`: 首页画廊只消费已发布且有 ready 封面的专题；无素材时显示紧凑空状态，避免占据大面积空白。
- [x] `docs/superpowers/specs/2026-08-07-gallery-direct-upload-design.md`: 已确认的产品和技术设计。
- [x] `docs/superpowers/plans/2026-08-07-gallery-direct-upload-workflow.md`: 画廊直接上传的前端实施计划。

## 4. Content-Type Requirements

| 内容类型 | 管理端闭环 | 必须发布素材 | 用户端公开投影 |
| --- | --- | --- | --- |
| `gallery` | 列表 -> 新建/编辑页 -> 草稿 -> 发布 | 至少一项 `detail` | `/gallery` 与 `/gallery/[slug]` |
| `activity` | 列表 -> 新建/编辑页 -> 草稿 -> 发布 | 一项且仅一项 `cover`；`detail` 可选 | `/activities` 与 `/activities/[slug]` |
| `project` | 列表 -> 新建/编辑页 -> 草稿 -> 发布 | 一项且仅一项 `cover`；`detail` 可选 | `/projects`、`/projects/[slug]`、门户目录及首页项目槽位；不含制作团队/协作中心 |

附件请求和响应必须包含 `role: cover | detail` 与 `kind: image | video`。封面只允许图片。服务端在发布事务中校验：画廊至少一个 `detail`；活动/项目恰好一个图片 `cover`；封面替代文本非空；所有详情附件为 `ready` 且标题、说明、替代文本和比例完整。

## 5. Current Work And Next Steps

- [ ] 后端确认通用上传 API 的认证、文件大小、格式、对象存储和异步处理约束。
- [ ] 后端实现内容附件记录：附件必须带 `ownerType`、`ownerId`，禁止通过修改请求把附件挂到其他内容。
- [ ] 后端实现上传状态查询和发布前状态校验；`uploading`、`processing`、`failed` 或缺少替代文本的附件不能进入公开快照。
- [ ] 后端实现草稿保存和发布事务：草稿可不完整，发布必须完整；发布成功后生成稳定的公开快照。
- [x] 前端已将 `ContentMediaUploader` 接到画廊、活动和项目编辑页，并把各模块的封面/详情素材接入用户端公开投影。
- [ ] 后端接口确定后，更新 `app/types/content-media.ts`、`app/types/gallery.ts` 和对应 Store 的适配器，移除生产环境对 `localBlobId`、`localStorage` 和 `ADMIN_ASSETS` 的依赖。

## 6. Code And Data Flow

### Current Mock flow

```text
GalleryEditor / ActivityEditor / ProjectEditor
  -> ContentMediaUploader
  -> IndexedDB Blob + localStorage metadata
  -> useGalleryStore / useActivitiesStore / useProjectsStore / usePortalContentStore / usePortalConfigStore
  -> localStorage: baiyun-hsd.gallery / baiyun-hsd.activities / baiyun-hsd.projects
  -> localStorage: portal content/config snapshots + IndexedDB Blob records
  -> publishedSnapshot / published portal config
  -> public content pages, homepage, and portal catalog
```

这个流程仅用于当前前端演示。`ADMIN_ASSETS` 位于 `app/data/admin-assets.ts`，只作为旧样例数据兼容，不再作为新建、编辑、门户视觉或发布的素材选择流程，也不是后端接口或生产数据源。官网内容正文和门户主视觉同样写入各自草稿的附件关系，公开页面只读取已发布快照。

### Target backend flow

```text
GalleryEditor / ActivityEditor / ProjectEditor
  -> upload file directly
  -> backend upload service + object storage
  -> media attachment record owned by current content
  -> async processing status
  -> draft attachment list
  -> publish transaction validates all attachments
  -> public snapshot / public projection
```

### Suggested backend contract

以下名称是建议契约，不代表当前仓库已有 endpoint；后端可以采用同等语义的命名，但必须保持字段含义一致：

1. `POST /api/uploads`: 创建一次文件上传，返回 `uploadId`、处理状态和临时上传地址或上传凭证。
2. `GET /api/uploads/:uploadId`: 查询 `uploading`、`processing`、`ready`、`failed` 状态及错误原因、媒体类型、预览地址和元数据。
3. `POST /api/content/:contentType/:contentId/attachments`: 将 ready 上传绑定到当前草稿内容，服务端校验当前管理员权限和 `ownerId`。
4. `DELETE /api/content/:contentType/:contentId/attachments/:attachmentId`: 从草稿解绑附件；已发布快照引用的文件不能无检查硬删除。
5. `POST /api/content/:contentType/:contentId/publish`: 在事务内校验内容字段、附件状态、替代文本和权限，然后替换公开快照。

建议附件响应至少包含：

```text
id / uploadId / ownerType / ownerId
kind: image | video
role: cover | detail
status: uploading | processing | ready | failed
url / thumbnailUrl
title / caption / alt
aspect / sortOrder
createdAt / updatedAt
errorCode / errorMessage
```

前端 Mock 会将 Blob 存入 IndexedDB，并在内容元数据中保存 `localBlobId`，仅用于同一浏览器内刷新恢复。这不是后端字段要求，也不能上传到生产 API；真实后端返回 `mediaId`、`url` 和 `thumbnailUrl` 后，前端适配器会移除 Mock 路径。

### Source of truth

- 草稿：后端内容草稿及其附件关联。
- 公开页面：后端发布快照或公开投影，不直接读取草稿。
- 文件状态：上传/处理服务返回的附件状态，发布接口必须在服务端再次校验。
- 权限：服务端当前登录管理员和内容归属中心是最终权威；不能只依赖前端 `sessionStore`。

## 7. Git And Worktrees

- **Tracked changes**: 当前 worktree 有未提交修改，包含活动/画廊前端联动、样式、README 和测试更新；没有 staged changes。
- **Untracked paths**: 活动/画廊类型、Store、测试、设计和计划文档，以及本交接文档；这些是当前任务的有意产物或前置工作。
- **Remote freshness**: 未执行 fetch 或远程刷新检查；文档只记录当前本地 Git 观察结果。
- **Other worktrees**: `/Users/AnpointWork/HSDweb` 是 `main` 工作区；另有多个历史 Codex worktree。后端同事不要在未确认的情况下清理或重置这些 worktree。
- **Integration**: 后端实现完成后应基于最新 `main` 重新确认接口冲突，再单独提交后端 PR；不要覆盖当前未提交前端改动。

## 8. HSD Boundary Check

| Item | Conclusion | Evidence |
| --- | --- | --- |
| Frontend scope | **confirmed** | 当前实现是 Nuxt/Vue/Pinia/`localStorage` Mock；没有真实 API、数据库或对象存储。 |
| Identity authority | **confirmed for current admin UI** | 活动和画廊 Store 使用 `useSessionStore()`、管理员级别和中心范围；后端必须重新鉴权。 |
| Recruitment isolation | **not applicable** | 本交接只涉及活动、画廊和通用内容附件，不改变招新申请或成员身份。 |
| Public/admin projection | **confirmed in Mock, backend unverified** | `publishedSnapshot` 驱动 `/activities`、`/gallery` 公开投影；真实后端尚未提供等价 API。 |
| Mock and privacy boundary | **at risk if mistaken for production** | `ADMIN_ASSETS` 和 localStorage 只能用于演示，不能承担真实上传权限、审核或文件删除。 |
| Auth/navigation | **confirmed in frontend** | `/admin/**` 使用独立 admin layout 和全局认证路由；后端 API 必须继续区分管理员、中心范围和公开读取。 |
| Desktop/mobile/a11y | **verified for current frontend scope** | 桌面端和移动端公开投影、直接上传路由及键盘可操作性已由完整 E2E 覆盖；另完成移动端首页画廊溢出回归检查。真实对象存储上传失败态仍需后端接口接入后复核。 |

## 9. Validation

| Check | Command or evidence | Result |
| --- | --- | --- |
| `git diff --check` | `git diff --check` in `codex/activity-gallery-workflows` | **passed locally**；无输出。 |
| Unit tests | `sh scripts/with-hsd-node.sh corepack pnpm run test:unit` | **passed**；45 files / 401 tests。 |
| Typecheck | `sh scripts/with-hsd-node.sh corepack pnpm run typecheck` | **passed**。 |
| Production build | `sh scripts/with-hsd-node.sh corepack pnpm run build` | **passed**；Nuxt/Nitro production build completed。 |
| E2E | `HSD_E2E_CHROMIUM_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome CI=1 ... pnpm exec playwright test` | **passed**；96 tests。 |
| Browser/UI | 直接上传路由、共用上传组件和公开投影 | **passed**；完整 E2E 覆盖通过，Playwright 使用本机 Chrome。 |

## 10. Risks And Blockers

- **上传状态与发布竞态**：前端不能只相信本地 `ready`；发布接口必须重新查询或锁定附件状态。
- **附件归属越权**：服务端必须校验 `ownerType/ownerId` 和管理员中心范围，不能接受任意 `ownerId`。
- **公开快照与文件删除**：已发布快照引用的文件不能直接删除；需要解绑、版本保留或回收站策略。
- **旧版 Mock 数据**：现有画廊可能包含 `assetId` 或无真实 URL 的演示素材，迁移时不能直接清空公开快照。
- **大文件与浏览器上传**：视频应支持大小限制、分片/断点续传或明确失败错误；不要把大文件转成 localStorage 数据。
- **项目现为静态样例**：不能只对 `ADMIN_PROJECT_RECORDS` 添加附件字段。前端必须先让项目草稿、权限、发布快照和公开路由共享同一 `projectId`，再接入附件关系。
- **当前前端是 Mock 上传 UI**：后端接口可按本文契约实现；联调时替换上传适配器和 Store 持久化，不要恢复独立素材库前置流程。
- **门户候选不是独立内容表**：`HSD 快讯`/`推荐新闻`来自已发布官网内容；`精选项目`来自已发布项目；`近期活动`来自已发布活动（报名开关只影响详情页报名 CTA）；`媒体专题`来自已发布且至少有一个 ready 素材的画廊；`推荐资源`当前仍是系统预置项。后端需要按这些可用性规则提供候选查询，不能把草稿或已下架记录返回为可选项。

## 11. Receiver's First Actions

1. 阅读 `docs/superpowers/specs/2026-08-07-gallery-direct-upload-design.md`、`docs/superpowers/plans/2026-08-07-gallery-direct-upload-workflow.md` 和本文，确认附件状态、归属和公开快照语义。
2. 阅读 `app/types/content-media.ts`、`app/components/admin/ContentMediaUploader.vue`、`app/stores/gallery.ts`、`app/stores/activities.ts`、`app/stores/projects.ts`，对照当前 Mock 字段设计后端附件 DTO 和发布接口。
3. 阅读 `app/pages/gallery/[slug].vue`、`app/pages/activities/[slug].vue`、`app/pages/projects/[slug].vue`，确认三个公开投影只读取发布快照。
4. 先提交一份后端 API/数据库设计，明确上传状态、附件归属、权限校验、发布事务和已发布文件回收策略，再开始实现接口。
