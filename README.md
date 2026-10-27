# 白云 HSD 开发者部落 Web

## 团队开发入口

前后端统一使用 `main`（稳定发布源）与 `develop`（开发和联调入口）。个人分支从 `develop` 创建，普通任务 PR 回 `develop`。统一验收完成前，若远程尚无 `develop`，请联系维护者，不能从旧 main 自行选择基线。

请先阅读 [开发环境与入组交接](docs/handoffs/development-onboarding.md)、[分支与发布约定](docs/handoffs/team-workflow.md)、[固定生产源码锚点](docs/handoffs/production-source-baseline.json)。main HEAD 不代表已上线；合并不隐含生产发布。

白云 HSD 开发者部落的 Nuxt 4 前端。它提供公开门户、成员空间和管理端页面，并通过浏览器 HTTP API 与部署中的真实服务集成。

## 前端范围

- Nuxt 4、Vue 3、TypeScript、Pinia 和 Tailwind CSS 前端应用。
- 公开门户、项目、活动、画廊、成员名录、成员空间和管理端 UI。
- 浏览器端 API 网关、OpenAPI 快照及其生成的 TypeScript 类型。
- Vitest 单元测试和 Playwright 浏览器测试。

本仓库不包含服务端源代码、数据库、对象数据、运维脚本或运行手册。

## 运行环境

要求 Node.js `>=22.19.0 <23` 与 pnpm `10.33.0`。

```bash
pnpm install
pnpm run dev
```

生产构建与预览：

```bash
pnpm run build
pnpm run preview
```

发布构建需要兼容已打开的旧页面时，必须在构建前将 `HSD_PREVIOUS_RELEASE_PUBLIC` 设置为已核验的上一发布版本 `.output/public` 的绝对路径（真实目录）：

```bash
HSD_PREVIOUS_RELEASE_PUBLIC=/absolute/path/to/verified-release/frontend/.output/public pnpm run build
```

Nuxt 会在 Nitro 生成静态资源清单前保留旧版本的哈希资源，包括 `1009fa88.js` 和 `assessment.5e8f789a.css` 这类裸哈希或带名称前缀的文件；HTML、`latest.json` 和构建元数据均被排除，同名哈希文件内容冲突会中止构建。构建结束后单独复制文件不能代替这一步，因为文件可能存在于磁盘却未注册到服务端清单，HTTP 请求仍返回 404。普通开发和无旧版本的 CI 构建可省略此变量。

发布切换前，确认旧版本清单中的不可变哈希资源路径均已注册到候选服务端清单，并通过候选 HTTP 服务逐项请求旧 JS 和 CSS：状态必须为 200、`Content-Type` 必须分别为 JavaScript 和 `text/css`、响应内容的 SHA-256 必须与已核验的源文件一致。切换后再次执行相同检查。

## 真实 API 接入

将浏览器可访问的 API 根地址设置为 `NUXT_PUBLIC_API_BASE`。生产环境禁止启用 Mock API；只有明确标识的 E2E 场景才可使用测试 Mock。

```bash
$env:NUXT_PUBLIC_API_BASE = "http://127.0.0.1:3001"
pnpm run dev
```

OpenAPI 类型由 `packages/api-client/openapi.snapshot.json` 生成：

```bash
pnpm --filter @hsd/api-client generate
```

## 测试

```bash
pnpm run test:unit
pnpm run typecheck
pnpm run build
pnpm run test:e2e
```

`pnpm run test:e2e` is the default CI Mock suite (95 supported regression tests); it does not load real-stack files or require credentials. A small set of legacy fixture scenarios that assert pre-API-migration labels/counts is available through `pnpm run test:e2e:extended` while those fixtures are being refreshed. Run the real-stack suite separately when its API, browser origin, and test identities are available.

真实环境冒烟测试不会使用 Mock 身份。启动前端候选版本于允许的浏览器来源后，提供真实测试身份（不要将值写入仓库）：

```powershell
$env:HSD_REAL_E2E_BASE_URL = "http://127.0.0.1:3000"
$env:NUXT_PUBLIC_API_BASE = "http://127.0.0.1:3001"
$env:HSD_E2E_OWNER_ACCOUNT = "<owner-account>"
$env:HSD_E2E_OWNER_PASSWORD = "<owner-password>"
$env:HSD_E2E_ADMIN_ACCOUNT = "<admin-account>"
$env:HSD_E2E_ADMIN_PASSWORD = "<admin-password>"
pnpm run test:e2e:real
```

`pnpm run test:e2e:real` explicitly runs `real-stack-smoke.spec.ts` and `baize-project-real-data.spec.ts`. It validates real authentication, permission boundaries, portal, project/activity/gallery/member data, media reads, client hydration, and browser navigation.
