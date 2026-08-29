# HSD 当前版本提交、PR 与服务器部署实施方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前已完成的前后端改动整理成可审计提交，分别推送并创建 PR；在双仓库验证、PR 合并和主分支 CI 全部通过后，以不可变 Release 方式部署到服务器当前共享测试环境，完成验收与回滚留档。

**Architecture:** 前端与后端保持两个独立仓库、两个独立 PR，并用最终合并 SHA 组成同一个 Release。发布目标沿用服务器当前环境文件 `/var/lib/hsd/hsd-http-test.env`，继续连接 `hsd_test` 和 `hsd-test`；本次只发布代码，不切换到正式库 `hsd`。服务器采用 `/var/www/hsd/releases/<release-id>` 不可变目录、固定最高优先级 systemd drop-in 和原子 `current` 软链接切换；API 先在 `18080` 候选端口验证，正式切换失败时同时恢复 `current`、三个服务的 `WorkingDirectory` 和服务状态。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、Vitest、Playwright、NestJS 11、Prisma 6、PostgreSQL 16、Python/FastAPI 存储桥、pnpm 10.33、Node.js 22.19、GitHub Pull Requests/Actions、systemd、Nginx。

---

## 当前基线与执行边界

截至 2026-08-29 的只读复核结果：

| 项目 | 当前状态 | 本方案要求 |
| --- | --- | --- |
| 前端 `origin/main` | `f9ead35dd54983ab3de9beca530f47349b1d878a` | 当前工作分支 `codex/dev-prep-20260828` 整理后提 PR |
| 后端 `origin/main` | `8d38a5f0830e27af977db664341c85b753d5601c` | 当前工作分支 `codex/20260829-real-data-contacts` 整理后提 PR |
| GitHub 开放 PR | 前后端均为 0 | 新建一前一后两个 PR，并互相链接 |
| 前端 CI | 最新 `main` 失败，102/103 个 E2E 通过 | 先关闭项目负责人任命 E2E 红灯，PR 和合并后 `main` 都必须全绿 |
| 后端 CI | 尚无 GitHub Actions 工作流 | 本次后端 PR 增加 CI，至少覆盖 build、隔离 PostgreSQL 测试和存储桥测试 |
| 服务器 Release | `20260827T200031Z-8d38a5f0-f9ead35d` | 新 Release 必须由两个已合并的 `main` SHA 构建 |
| 服务器服务 | API、Worker、Web、Nginx 均 active，`NRestarts=0` | 切换前后记录并比较 |
| 服务器健康 | `/api/v1/health/live`、`/api/v1/health/ready`、Web 均为 200 | 作为发布及回滚健康闸门 |
| 当前服务数据源 | `hsd_test`、对象桶 `hsd-test` | 保持不变，不把服务指向 `hsd` |

执行边界：

- 只提交经过逐文件审核的当前产品改动与本方案；其他历史计划、交接文档、临时日志、备份、数据库 dump、截图、密钥和本地环境文件不得进入 PR。
- 不使用 `git add .` 或 `git add -A`；每个提交都使用显式文件白名单，并在提交前检查 `git diff --cached`。
- 不从本地未提交目录、PR head 或未经 CI 的 commit 部署。服务器只接收两个仓库已经合并到 `main` 的固定 SHA。
- 本次部署目标是当前共享测试环境，不等同于正式生产启用。正式库 `hsd` 只做联系人数据的只读一致性核验，不改变服务连接配置。
- 当前后端 diff 未包含 `prisma/schema.prisma` 或 `prisma/migrations/**`。执行时若出现 schema/migration 变化，立即停止常规发布，转入数据库迁移审批流程。
- 备份与发布审计文件保存到 `E:/HSD-LocalData` 或服务器专用备份目录，不占用 C 盘，也不提交 Git。

## Task 1：冻结发布范围并建立审计清单

**Files:**

- Create: `E:/HSD-LocalData/audits/releases/<release-id>/frontend-status.txt`
- Create: `E:/HSD-LocalData/audits/releases/<release-id>/backend-status.txt`
- Create: `E:/HSD-LocalData/audits/releases/<release-id>/manifest.json`

- [ ] 在两个仓库分别执行 `git status --short --branch`、`git diff --stat`、`git diff --check`、`git ls-remote origin refs/heads/main`，将输出写入仓库外审计目录。
- [ ] 用 `git diff --name-status` 和未跟踪文件列表建立逐文件白名单；发现不属于本轮联系人、QA 账号、本地数据工具、管理端文案、生命周期摘要、项目保存/发布修复或 CI 的文件时，从发布范围中排除并保留原状。
- [ ] 扫描 staged 候选内容，拒绝提交 `.env`、数据库 URL、SSH 密钥、对象存储凭据、有效会话、dump、`node_modules`、`.output`、`dist` 和测试产物。
- [ ] 把两个基线 SHA、分支名、允许文件、排除文件、Node/pnpm/Python/Docker 版本写入 `manifest.json`。

## Task 2：关闭前端既有 CI 红灯

**Files:**

- Inspect/Modify if required: `E:/文档/ChatGPT/HSD/tests/e2e/admin-member-position-actions.spec.ts`
- Inspect/Modify if required: `E:/文档/ChatGPT/HSD/app/pages/admin/members/[id].vue`
- Inspect/Modify if required: `E:/文档/ChatGPT/HSD/app/components/admin/OrganizationPositionActionDialog.vue`

- [ ] 先单独复现：`pnpm exec playwright test tests/e2e/admin-member-position-actions.spec.ts --project=desktop-chromium`。
- [ ] 确认失败根因是项目目录请求、页面加载时序或选择器契约，不以增加任意 sleep 或跳过测试掩盖问题。
- [ ] 若是测试拦截时序问题，使 `/api/v1/admin/projects` stub 在页面首次加载时稳定返回真实 `projectId`；若是产品代码没有等待项目列表，则修复 loading/empty/error 状态并补单元测试。
- [ ] 重跑该用例至少 3 次，随后执行完整 `pnpm run test:e2e`，要求 103/103 或更新后的全部用例通过。

## Task 3：为后端建立 GitHub CI 闸门

**Files:**

- Create: `E:/文档/ChatGPT/HSD_alliance_backend/.github/workflows/ci.yml`

- [ ] 配置 `pull_request` 和 `push: main` 触发，使用 Ubuntu、Node `22.19.0`、pnpm `10.33.0`、Python 3.12。
- [ ] CI 依次执行 `pnpm install --frozen-lockfile`、`pnpm exec prisma generate`、`pnpm build` 和 `pnpm test`；后端测试脚本自行创建并回收 `postgres:16-alpine` 隔离容器。
- [ ] 使用 `python -m pip install -r infra/storage-bridge/requirements.txt` 安装 FastAPI/boto3/uvicorn，再执行 `pnpm storage:test`。
- [ ] 设置合理超时，确保失败时仍能由现有测试脚本回收其拥有的 `hsd-test-<uuid>` 容器；不得连接服务器数据库或复用开发库。
- [ ] 使用 GitHub Actions YAML 静态检查，并在 PR 上确认首次 CI 实际完整运行。

## Task 4：完成双仓库本地发布验证

**Frontend commands:**

```powershell
Set-Location 'E:/文档/ChatGPT/HSD'
pnpm install --frozen-lockfile
pnpm run test:unit
pnpm run typecheck
pnpm run build
pnpm run test:e2e
pnpm exec playwright test tests/e2e/task-3c-admin-content-real.spec.ts tests/e2e/task-3c-admin-audit-real.spec.ts tests/e2e/task-3c-admin-uploads-real.spec.ts tests/e2e/task-3c-admin-resources-real.spec.ts tests/e2e/task-3c-recruitment-batches-real.spec.ts tests/e2e/task-3c-admin-recruitment-lifecycle-real.spec.ts tests/e2e/task-3c-admin-recruitment-workspaces-real.spec.ts --config playwright.config.task-3c-real.ts
```

**Backend commands:**

```powershell
Set-Location 'E:/文档/ChatGPT/HSD_alliance_backend'
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm run build
pnpm test
$storagePython = 'E:/HSD-LocalData/venvs/storage-bridge/Scripts/python.exe'
& $storagePython -m pip install -r infra/storage-bridge/requirements.txt
& $storagePython -m unittest discover -s infra/storage-bridge -p test_main.py
```

- [ ] Docker 不可用时不跳过后端全量测试；先恢复 Docker Desktop，再执行 `pnpm test`。
- [ ] 保留每条命令的退出码、测试数量和日志路径。任何失败都先定位并修复，不带已知红灯进入 PR。
- [ ] 对项目管理进行真实本地回归：编辑已有项目保存成功、创建中文标题项目成功、发布成功、字段错误显示中文且不会丢失。
- [ ] 对报名考核结果页回归联系人复制；对生命周期审计表确认只显示用户可读的“状态变化”，不再显示专业英文摘要。

## Task 5：按逻辑拆分前端提交

**Allowed frontend groups:**

1. 联系人展示与复制：`app/data/member-results.ts`、`app/pages/member/results.vue`、`tests/unit/member-results.test.ts`。
2. 项目保存/发布与字段错误：`app/components/admin/ProjectEditor.vue`、`app/services/content/api-content.gateway.ts`、`app/stores/projects.ts`、`tests/unit/projects-activities-api-gateway.test.ts`。
3. 管理端提示文案与生命周期摘要：本轮修改的 admin 组件/页面、`app/utils/recruitment-lifecycle-copy.ts`、`tests/unit/recruitment-lifecycle-copy.test.ts`。
4. 开发卫生与执行记录：`.gitignore` 和本方案文件；其他未跟踪 handoff/plan 默认排除。

- [ ] 每组使用显式 `git add -- <paths>`，然后运行 `git diff --cached --check` 和 `git diff --cached`。
- [ ] 建议提交信息依次为 `feat(member): update result contact directory`、`fix(admin): repair project save and publish feedback`、`refactor(admin): simplify operational copy`、`docs: add paired release deployment plan`。
- [ ] 每个提交后运行与该提交直接相关的单元测试；全部提交完成后再次运行 `git status --short`，确认只剩明确排除的用户文件。

## Task 6：按逻辑拆分后端提交

**Allowed backend groups:**

1. 本地数据与环境核验工具：`.gitignore`、`compose.yaml`、`scripts/compare-environment-content.ts`、`scripts/sanitize-local-dev-snapshot.ts`、`test/environment-content-comparison-spec.ts`。
2. 联系人与白泽部长 QA 账号：`docs/runbooks/qa-manual-test-accounts.md`、`package.json`、`src/assessments/assessments.service.ts`、`src/prisma/qa-manual-account-access.ts`、联系人/QA 脚本及对应测试。
3. 项目字段校验错误契约：`src/app.factory.ts`、`src/common/errors/http-error.filter.ts`、`src/projects/dto/project.dto.ts`、`test/http-security-spec.ts`。
4. 后端 CI：`.github/workflows/ci.yml`。

- [ ] 每组使用显式文件白名单暂存并自审；尤其确认测试账号脚本不包含真实生产密码，密码只允许执行时通过环境变量注入。
- [ ] 建议提交信息依次为 `chore(dev): add local data verification tooling`、`feat(qa): add minister contacts and white-ze test account`、`fix(projects): return field-level validation errors`、`ci: verify backend build database and storage tests`。
- [ ] 运行 `git diff origin/main...HEAD -- prisma/schema.prisma prisma/migrations`；预期无输出。若有输出，停止并单独审查迁移。

## Task 7：同步主分支、推送并创建双 PR

- [ ] 提交完成后重新读取远端 `main`。若远端前进，在各自干净工作树上执行 `git fetch origin` 和 `git rebase origin/main`，解决冲突后重跑 Task 4 全部验证。
- [ ] 推送当前明确命名的 `codex/*` 分支，不强推；如重写历史确有必要，使用 `--force-with-lease` 前再次核对远端分支无人更新。
- [ ] 先创建后端 PR，再创建前端 PR；两个 PR 描述均包含变更范围、测试证据、数据库/迁移影响、数据源边界、回滚方式和另一个 PR 的链接。
- [ ] 后端 PR 明确声明：QA 白泽部长账号只允许存在于 `hsd_test`；联系人同步脚本允许 `hsd`、`hsd_test`、`hsd_dev`，但默认 dry-run 且需数据库名、manifest SHA 和显式 `--apply --confirm`。
- [ ] 前端 PR 明确声明：服务器需先运行包含字段错误契约的后端版本；同时记录该 PR 已关闭历史 CI 用例 `admin-member-position-actions.spec.ts` 的红灯。

## Task 8：PR 审核、合并与主分支 SHA 锁定

- [ ] 等待后端 PR CI 全绿并审阅 diff；再合并后端 PR。
- [ ] 等待前端 PR 的 unit、typecheck、build、完整 Playwright 和 production-mode API E2E 全绿；再合并前端 PR。
- [ ] 合并策略优先 squash merge；不得绕过失败检查或使用管理员强制合并。
- [ ] 两个 PR 合并后，等待各自 `push: main` CI 再次全绿。前端历史 `main` CI 红灯必须被新的绿色 main run 取代。
- [ ] 用 `git ls-remote` 和 GitHub API 记录最终 `BACKEND_SHA`、`FRONTEND_SHA`、PR 编号、merge commit、CI run URL；Release 名称使用 `YYYYMMDDTHHMMSSZ-<backend8>-<frontend8>`。

## Task 9：服务器发布前检查与备份

- [ ] 只读记录 `/var/www/hsd/current`、三个 systemd `WorkingDirectory`、环境文件路径、`NRestarts`、端口、live/ready/Web 状态和磁盘空间。
- [ ] 复核当前环境仍为 `/var/lib/hsd/hsd-http-test.env`，数据库名为 `hsd_test`、桶为 `hsd-test`；输出只显示名称，不显示完整连接串或凭据。
- [ ] 对服务器 `hsd_test` 建立部署前 PostgreSQL custom dump，并对 `hsd-test` 建立对象清单/备份；记录 SHA-256、对象数、大小和恢复命令。备份文件保存在服务器专用目录，并把审计清单下载到 `E:/HSD-LocalData/audits/releases/<release-id>`。
- [ ] 使用 `verify-center-minister-contacts.ts` 对 `hsd_test` 和 `hsd` 分别只读验证 7 位已批准联系人；使用白泽 QA 脚本的只读模式确认账号 `202699990010` 只存在于 `hsd_test`。
- [ ] 若联系人核验失败，不在部署脚本中顺手写库。停止发布，先按既有 manifest、SHA、备份、dry-run、`--apply --confirm <database>` 流程单独修复并重新核验。
- [ ] 再次确认合并 SHA 没有 migration 变化。若有迁移，先在隔离恢复库演练，再只对 `hsd_test` 执行 `prisma migrate deploy`；不得自动迁移正式库 `hsd`。

## Task 10：构建不可变候选 Release

- [ ] 在服务器临时构建目录按精确 `BACKEND_SHA` 和 `FRONTEND_SHA` checkout 两个仓库，验证 `git rev-parse HEAD` 与锁定值一致。
- [ ] 使用服务器 `/opt/hsd/node/bin` 下的 Node 22.19 和 pnpm 10.33，禁止上传 Windows `node_modules`、`.output` 或 `dist`。
- [ ] 后端执行 frozen install、Prisma generate、build；前端执行 frozen install、production build。将后端运行产物与依赖组装到 `<release>/backend`，将 Nuxt `.output` 内容组装到 `<release>/frontend`，使入口分别为 `dist/main.js`、`dist/worker-main.js` 和 `server/index.mjs`。
- [ ] 生成 Release manifest，包含两个完整 SHA、lockfile SHA-256、构建时间、Node/pnpm 版本、迁移数量和产物摘要；设置目录所有者为 `ubuntu`，不得在构建后修改 Release 内容。
- [ ] 保留当前 Release 与至少一个更早可用 Release，发布前不得清理历史版本。

## Task 11：候选端口验证

- [ ] 从现有 `hsd-api` unit 读取 `User`、`EnvironmentFile` 和安全属性，以新 Release 后端为 `WorkingDirectory`，用临时 systemd unit 启动候选 API，并通过 `API_PORT=18080` 覆盖端口。
- [ ] 不启动第二个 Worker，避免同一 outbox 被两个版本并发消费。
- [ ] 对 `http://127.0.0.1:18080/api/v1/health/live` 和 `/ready` 验证 200；执行公开内容读取、登录、项目读取以及 OpenAPI/契约烟测。
- [ ] 候选验证完成后停止并清理临时 unit。任何启动、迁移、配置或契约异常都中止切换，当前线上服务保持不动。

## Task 12：原子切换正式服务目录

- [ ] 记录 `OLD_RELEASE`，为 API、Worker、Web 各创建同名固定最高优先级 drop-in：`zzzzzzzz-current-release.conf`；只覆盖 `WorkingDirectory`，API/Worker 继续显式使用 `/var/lib/hsd/hsd-http-test.env`。
- [ ] 先写临时文件并校验路径存在，再用 `install` 原子替换 drop-in；不删除历史 drop-in，本固定文件作为今后唯一活动发布指针。
- [ ] 用临时软链接加 `mv -T` 原子切换 `/var/www/hsd/current`，执行 `systemctl daemon-reload`。
- [ ] 停止 Worker，重启 API；等待 `/api/v1/health/ready` 为 200 后重启 Web并验证首页，再启动 Worker。API 未 ready 时不得启动新 Worker。
- [ ] 确认 `current` 与三个 `WorkingDirectory` 都指向同一个新 Release，API 与 Worker 使用相同后端 SHA，Web 使用锁定前端 SHA。

## Task 13：部署后业务验收

- [ ] 基础检查：四个服务 active，三个 HSD 服务 `NRestarts=0`，3000/3001 正常监听，候选 18080 已关闭，live/ready/Web 200。
- [ ] 公共端检查：首页新闻与动态、时间线、项目、活动、图集、资源及媒体正常渲染；请求仍来自服务器 `hsd_test` 数据投影。
- [ ] 管理端检查：项目编辑保存成功、发布成功、成功后页面状态及时刷新；非法字段显示用户可读中文错误；生命周期审计不再暴露 DRAFT/NONE/FORCE_CLOSED 等内部术语。
- [ ] 文案检查：此前审核删除的提示性小字不再出现，页面结构、空状态和按钮无错位。
- [ ] 报名结果检查：7 位联系人可显示并复制，号码与双库核验结果一致。
- [ ] 权限检查：`202699990010` 可在共享测试环境作为白泽部长测试账号登录并具备预期中心权限；不得在正式库创建该 QA 身份。
- [ ] 观察 API、Worker、Web 和 Nginx 日志至少 10 分钟，确认无持续 5xx、数据库错误、对象存储错误、outbox 堆积或进程重启。

## Task 14：失败回滚与发布归档

- [ ] 任一关键检查失败时立即停止 Worker，将 `zzzzzzzz-current-release.conf` 和 `current` 同时恢复到 `OLD_RELEASE`，`daemon-reload` 后按 API → Web → Worker 顺序恢复并复验。
- [ ] 本次预期无 schema 变化，因此代码回滚不需要数据库 down migration；若执行阶段出现迁移，则必须使用预先审定的兼容性/恢复决策树，禁止只回切代码。
- [ ] 回滚后保留失败 Release、日志和 manifest 供分析，不立即删除；数据库/对象存储只有在确认发生数据破坏时才使用备份恢复。
- [ ] 成功后输出发布报告：两个 PR URL、两个合并 SHA、CI run、Release 路径、备份校验、迁移结论、数据源名称、验收结果、旧 Release 和一键回滚指令。
- [ ] 不自动删除本地分支、服务器旧 Release 或备份。清理工作另行确认。

## 发布 Go/No-Go 标准

只有下列条件全部满足才允许切换：

- 两个 PR 已合并，且部署 SHA 与各自远端 `main` 完全一致。
- 前端 PR 与合并后 main CI 全绿，历史 102/103 E2E 问题已关闭。
- 后端新 CI 的 build、隔离 PostgreSQL 全量测试、存储桥测试全绿。
- 无未审查 migration；服务器 `hsd_test` 和 `hsd-test` 已备份且校验可读。
- 候选 API 在 18080 的 live/ready 与代表性请求通过。
- 当前旧 Release、三个 systemd 指针及回滚命令已记录。
- 数据库连接仍指向 `hsd_test`；未获得另行授权时，不得切换正式库 `hsd`。

任一条件不满足即为 No-Go：保留现有服务器 Release，不做部分切换，也不以“先上线再观察”替代验证。
