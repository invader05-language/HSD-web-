# HSD 平台前后端团队开发交接文档

核验日期：2026 年 10 月 27 日（北京时间）。适用对象：新加入的前端、后端及联调开发成员。

**入组先做三件事：获得仓库权限，安装 Node.js 22.19.0 和 pnpm 10.33.0，待维护者完成统一验收并通知后，前后端都从 `develop` 创建个人开发分支。`main` 是稳定发布源。若远程尚无 `develop`，说明交接切换尚未完成，请联系维护者，不自行选择旧分支。**

本文依据远程 Git 分支、已部署版本记录、两个项目的配置及源码整理。文中的本地账号、数据库密码和存储密码仅用于开发机上的新环境，不是生产凭据。

## 1. 项目结构、仓库与开发基线

### 1.1 两个独立仓库与统一入口

| 项目 | 仓库 | 可见性 | 开发入口 |
| --- | --- | --- | --- |
| 前端 Web | [HSD-web-](https://github.com/invader05-language/HSD-web-) | Public | `develop` |
| 后端 API / Worker | [HSD_alliance_backend](https://github.com/invader05-language/HSD_alliance_backend) | Private | `develop` |

后端出现 404 时，先登录获邀 GitHub 账号并接受协作者邀请。克隆使用自己的凭据管理器或 SSH 身份，不在 URL 中填写 Token。

### 1.2 分支、源码锚点与上线版本

`main` 保存稳定发布源，`develop` 是团队集成和个人开发入口。维护者完成两个仓库的基线归并、协作文档合并及验证后，才从最终 `main` 创建 `develop` 并通知切换。本文位于候选 PR 时，不代表这些远程步骤已经完成。日常开发显式指定 `develop`，不从历史修复分支启动新任务。

本次归并前生产源码已用同名标签 `baseline/2026-10-27-production` 固定，前端为 `d8bf525d9645dc05d82e319568f5f5f83bcb998d`，后端为 `f466ebcf269d3fa39528af080c9d827553dd81b6`。配套版本见 [固定生产源码锚点](production-source-baseline.json)。整理完成后使用同名 `handoff/2026-10-27` 标签记录最终交接点；只有维护者确认远程标签存在且验收完成后，才可引用它。

两个仓库 SHA 不相同是正常现象；同名标签分别指向自己的提交。`main` HEAD 和交接标签不等于当前上线版本，实际生产版本始终读取发布清单。历史修复分支及后端 `dev1` 保留追溯，不作为新任务入口。完整协作规则见 [团队工作流](team-workflow.md)。

## 2. 技术栈和所需环境

### 2.1 技术栈

| 层次 | 当前使用 |
| --- | --- |
| 前端框架 | Nuxt `4.5.1`、Vue `3.5.40`、TypeScript `5.9.3` |
| 前端状态与样式 | Pinia `4.0.2`、Tailwind CSS `4.3.3` |
| 前端表单 | VeeValidate `4.15.1`、Zod `4.4.3` |
| 前端测试 | Vitest `4.1.10`、Playwright `1.62.0` |
| API 框架 | NestJS `11.1.6`、Fastify `5.4.0`、TypeScript `5.9.3` |
| 数据访问 | Prisma `6.19.0`、PostgreSQL `16` |
| 身份认证 | 服务端 Session、Cookie、CSRF 校验；密码使用 Argon2 |
| 文件处理 | MinIO 私有对象存储、Python 存储桥接服务、ClamAV 扫描 |
| 后台任务 | 独立运行的数据库 Outbox Worker；当前本地组成不要求 Redis |
| 接口契约 | 后端 Swagger / OpenAPI；前端保存快照并生成 TypeScript 类型及响应校验 |

### 2.2 开发机安装清单

| 工具 | 要求 / 用途 |
| --- | --- |
| Git | 克隆、个人分支、提交及 PR |
| GitHub 账号 | 接受后端私有仓库邀请；需要提交代码的成员还需相应仓库写权限 |
| Node.js | 建议统一 `22.19.0`，与现有 CI 和本次核验的服务器一致；项目声明范围 `>=22.19.0 <23`，不要使用 Node 24 |
| pnpm | 固定 `10.33.0`；使用仓库 `pnpm-lock.yaml`，不改用 npm/yarn 生成另一份锁文件 |
| Docker | Windows 使用 Docker Desktop、WSL2 与 Linux 容器；Linux 使用 Docker Engine 和 Compose 插件 |
| 编辑器 | VS Code 可用；前端建议 Vue - Official 扩展，使用 Vue / TypeScript 语言支持 |
| Playwright Chromium | 执行前端浏览器测试时安装 |
| Python | 仅在宿主机开发或测试 storage bridge 时需要，按 CI 使用 `3.12`；仅通过 Docker 启动存储桥不要求宿主机安装 |

安装、切换 Node 版本后，新开终端执行以下检查。本文命令均按 **PowerShell** 编写；其他系统自行替换路径和环境变量语法。

```powershell
node --version
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm --version
git --version
docker version
docker compose version
```

Node 应输出 `v22.19.0`，pnpm 应输出 `10.33.0`。`docker version` 要同时显示 Client 与 Server，只有客户端版本不代表 Docker 已启动。若 `corepack` 不存在，可在已切换至 Node 22 的终端安装 `npm install --global corepack`，再执行上述启用步骤；若启用时报权限不足，调整 Node 安装目录权限或使用有权限的终端。

## 3. 获取代码和建立个人分支

以下使用 `D:\HSD-Team` 作为示例目录，可换为自己的空目录。不要复制维护者带有历史修改的工作目录，也不要把一个仓库嵌套克隆到另一个仓库中。

```powershell
New-Item -ItemType Directory -Path 'D:\HSD-Team' -Force
Set-Location 'D:\HSD-Team'

git clone --branch develop https://github.com/invader05-language/HSD-web-.git hsd-web
git clone --branch develop https://github.com/invader05-language/HSD_alliance_backend.git hsd-api

git -C 'D:\HSD-Team\hsd-web' rev-parse HEAD
git -C 'D:\HSD-Team\hsd-api' rev-parse HEAD
```

先确认当前分支为 `develop`、工作树干净，并记录两仓库 HEAD 作为本地配套起点；不要要求它们等于生产源码锚点。需要同时改前后端的任务，在两个仓库中使用相同的个人分支名，方便配套评审。例如成员 `zhangsan` 开发个人资料页：

```powershell
git -C 'D:\HSD-Team\hsd-web' switch -c codex/zhangsan-member-profile
git -C 'D:\HSD-Team\hsd-api' switch -c codex/zhangsan-member-profile
```

仅修改一个仓库时，只需在对应仓库创建分支。`codex/` 是目前使用的命名约定，可继续采用；它不表示必须由 AI 提交代码。

首次提交前配置自己的 Git 身份：

```powershell
git config --global user.name '你的姓名'
git config --global user.email '你的GitHub提交邮箱'
```

### 分支协作规则

1. 个人分支 `codex/姓名-任务` 从最新 `develop` 创建，普通任务 PR 的 base 明确选 `develop`。
2. 同步前 `git fetch origin`，在个人分支合入 `origin/develop`，解决冲突后重跑受影响检查。跨仓库任务提供配套 PR 和兼容顺序。
3. `develop` → `main` 发布 PR、`main` → `develop` 回灌均使用 merge commit，保留祖先关系。个人短期任务可按团队约定 squash。
4. 不直接 push 或强推共享分支。当前保护是否强制生效以维护者验收记录为准；CODEOWNERS 本身不提供强制阻止能力。人工受控时同样保留 CI 和负责人评审记录。
5. 不提交 `.env`、真实成员名单、数据库转储、对象存储数据或临时凭据。生产发布单独审批和执行。

## 4. 本地后端：配置、数据库和管理员账号

### 4.1 安装依赖

```powershell
Set-Location 'D:\HSD-Team\hsd-api'
pnpm install --frozen-lockfile
Copy-Item -LiteralPath '.env.example' -Destination '.env'
```

仅首次初始化时复制。已有 `.env` 的开发机应先比对新增字段，保留自己的配置，不直接覆盖。

编辑 `.env`，保留模板中的其余字段，将以下值配置为：

```dotenv
NODE_ENV=development
API_HOST=127.0.0.1
API_PORT=3001
CORS_ORIGIN=http://localhost:3000
SESSION_COOKIE_SECURE=false

POSTGRES_DB=hsd
POSTGRES_USER=hsd
POSTGRES_PASSWORD=hsd_local_password
DATABASE_URL=postgresql://hsd:hsd_local_password@localhost:5433/hsd?schema=public

OBJECT_STORAGE_ENDPOINT=http://localhost:9000
OBJECT_STORAGE_PUBLIC_ENDPOINT=http://localhost:9000
OBJECT_STORAGE_BUCKET=hsd-private-media
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_ACCESS_KEY=hsd_minio
OBJECT_STORAGE_SECRET_KEY=hsd_minio_local_password
OBJECT_STORAGE_BRIDGE_URL=http://localhost:3010
OBJECT_STORAGE_BRIDGE_TOKEN=hsd_local_bridge_token
MEDIA_SCANNER_URL=http://localhost:3010/health/scan
UPLOAD_INTENT_TTL_SECONDS=900

BOOTSTRAP_OWNER_STUDENT_ID=209902210001
BOOTSTRAP_OWNER_NAME=本地开发负责人
BOOTSTRAP_OWNER_GRADE=2099
BOOTSTRAP_OWNER_CLASS_NAME=本地开发测试班
BOOTSTRAP_OWNER_PASSWORD=HsdLocalOwner!2026

AUTH_LOGIN_POLICY=v2
LOGIN_DIAGNOSTICS_KEY_VERSION=local-v1
AUTH_VERIFY_MAX_CONCURRENT=2
AUTH_VERIFY_MAX_WAITERS=8
AUTH_VERIFY_MAX_WAIT_MS=2000
```

`209902210001 / HsdLocalOwner!2026` 是本文专为本地新数据库设置的示例账号，不是线上账号。开发机可以更换为自己的虚构身份和密码。`BOOTSTRAP_OWNER_*` 的学号、姓名、年级、班级必须全部填写，缺少其中之一不会创建负责人。

模板的 `AUTH_LOGIN_POLICY` 默认是 `v1`，本交接选择 `v2` 便于覆盖当前登录恢复相关逻辑；因此必须配置下面两个登录策略 HMAC 密钥。再一并配置诊断和密码恢复密钥，使开发机重启后诊断标识稳定。

执行以下命令生成五个独立随机密钥，再把输出分别**替换** `.env` 中对应的空值，避免同一个变量出现多行不同取值：

```powershell
node -e "const {randomBytes}=require('node:crypto'); for(const key of ['PASSWORD_RECOVERY_IP_HASH_KEY','LOGIN_DIAGNOSTICS_ACCOUNT_HMAC_KEY','LOGIN_DIAGNOSTICS_SOURCE_HMAC_KEY','LOGIN_POLICY_ACCOUNT_HMAC_KEY','LOGIN_POLICY_SOURCE_HMAC_KEY']) console.log(key+'='+randomBytes(32).toString('hex'))"
```

这些密钥只在自己的开发环境生成和保存，不复用生产密钥。`v2` 登录策略的两个密钥各要求至少 32 字节，缺失会导致 `AUTH_LOGIN_POLICY_UNAVAILABLE` / 503，不能将其归结为密码错误。

### 4.2 启动 PostgreSQL 并执行迁移

先启动 Docker Desktop，并确认 Linux 容器可用：

```powershell
Set-Location 'D:\HSD-Team\hsd-api'
pnpm db:up
docker compose ps
docker compose exec postgres pg_isready -U hsd -d hsd
pnpm db:generate
pnpm db:migrate
pnpm db:status
pnpm db:seed
```

`pg_isready` 应确认数据库接受连接；若尚未就绪，稍后重试成功后再迁移。`db:status` 应无待执行迁移。这里的 `db:migrate` 实际执行 `prisma migrate deploy`，应用仓库已有迁移。

`db:seed` 初始化四个中心，并按刚才的 bootstrap 配置创建本地联盟总负责人。它不会自动准备完整招新数据；未填写 bootstrap 时通常只有中心、没有可登录账号。已有负责人不会因为修改 `.env` 后再次 seed 就被改密码。

需要成员、中心管理员、批次和报名数据时，用本地负责人在管理端创建虚构数据；不要连接生产库作为个人开发库。

### 4.3 启动 API

在第一个常驻终端运行：

```powershell
Set-Location 'D:\HSD-Team\hsd-api'
pnpm dev
```

在另一个终端验证：

```powershell
Invoke-RestMethod 'http://localhost:3001/api/v1/health/live'
Invoke-RestMethod 'http://localhost:3001/api/v1/health/ready'
```

前者检查进程，后者检查数据库连接。接口文档位于 [本地 Swagger](http://localhost:3001/api/docs)，JSON 位于 `http://localhost:3001/api/docs-json`。API 统一前缀为 `/api/v1`。

## 5. 上传、二维码和异步任务的完整运行环境

只做部分接口或页面开发，可以先使用上一节的 PostgreSQL + API；涉及二维码、头像、媒体、上传扫描和后台处理时，应启动完整依赖。

```powershell
Set-Location 'D:\HSD-Team\hsd-api'
docker compose up -d
docker compose ps --all
Invoke-RestMethod 'http://localhost:3010/health/live'
Invoke-RestMethod 'http://localhost:3010/health/scan'
```

**`pnpm db:up` 只启动 PostgreSQL，不等于启动完整环境。** 完整 Compose 会启动 MinIO、创建私有桶、启动 ClamAV 和存储桥。首次下载扫描病毒库可能较慢；应等 ClamAV、存储桥健康后再测上传。`minio-init` 成功执行后退出是正常现象。

在第二个常驻终端启动 Worker：

```powershell
Set-Location 'D:\HSD-Team\hsd-api'
pnpm worker:dev
```

API 与 Worker 是两个独立进程，Compose 不会替你启动它们。Worker 的开发命令会先构建再运行，修改 Worker 代码后需重启该命令。仅有 API 正常响应，并不能证明文件扫描及后台任务链路完整。

| 本地组件 | 地址 / 端口 | 用途 |
| --- | --- | --- |
| Web | `http://localhost:3000` | 浏览器入口 |
| API | `http://localhost:3001/api/v1` | 业务接口 |
| Swagger | `http://localhost:3001/api/docs` | 接口说明 |
| PostgreSQL | `localhost:5433` | 宿主机连接端口；容器内部为 5432 |
| MinIO S3 | `http://localhost:9000` | 对象上传、读取 |
| MinIO Console | `http://localhost:9001` | 本地对象管理；账号密码来自自己的 `.env` |
| Storage bridge | `http://localhost:3010` | 存储桥接与扫描健康检查 |
| ClamAV | Compose 内部端口 3310 | 病毒扫描，不需要开放给浏览器 |
| Worker | 无 HTTP 入口 | 处理 Outbox 和定时清理任务 |

本地数据默认在 API 仓库的 `.local-data/docker-data/` 下持久保存。建议在首次启动 Compose 前，于 API 的 `.env` 设置 `HSD_LOCAL_DATA_ROOT=D:/HSD-Team/local-data`，将数据放到仓库外；如使用其他路径，保持它指向自己的本地数据目录。提交前注意排除这些数据。结束开发可 `docker compose stop`，并在三个应用终端按 Ctrl+C；不需要删除数据库目录。

Compose 使用固定容器名和端口，一台机器上不要同时照本方案启动两套 API 基础设施；第二套环境需要统一调整项目名、容器名、端口及 URL。

## 6. 前端配置和启动

```powershell
Set-Location 'D:\HSD-Team\hsd-web'
pnpm install --frozen-lockfile
```

在前端仓库根目录新建 `.env`：

```dotenv
NUXT_PUBLIC_API_BASE=http://localhost:3001
NUXT_PUBLIC_USE_MOCK_API=false
```

启动第三个常驻终端：

```powershell
Set-Location 'D:\HSD-Team\hsd-web'
pnpm dev
```

访问 [本地前端](http://localhost:3000)，在 `/login?mode=admin` 使用第 4 节创建的本地负责人登录。

注意以下配置关系：

- `NUXT_PUBLIC_API_BASE` 填 API 的 origin，**不要加 `/api/v1`**；网关已经携带版本前缀。
- 浏览器、前端 API 配置、后端 `CORS_ORIGIN` 统一使用本方案的 `localhost`，不要一端用 `127.0.0.1`、另一端用 `localhost`。
- 本地 HTTP 使用 `SESSION_COOKIE_SECURE=false`；生产 HTTPS 必须走生产的安全配置，不能把本地配置复制上去。
- 真实联调使用 `NUXT_PUBLIC_USE_MOCK_API=false`。Mock 测试成功不能代替真实登录、数据库、二维码下载验证。
- 修改环境变量后重启相关进程。Nuxt 自动改用其他端口时，要释放 3000 或同步调整后端允许的浏览器来源，不能只看页面打开就认为配置正确。

新接口继续使用项目现有的 API gateway 与会话机制，保留 `credentials: include`、Cookie 和写请求的 CSRF 处理，不另建一套仅保存在 localStorage 的登录态。

## 7. 开发者需要知道的代码位置

以下路径均相对于对应仓库根目录，不是本交接文件所在目录。

| 仓库 | 路径 | 用途 |
| --- | --- | --- |
| 前端 | `app/pages/`、`app/layouts/` | 页面路由与布局 |
| 前端 | `app/components/`、`app/assets/` | 组件与样式资源 |
| 前端 | `app/stores/`、`app/composables/` | 共享状态与组合逻辑 |
| 前端 | `app/services/` | 真实 / Mock gateway，包括登录、招新、上传 |
| 前端 | `app/utils/browser-api-base.ts` | 浏览器 API 地址与协议处理 |
| 前端 | `packages/api-client/` | OpenAPI 快照、生成器、类型与响应校验 |
| 前端 | `tests/unit/`、`tests/e2e/` | 单元和浏览器回归 |
| 后端 | `src/main.ts`、`src/app.factory.ts` | API 启动、路由前缀、CORS、全局校验 |
| 后端 | `src/auth/`、`src/password-recovery/` | 登录、Session、限流、密码恢复 |
| 后端 | `src/recruitment/`、`src/assessments/` | 报名、考核、轮次推进、调剂和结果 |
| 后端 | `src/uploads/`、`src/media/`、`src/storage/` | 上传、文件访问和存储适配 |
| 后端 | `src/outbox/`、`src/worker-main.ts` | 异步任务与独立 Worker |
| 后端 | `prisma/schema.prisma`、`prisma/migrations/` | 数据模型与迁移 |
| 后端 | `src/prisma/phase-one-seed.ts` | 四中心与负责人初始化 |
| 后端 | `infra/storage-bridge/` | Python 存储桥服务 |
| 后端 | `test/`、`docs/runbooks/` | 测试和部署、备份等运行手册 |

## 8. 修改接口和数据库时如何协作

### 8.1 接口契约同步

两仓库独立发布，后端改了响应后，前端仍可能使用旧快照并拒绝响应。因此接口改动应提供配套 PR，不只改页面字段。

先确保本地 API `.env`、数据库和迁移可用，在 API 仓库导出：

```powershell
Set-Location 'D:\HSD-Team\hsd-api'
pnpm export:openapi
Copy-Item -LiteralPath '.\docs\contracts\openapi.snapshot.json' -Destination '..\hsd-web\packages\api-client\openapi.snapshot.json'
```

然后在前端生成并验证：

```powershell
Set-Location 'D:\HSD-Team\hsd-web'
pnpm --filter @hsd/api-client generate
pnpm typecheck
pnpm test:unit
```

生成文件为 `packages/api-client/src/generated.ts`，不要手改它代替更新契约。PR 同时说明新增字段、可空性、兼容性及配套仓库的分支 / 提交。保留本地生成器当前写入的注释不代表可以在两个独立仓库中执行不存在的跨仓库 workspace 命令；以本文这组实际脚本为准。

### 8.2 数据库迁移

- 首次安装和同步已有迁移执行 `pnpm db:migrate`；不要用 `db push` 跳过迁移历史。
- 新模型变更在个人本地数据库上创建新迁移，例如 `pnpm exec dotenv -e .env -- prisma migrate dev --name member_profile_note`，再执行 `pnpm db:generate` 并检查 SQL。
- 不修改已应用的历史迁移文件；提交 schema 和新的迁移目录，说明数据兼容性和部署顺序。
- 本地生成工具若要求重建已有数据，先核实目标是个人开发库并保留需要的数据，不能将此步骤用于生产。
- 不使用真实线上库测试 seed、修复脚本或迁移生成。

### 8.3 QA seed 与普通 seed 不同

`pnpm db:seed:qa` 要求 `ALLOW_TEST_SEED=true`，且数据库名必须为 `hsd_test`，还会检查迁移历史。它不能直接用于本文默认的 `hsd` 开发库。新人先使用普通 seed 和本地管理端建数据；需要 QA 固定数据时，另建独立 `hsd_test` 并按仓库测试流程准备，不通过关闭校验来强行导入。

## 9. 提交前检查和测试

### 9.1 前端常规检查

```powershell
Set-Location 'D:\HSD-Team\hsd-web'
pnpm verify:production-web-api-base
pnpm test:unit
pnpm typecheck
pnpm build:verify
pnpm exec playwright install chromium
pnpm test:e2e
```

默认 `test:e2e` 面向测试 Mock，配置会启动自己的测试服务。2026-10-27 执行中发现当前生产源码基线的默认配置还误收集了 `interview-reschedule-closure-real.spec.ts`，缺少专用隔离账号密码时会在收集阶段失败；因此不能将该基线的浏览器 CI 标为通过。应由单独修复分离真实栈场景并完成对应真实验证，不能仅填假密码消除报错或跳过测试掩盖问题。

真实联调测试单独运行。先手动启动真实前后端并准备 spec 所需的本地虚构身份及数据，然后在执行 Playwright 的同一 PowerShell 终端设置：

```powershell
$env:HSD_REAL_E2E_BASE_URL = 'http://localhost:3000'
$env:NUXT_PUBLIC_API_BASE = 'http://localhost:3001'
# 仅填写自己隔离开发库中已创建的虚构账号；不使用生产成员密码
$env:HSD_E2E_OWNER_ACCOUNT = '你的本地负责人账号'
$env:HSD_E2E_OWNER_PASSWORD = '该虚构账号密码'
$env:HSD_E2E_ADMIN_ACCOUNT = '你的本地中心管理员账号'
$env:HSD_E2E_ADMIN_PASSWORD = '该虚构账号密码'
pnpm test:e2e:real
```

Playwright 配置不会自动加载 Nuxt 的 `.env`，所以测试进程也必须显式设置 `NUXT_PUBLIC_API_BASE`，并与页面登录使用相同的 `localhost`；混用 `127.0.0.1` 会使 Cookie 缺失并产生 401。先阅读两个 real-stack spec 的数据前提，不能只填账号就假定覆盖全部场景，更不能将测试指向生产站运行写操作。

### 9.2 后端常规检查

```powershell
Set-Location 'D:\HSD-Team\hsd-api'
pnpm db:generate
pnpm build
pnpm test:release-provenance
# 联调 .env 使用 v2；常规套件中的旧策略断言需要 v1，只在此测试进程设置
$hsdPreviousLoginPolicy = [Environment]::GetEnvironmentVariable('AUTH_LOGIN_POLICY', 'Process')
try {
    $env:AUTH_LOGIN_POLICY = 'v1'
    pnpm test
    if ($LASTEXITCODE -ne 0) { throw "后端测试失败，退出码：$LASTEXITCODE" }
} finally {
    [Environment]::SetEnvironmentVariable('AUTH_LOGIN_POLICY', $hsdPreviousLoginPolicy, 'Process')
}
```

`pnpm test` 会自动创建独立 PostgreSQL 测试容器、使用动态本机端口和 `hsd_test` 数据库、应用迁移，最后清理自身容器。它需要 Docker daemon 可用，并校验 Node 22.19+；不要手工把 `TEST_DATABASE_URL` 指向生产环境。

常规测试 runner 不隔离本地 `.env` 的登录策略，因此上例临时覆盖策略，测试结束恢复原进程值；不修改联调 API / Worker 的 v2 配置，也不移除专门的 v2 测试。招新与登录相关改动可先定向回归，再执行所需完整检查；下列命令也放在上述 `try` 块内使用同样的策略隔离：

```powershell
pnpm test test/assessments.e2e-spec.ts test/assessment-transfers.e2e-spec.ts test/member-stage-results-spec.ts test/auth-login-v2-integration-spec.ts
```

修改存储桥时，在独立 Python 虚拟环境安装 `infra/storage-bridge/requirements.txt` 后执行 `pnpm storage:test`；修改 Worker 时追加 `pnpm worker:verify`。不必把宿主机 Python 作为每位前端成员的首次启动必需项。

### 9.3 必须保留的业务回归

近期生产修复涉及登录、考核并发、关闭批次后的报名读取、调剂结果及二维码权限。改这些模块时至少覆盖：

1. 普通成员、中心管理员、联盟总负责人分别登录；区分密码校验失败、会话获取失败、限流、网络和契约错误。
2. 不同中心管理员同时录入不同成员，互不产生全局版本冲突；同一成员同轮次重复操作遵守现有并发校验。
3. 总负责人推进轮次后，已通过及已确认调剂人员能看到已公开的所属中心和有权限读取的群二维码。
4. 普通调剂到人才、新媒体、策划，以及调入白泽后继续后续考核，分别验证结果文案和图片 HTTP 响应；页面有图片地址不等于图片加载成功。
5. 已关闭批次仍能查询本人报名和已公开结果；未通过且未调剂、未公开的结果不能看到不应开放的群码。
6. 阶段结果公开和最终整批录取是不同业务节点；推进轮次不等于所有人立即成为正式成员。保留总负责人权限与最终身份升级约束。

生产历史记录和旧方案仅用于理解背景。实际行为以本次基线源码、契约和回归测试为准，避免按早期方案重新引入已移除的流程。

## 10. 提交、PR 与发布边界

完成个人分支开发后，逐个检查、暂存与任务有关的文件，再提交推送。例如仅修改前端组件时：

```powershell
git status --short
git diff
# 用实际文件名执行 git add，避免加入本地数据或无关改动
git commit -m "feat: improve member profile editing"
git push -u origin codex/zhangsan-member-profile
```

在 GitHub 创建 PR，普通任务显式指定 `develop` 作为 base；发布 PR 才指向 `main`。PR 描述写明：问题与变更、操作入口、接口 / 数据库改动、配套仓库 PR、执行过的测试及截图。共享基线更新后，在个人分支同步并解决冲突，不向其他人的分支强推。

协作配置生效后，CI 对目标为 `main` / `develop` 的 PR、这两个分支的 push 运行，并提供手动触发。个人分支单独 push 没有 CI 结果不代表通过；创建 PR 后查看实际 `verify` 检查。合并须有非作者评审，检查通过不能代替评审。

**代码合并、推送和生产部署是三个步骤。** 新成员先在本地和 PR 中交付；生产发布由维护者按 API 仓库的 `docs/runbooks/deployment.md` 等手册执行，包含前后端配套 SHA、迁移、备份、构建、健康检查和回退。不要直接编辑服务器运行目录。

前端发布特别保留现有旧页面哈希资源兼容流程：构建前使用已核验上一版本的 `.output/public` 设置 `HSD_PREVIOUS_RELEASE_PUBLIC`，并按 README 检查旧 JS/CSS 的 HTTP 响应及内容。不能把本地普通 `pnpm build` 当作完整生产发布流程。

## 11. 常见故障排查

| 现象 | 优先检查 |
| --- | --- |
| GitHub 后端仓库 404 / 克隆被拒绝 | 登录身份、协作者邀请是否接受、Git 凭据是否属于该身份 |
| pnpm 安装提示 engine 不匹配 | `node --version` 是否为 22.19+ 且小于 23；`pnpm --version` 是否为 10.33.0；新开终端检查 PATH |
| Docker 只有 Client，提示 Linux engine pipe 不存在 | 启动 Docker Desktop、切到 Linux 容器，确认 WSL2 后端正常 |
| API 无法连接数据库 | PostgreSQL 是否 healthy；宿主机端口应为 5433；`.env` 的 DB 用户、密码、库名与容器初始化配置是否一致 |
| 修改 DB 密码后连接仍失败 | 已初始化的数据目录不会因修改 Compose 环境变量自动改数据库密码，需按本地数据状态处理 |
| 管理员账号不存在 | bootstrap 四项身份信息是否齐全；是否执行 seed；是否正在连接刚配置的开发数据库 |
| 改了 bootstrap 密码但旧账号仍登不进去 | seed 不覆盖已有密码，使用本地管理流程处理，不反复 seed 猜测 |
| 登录返回 503 / policy unavailable | `AUTH_LOGIN_POLICY=v2` 的两项 HMAC 密钥、数据库迁移及数据库可用性 |
| 登录 200 后又 401 / 写请求 403 | Cookie、浏览器 host、CORS origin、Secure 配置、CSRF；不要只核对密码 |
| 前端接口 404、重复 `/api/v1` | `NUXT_PUBLIC_API_BASE` 是否错误附加了接口前缀，修改后重启前端 |
| QR 上传失败、一直处理中或图片打不开 | MinIO、桶初始化、ClamAV、存储桥、Worker，上传完成状态、图片请求权限与响应；分开查上传与读取 |
| 页面显示响应格式不正确 | 后端 DTO 与 OpenAPI 是否一致；前端快照和 generated.ts 是否同步 |
| 考核结果被误判为空 / 无本期申请 | 检查本人结果上下文与报名读取路径，不只按公开报名批次筛选；覆盖关闭批次场景 |
| 类型生成注释里的命令不能运行 | 两个项目已拆成独立仓库，按第 8 节先导出、复制快照、再生成 |

## 12. 首日交付验收清单

### 维护者交接前

- [ ] 邀请新成员加入需要的仓库，确认已接受邀请并可 clone。
- [ ] 确认两个仓库统一验收完成，告知 `develop` 入口、配套 HEAD、交接标签和个人任务范围。
- [ ] 明确 PR 评审人、当前 base 分支和发布负责人；如已建立新集成分支，更新本文。
- [ ] 如需共享测试环境，单独提供测试入口及专用虚构账号；日常开发不需要生产服务器密钥。

### 新成员完成环境搭建后

- [ ] 两仓库来源、分支和 Node/pnpm 版本正确。
- [ ] 已创建自己的功能分支，依赖按锁文件安装成功。
- [ ] 本地 API live / ready 成功；数据库迁移状态正常。
- [ ] 本地负责人登录成功，至少创建一名虚构成员并验证成员登录。
- [ ] API、Worker、Web 运行；涉及上传时所有存储依赖健康。
- [ ] 完成一张测试二维码上传、管理端预览、具备权限成员端实际加载图片的联调。
- [ ] 前端类型检查、构建及相关测试通过；后端构建及相关隔离测试通过。
- [ ] PR 正确选择基线，提交中没有 `.env`、个人数据、持久化目录或密钥。

## 13. 核验范围与交接状态

环境和命令依据对应生产源码锚点的 package.json、锁文件、Compose、seed、CI、OpenAPI 和会话实现整理。本文是可执行的搭建指引，不代表每一台开发机都已完成启动验收；请按第 12 节逐项记录真实结果。

维护者的最终验收记录必须列出两仓库 main / develop SHA、远程标签、PR、CI、真实联调结果以及保护规则实际状态。若仍有待合并 PR、自动发布触发未核实、Docker 不可用或失败检查，则不能宣布全部交接条件完成，也不能让新人自行绕过这些条件。

进一步阅读：

- [前端 README](https://github.com/invader05-language/HSD-web-/blob/develop/README.md)
- [后端 README](https://github.com/invader05-language/HSD_alliance_backend/blob/develop/README.md)（需权限）
- [后端运行手册](https://github.com/invader05-language/HSD_alliance_backend/tree/develop/docs/runbooks)
- [后端环境模板](https://github.com/invader05-language/HSD_alliance_backend/blob/develop/.env.example)

上述 develop 链接仅在统一验收和分支创建后可用。当前业务行为以源码、契约和回归测试为准，不能将旧阶段 README 描述当作最新运行证据。
