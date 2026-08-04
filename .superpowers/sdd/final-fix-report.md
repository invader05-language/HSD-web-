# 内容与门户整分支最终修复报告

## 1. 状态

- **分支**：`codex/login-admin-access`
- **修复基线**：`19036cd93d86069bd38c030457fbcf705804303b`
- **范围**：Nuxt / Pinia / localStorage 前端 Mock；未实现后端、数据库、消息队列、微信或 LLM。
- **后端契约**：`docs/backend-requirements/HSD-BE-PORTAL-001-content-automation.md` 继续保持 `BACKEND_REQUIRED`。

## 2. 已完成修复

1. `/activities/**` 与 `/updates/**` 明确设置 `ssr: false`，与浏览器本地发布状态保持同一渲染边界。
2. 招新批次 `publishBatch()` 与 `updateBatch()` 先计算候选有效状态；任何会得到 `open` 的命令都先执行单开放校验，冲突时不修改批次、审计或自动化内容。时间修改成功进入开放窗口后才发出版本化事件。
3. 官网内容命令改为“持久化候选状态成功后再更新内存”。创建、更新、提交、审核、发布、下架失败统一抛出 `PORTAL_CONTENT_PERSISTENCE_FAILED`，旧工作状态与公开快照不变。
4. 系统草稿持久化失败保留完整事件、语义键、错误码和自动化失败审计；招新与活动 Store 暴露相同语义键并可重试。重复事件继续记录审计且不创建第二条草稿。
5. Owner 内容编辑页支持填写必填退回原因并执行 `returnToDraft()`；官网内容列表显示自动化失败并按语义键重试；活动管理页提供 Store 支持的“开放报名”操作，成功后才处理 `activity.registration.opened`。
6. 内容审计补齐 actor、action、targetId、beforeRevision、afterRevision、reason、actualAt 和适用的 sourceEventId。门户整份发布新增带前后版本和 actor 的持久化审计。
7. 内容 Store 在创建、更新、提交、审核、发布各边界校验非空标题、非空摘要、安全站内目标、合法图片素材，以及新闻/公告的有意义结构化文本。语义无效的恢复数据被拒绝。
8. `/updates/[slug]` 使用 `resolvePortalAssetSource()` 渲染已批准图片块，保留 alt/caption；素材无法解析时显示占位回退，图片在移动端受 `max-width: 100%` 约束。
9. 门户草稿保存也改为持久化成功后再更新内存，避免 localStorage 失败造成草稿状态污染。

## 3. TDD 证据

- 初始相关基线：6 个文件、69 个测试通过。
- 第一轮新增回归 RED：6 个文件中 13 个行为测试失败，分别覆盖 SSR、单开放、持久化、自动化重试、审计、校验、可达工作流和图片渲染。
- 响应式图片回归 RED：缺少 `public-update-detail__image` 约束时 1 个测试失败。
- 门户草稿持久化回归 RED：`saveDraft()` 未抛稳定错误且先污染内存时 1 个测试失败。
- 最终 focused GREEN：6 个文件、81 个测试通过；门户配置专项 19/19 通过。

## 4. 验证

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| Focused regressions | `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/portal-content.test.ts tests/unit/portal-automation.test.ts tests/unit/portal-config.test.ts tests/unit/recruitment-batch-rules.test.ts tests/unit/content-details.test.ts tests/unit/admin-content.test.ts` | 6 files / 81 tests passed |
| Full unit | `sh scripts/with-hsd-node.sh corepack pnpm run test:unit` | 37 files / 296 tests passed |
| Typecheck | `sh scripts/with-hsd-node.sh corepack pnpm run typecheck` | passed, exit 0 |
| Production build | `sh scripts/with-hsd-node.sh corepack pnpm run build` | passed, `Build complete!` |
| E2E | `NUXT_TELEMETRY_DISABLED=1 sh scripts/with-hsd-node.sh corepack pnpm run test:e2e` | blocked before test discovery: repeated `EMFILE: too many open files, watch`; web server timed out after 120000 ms; no Playwright assertion ran |
| Diff hygiene | `git diff --check` | passed |

## 5. 边界确认

- **Frontend Mock**：所有持久化与自动化仍是浏览器本地 Mock，不声称生产能力。
- **权限**：普通管理员仍只能创建、编辑、预览和提交；Owner 执行退回、审核、发布、下架和门户发布。
- **保留行为**：Help Center 继续关闭，Banner 继续重定向；slug 稳定、门户原子发布和同类型补位规则未改变。
- **隔离**：未修改 session 身份权威、成员投影、招新申请隔离或隐私规则。
- **明确不做**：未加入微信、LLM、抓取、后端 API、数据库或真实上传。

## 6. 剩余风险

- Playwright 因本机 Nuxt watcher `EMFILE` 未进入浏览器断言，桌面/移动端交互需要在可启动 webServer 的环境重跑。
- 活动管理现阶段仍同时展示既有 `ADMIN_ACTIVITY_RECORDS` Mock 工作区和新的 `useActivitiesStore()` 报名状态控制；开放事件已走真实 Store 命令，但后续活动领域正式仓库落地时应合并这两套展示来源。
- localStorage schema 版本已提升；旧版本 Mock 数据会按既有策略回退到种子数据，不执行生产迁移。
