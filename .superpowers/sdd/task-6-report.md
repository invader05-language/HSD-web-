# Task 6 报告：迁移清理与完整验证

## 1. 状态

- **迁移状态**：完成。首页快讯和新闻只读取 `usePublishedPortal`，旧 `FLASH_NEWS` / `NEWS` 静态导出已删除。
- **边界状态**：完成。官网首页和共享 `PageBanner` 不再直接导入 `app/data/admin-assets.ts`；已审核公开素材通过中立的 `app/data/portal-assets.ts` 白名单解析。
- **验证状态**：`DONE_WITH_CONCERNS`。单元测试、类型检查、生产构建和 1440px 首页烟测通过；完整 Playwright 因 Nuxt 开发服务器触发 `EMFILE` 而在任何页面断言前超时，不能将 E2E、390px、键盘和完整权限/重定向浏览器流程记为通过。
- **分支与验证前 HEAD**：`codex/login-admin-access` at `af81e15`。
- **生产后端**：`docs/backend-requirements/HSD-BE-PORTAL-001-content-automation.md` 仍为 `BACKEND_REQUIRED`。本轮 Pinia / `localStorage` Mock 不替代后端鉴权、事务、审计、幂等事件或跨设备持久化。

## 2. 本轮改动

- `app/data/home.ts`：删除无消费者的静态 `FLASH_NEWS` 和 `NEWS`，消除发布投影切换后的双数据源。
- `app/data/portal-assets.ts`：新增公开门户素材 ID 到已打包资源的只读白名单解析器。
- `app/data/admin-assets.ts`：管理端素材 fixture 复用中立解析器，不再向公开渲染层导出解析函数。
- `app/pages/index.vue`、`app/components/PageBanner.vue`：公开渲染改读中立素材边界。
- `tests/unit/home-content.test.ts`：新增静态数组清理和公开页面不得导入 `admin-*` 内容/素材 fixture 的迁移契约。
- `tests/unit/portal-visual.test.ts`：视觉解析测试改读公开门户素材边界。
- 未修改批准文案或路由；现有 `/activities`、`/updates/:slug`、`/help`、`/admin/content/help` 和 `/admin/content/banners` 合同保持不变。

## 3. TDD 与迁移扫描

- RED：`sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/home-content.test.ts`，5 个测试中 2 个按预期失败：旧静态导出仍存在，公开首页仍导入 `~/data/admin-assets`。
- GREEN：`sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/home-content.test.ts tests/unit/portal-visual.test.ts`，2 个文件、8 个测试通过。
- `rg -n "FLASH_NEWS|\bNEWS\b" app tests --glob '!tests/unit/home-content.test.ts'`：无匹配。
- 对非管理端页面、组件、布局和 composable 扫描 `data/admin-content` 与 `data/admin-assets`：无匹配。
- 更宽泛的 `data/admin-*` 扫描仍会命中 `app/composables/useMemberRepository.ts -> app/data/admin-members.ts`；这是既有成员身份仓库适配器，不属于本次内容门户 fixture 迁移范围，本轮未改动。

## 4. 完整验证

| 检查 | 精确命令或证据 | 结果 |
| --- | --- | --- |
| 单元测试 | `sh scripts/with-hsd-node.sh corepack pnpm run test:unit` | **通过**，37 个文件、282 个测试，退出码 0 |
| 类型检查 | `sh scripts/with-hsd-node.sh corepack pnpm run typecheck` | **通过**，退出码 0 |
| 生产构建 | `sh scripts/with-hsd-node.sh corepack pnpm run build` | **通过**，Nuxt client、SSR、Nitro 完成；首页 Banner 资源 31.73 kB，退出码 0 |
| 完整 E2E | `NUXT_TELEMETRY_DISABLED=1 sh scripts/with-hsd-node.sh corepack pnpm run test:e2e` | **环境阻塞**，Nuxt watcher 多次 `EMFILE: too many open files, watch`，120000 ms WebServer 超时，退出码 1；未收集到产品断言失败 |
| 1440px 首页 | 生产构建 Nitro 服务，gstack browse `1440x900` | **通过烟测**，HTTP 200、无 console error、根节点无横向溢出；首个公开项目为“智巡先锋”，快讯和新闻显示明确空状态 |
| 390px / 键盘 / 完整权限与重定向浏览器流程 | Playwright 计划覆盖 | **本轮未通过浏览器执行**；E2E 在页面断言前被 `EMFILE` 阻塞，不能用单元测试代替浏览器通过声明 |

## 5. HSD 边界检查

| 项目 | 结论 | 证据 |
| --- | --- | --- |
| 前端范围 | confirmed | 仅 Nuxt / Pinia Mock、静态资源解析与测试契约；没有 API、数据库或真实认证改动 |
| 身份与招新隔离 | not applicable | 本轮未修改 `sessionStore.currentMemberId`、成员资料或招新写入链路 |
| 公开/管理投影 | confirmed | 公开快讯/新闻继续由 `usePublishedPortal` 读取；公开视觉只读取 `portal-assets` 白名单，不读取管理 fixture |
| Mock 与隐私边界 | confirmed | 没有新增个人字段公开投影；`HSD-BE-PORTAL-001` 保持 `BACKEND_REQUIRED` |
| 路由与权限 | confirmed by fresh unit suite; browser unverified | 单元套件覆盖 Help/Banner 重定向、普通管理员发布拒绝、负责人发布路径；完整浏览器流程受 `EMFILE` 阻塞 |
| 桌面/移动/可访问性 | at risk | 1440px 首页烟测通过；390px、Tab/方向键/Escape 的本轮浏览器验证未完成 |

## 6. 风险与后续

1. 在文件监听额度正常且 Chrome 可启动的环境重新运行完整 E2E；只有页面断言实际执行后才能关闭浏览器验证缺口。
2. 至少复核 390px 首页和 `/admin/content/home` 无横向溢出，并执行 Tab、ArrowLeft/ArrowRight、Home/End、Escape 和焦点恢复流程。
3. 以普通管理员和联盟总负责人分别执行内容/门户发布权限流程，并复核 Help 与 Banner 旧路由重定向、草稿隔离和发布后公开投影。
