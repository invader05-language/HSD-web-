# Activity Registration Release And Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将活动报名闭环改动整理为可审计的前后端提交，经双仓库 PR 和 CI 验证后，以不可变 Release 方式部署到当前 HSD 共享测试服务器，并安全地将 `hsd_test` 从 45 条迁移升级到 47 条。

**Architecture:** 前端与后端继续使用两个独立仓库、两个独立 PR，后端 OpenAPI 作为唯一契约源，先合并后端再同步并合并前端。服务器沿用 `/var/lib/hsd/hsd-http-test.env`、`hsd_test`、`hsd-test` bucket、`/var/www/hsd/releases/$release_id`、`current` 软链接和三个 systemd 服务。第二条迁移会把报名模板修订和身份快照列设为 `NOT NULL`，旧 API 在迁移后不再具备写兼容性，因此采用短维护窗口完成“停止 Worker/API、迁移、切换新后端、启动 API/Worker”，不执行数据库 down migration。

**Tech Stack:** Node.js 22.19.0、pnpm 10.33.0、NestJS 11、Prisma 6.19、PostgreSQL 16、Nuxt 4、Vue 3、Vitest 4、Playwright、GitHub Actions、systemd、Nginx。

---

## 当前基线与发布边界

| 项目 | 已核验值 | 本次目标 |
| --- | --- | --- |
| 前端 `origin/main` | `a53ce1ffd732de11e85317043082c361fb7ebe53` | 新建 `codex/activity-registration-web-20260830` |
| 后端 `origin/main` | `7564e4cf82c421abd388bdc774f649183db09d9e` | 新建 `codex/activity-registration-api-20260830` |
| 当前 Release | `20260829T160451Z-7564e4cf-a53ce1ff` | 新 Release 使用合并后的两个完整 SHA |
| 当前服务 | API、Worker、Web、Nginx active；`NRestarts=0` | 切换后保持一致 |
| 当前数据源 | `/var/lib/hsd/hsd-http-test.env` → `hsd_test` | 不切换到正式库 `hsd` |
| 当前迁移 | 45 条完成 | 精确增加到 47 条 |
| 当前报名/Outbox | 报名 0 条；未处理 Outbox 0 条 | 迁移回填后数量保持一致 |
| 本地后端 | generate、schema validate、build、模板单测 4/4 通过 | 补齐全量隔离 PostgreSQL 测试 |
| 本地前端 | unit 791/791、typecheck、build 通过 | 补齐 Playwright 与真实 API 契约验证 |

发布边界：

- 目标是当前共享测试环境 `hsd_test`，不是正式库 `hsd`；不得修改服务器环境文件或切换 bucket。
- 不提交 `.env`、Secret、Cookie、Token、SSH 材料、数据库 dump、备份、截图、`node_modules`、`dist`、`.output` 或 `E:/HSD-tooling`。
- 不使用 `git add .` 或 `git add -A`，只按本计划的白名单逐组暂存。
- 当前前端工作区中的 `OrganizationLeadershipPanel.vue`、历史 handoff/plan 和其他不属于活动报名闭环的用户改动默认排除；若候选提交依赖它们，先在干净候选树中通过测试证明必要性，再单独审查。
- 不从本地未提交目录或 PR head 部署；服务器只构建两个已合并且 `main` CI 绿色的固定 SHA。
- 不清理旧 Release、旧分支、旧备份或用户未提交文件。

## Task 1：冻结范围并恢复完整本地验证环境

**Files/Systems:**

- Inspect: `E:/文档/ChatGPT/HSD`
- Inspect: `E:/文档/ChatGPT/HSD_alliance_backend`
- Use: `E:/HSD-tooling/node-v22.19.0-win-x64`
- Use: `E:/HSD-tooling/pnpm/node_modules/.bin/pnpm.cmd`

- [ ] **Step 1: 记录工作树与远端基线**

在两个仓库执行：

```powershell
git status --short --branch
git diff --stat
git diff --check
git ls-remote origin refs/heads/main
```

预期：远端 SHA 分别仍为表中值；若远端前进，停止并先重新基线化。

- [ ] **Step 2: 启动 Docker Desktop Linux Engine**

```powershell
Start-Process 'C:/Program Files/Docker/Docker/Docker Desktop.exe'
docker info --format '{{.ServerVersion}}'
```

预期：第二条命令返回 Server 版本；若 Linux Engine 仍不可用，不允许跳过后端全量测试。

- [ ] **Step 3: 固定本轮 shell 工具路径和 E 盘缓存**

```powershell
$toolRoot = 'E:/HSD-tooling'
$env:Path = "$toolRoot/node-v22.19.0-win-x64;$env:Path"
$env:NPM_CONFIG_CACHE = "$toolRoot/npm-cache"
$env:TEMP = "$toolRoot/tmp"
$env:TMP = "$toolRoot/tmp"
$env:PNPM_HOME = "$toolRoot/pnpm-home"
node -v
pnpm -v
```

预期：Node `v22.19.0`，pnpm `10.33.0`；新增缓存不写入 C 盘。

- [ ] **Step 4: 检查 Docker 镜像是否需要新增下载**

```powershell
docker image inspect postgres:16-alpine
```

若镜像不存在，先在 Docker Desktop 的 `Settings → Resources → Advanced → Disk image location` 将磁盘镜像位置设置为 `E:/DockerDesktop`，Docker 重启且 `docker info` 正常后再继续；不得在 C 盘空间不足时直接拉取镜像。

## Task 2：关闭后端提交前门禁

**Files:**

- Regenerate: `E:/文档/ChatGPT/HSD_alliance_backend/docs/contracts/openapi.snapshot.json`
- Verify: `E:/文档/ChatGPT/HSD_alliance_backend/prisma/schema.prisma`
- Verify: `E:/文档/ChatGPT/HSD_alliance_backend/prisma/migrations/20260830000100_activity_registration_lifecycle/migration.sql`
- Verify: `E:/文档/ChatGPT/HSD_alliance_backend/prisma/migrations/20260830000200_activity_registration_template/migration.sql`
- Test: `E:/文档/ChatGPT/HSD_alliance_backend/test/registration-template-spec.ts`
- Test: `E:/文档/ChatGPT/HSD_alliance_backend/test/activities.e2e-spec.ts`
- Test: `E:/文档/ChatGPT/HSD_alliance_backend/test/registrations.e2e-spec.ts`

- [ ] **Step 1: 重新生成后端契约**

```powershell
Set-Location 'E:/文档/ChatGPT/HSD_alliance_backend'
pnpm install --frozen-lockfile --store-dir E:/HSD-tooling/pnpm-store
pnpm db:generate
pnpm export:openapi
```

预期：`docs/contracts/openapi.snapshot.json` 出现模板、聚合名单、报名表单、详情和导出相关路径；禁止手工合并生成 JSON。

- [ ] **Step 2: 验证 schema 和新迁移**

```powershell
pnpm exec prisma validate --schema prisma/schema.prisma
pnpm db:verify:fresh
```

预期：全新隔离数据库按顺序应用全部 47 条迁移，迁移目录与 `_prisma_migrations` 完全一致。

- [ ] **Step 3: 运行后端完整测试**

```powershell
pnpm build
pnpm test
$storagePython = 'E:/HSD-LocalData/venvs/storage-bridge/Scripts/python.exe'
& $storagePython -m pip install --disable-pip-version-check -r infra/storage-bridge/requirements.txt
& $storagePython -m unittest discover -s infra/storage-bridge -p test_main.py
```

预期：Nest 构建、隔离 PostgreSQL 全量 Vitest、存储桥测试全部退出码 0；测试脚本创建的名称匹配 `^hsd-test-[a-f0-9]{32}$` 的容器全部回收。

- [ ] **Step 4: 审查迁移兼容性和回填**

确认迁移在已有报名为 0 和已有报名非 0 两种 fixture 上都满足：全局模板恰好一份、V1 修订恰好一份、活动绑定稳定、报名姓名/学号/模板修订非空、重复运行由 Prisma migration 历史阻止。

## Task 3：以后端快照为唯一来源同步前端契约

**Files:**

- Copy: `E:/文档/ChatGPT/HSD_alliance_backend/docs/contracts/openapi.snapshot.json`
- Replace: `E:/文档/ChatGPT/HSD/packages/api-client/openapi.snapshot.json`
- Regenerate: `E:/文档/ChatGPT/HSD/packages/api-client/src/generated.ts`
- Verify: `E:/文档/ChatGPT/HSD/packages/api-client/src/client.ts`

- [ ] **Step 1: 复制后端生成快照**

```powershell
Copy-Item -LiteralPath 'E:/文档/ChatGPT/HSD_alliance_backend/docs/contracts/openapi.snapshot.json' -Destination 'E:/文档/ChatGPT/HSD/packages/api-client/openapi.snapshot.json' -Force
Set-Location 'E:/文档/ChatGPT/HSD'
pnpm --filter @hsd/api-client generate
```

预期：前后端 snapshot SHA-256 完全一致；generated client 只由生成器产生。

- [ ] **Step 2: 运行契约回归**

```powershell
pnpm exec vitest run tests/unit/api-client-contract.test.ts tests/unit/activity-workflow.test.ts
pnpm run typecheck
```

预期：聚合名单筛选/分页、模板管理、成员表单和报名生命周期契约均通过。

## Task 4：关闭前端提交前门禁

**Files:**

- Test: `E:/文档/ChatGPT/HSD/tests/unit/activity-workflow.test.ts`
- Test: `E:/文档/ChatGPT/HSD/tests/unit/api-client-contract.test.ts`
- Verify: activity detail, template configuration, registration admin list and export UI

- [ ] **Step 1: 运行完整静态和单元验证**

```powershell
Set-Location 'E:/文档/ChatGPT/HSD'
pnpm install --frozen-lockfile --store-dir E:/HSD-tooling/pnpm-store
pnpm run test:unit
pnpm run typecheck
pnpm run build
```

预期：至少保持当前 113 个测试文件、791 项测试全绿，typecheck 和 Nuxt production build 退出码 0。

- [ ] **Step 2: 运行完整 Mock Playwright**

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/HSD-tooling/playwright'
pnpm exec playwright install chromium
pnpm run test:e2e
```

预期：全部 Playwright 用例通过；不得使用 skip、任意 sleep 或降低断言掩盖失败。

- [ ] **Step 3: 运行真实 API E2E**

```powershell
pnpm exec playwright test tests/e2e/task-3c-admin-content-real.spec.ts tests/e2e/task-3c-admin-audit-real.spec.ts tests/e2e/task-3c-admin-uploads-real.spec.ts tests/e2e/task-3c-admin-resources-real.spec.ts tests/e2e/task-3c-recruitment-batches-real.spec.ts tests/e2e/task-3c-admin-recruitment-lifecycle-real.spec.ts tests/e2e/task-3c-admin-recruitment-workspaces-real.spec.ts --config playwright.config.task-3c-real.ts
```

数据库仅使用该配置创建的一次性 PostgreSQL。自动用例通过后增加人工烟测：OWNER 发布共享模板、首次开放活动、成员提交动态字段、取消后重新报名、管理员搜索/审核/导出 CSV。

## Task 5：建立精确提交并推送双 PR

**Branches:**

- Backend: `codex/activity-registration-api-20260830`
- Frontend: `codex/activity-registration-web-20260830`

- [ ] **Step 1: 从当前 main 创建后端发布分支**

```powershell
Set-Location 'E:/文档/ChatGPT/HSD_alliance_backend'
git switch -c codex/activity-registration-api-20260830
```

- [ ] **Step 2: 提交后端活动生命周期和持久化**

```powershell
git add -- pnpm-workspace.yaml prisma/schema.prisma prisma/migrations/20260830000100_activity_registration_lifecycle/migration.sql prisma/migrations/20260830000200_activity_registration_template/migration.sql src/activities/activity-registration.ts src/activities/activity-time.ts src/activities/activities.module.ts src/activities/activities.service.ts src/activities/dto/activity-response.dto.ts src/activities/dto/activity.dto.ts src/outbox/outbox.service.ts src/outbox/outbox.worker.ts src/worker-main.ts
git diff --cached --check
git diff --cached
git commit -m 'feat(activities): add registration lifecycle persistence'
```

- [ ] **Step 3: 提交后端共享模板和名单闭环**

```powershell
git add -- src/app.factory.ts src/audit/audit.mapper.ts src/common/openapi/phase-one-response.dto.ts src/registrations/dto/list-activity-registrations.dto.ts src/registrations/dto/registration-response.dto.ts src/registrations/dto/registration-template-response.dto.ts src/registrations/dto/registration-template.dto.ts src/registrations/dto/registration.dto.ts src/registrations/registration-template.service.ts src/registrations/registration-template.ts src/registrations/registrations-admin.controller.ts src/registrations/registrations-member.controller.ts src/registrations/registrations.module.ts src/registrations/registrations.service.ts
git diff --cached --check
git diff --cached
git commit -m 'feat(registrations): add shared template and admin workflow'
```

- [ ] **Step 4: 提交后端测试、QA seed 和生成契约**

```powershell
git add -- docs/contracts/openapi.snapshot.json src/prisma/qa-seed.ts test/activities.e2e-spec.ts test/helpers/database.ts test/registration-template-spec.ts test/registrations.e2e-spec.ts
git diff --cached --check
git diff --cached
git commit -m 'test(registrations): verify template lifecycle and contracts'
```

任何 Secret、本地工具路径或未列出的文件不得进入提交。提交后执行 `pnpm build` 和 `pnpm test`，确保拆分后的分支本身仍全绿。

- [ ] **Step 5: 推送并创建后端 PR**

```powershell
git push -u origin codex/activity-registration-api-20260830
$backendPrUrl = gh pr create --repo invader05-language/HSD_alliance_backend --base main --head codex/activity-registration-api-20260830 --title 'feat: complete activity registration workflow' --body 'Adds a shared versioned registration template, dynamic answers, scoped admin list/detail/export, lifecycle expiration, two ordered migrations, generated OpenAPI, and full regression coverage. Deployment target remains hsd_test. Migration count changes from 45 to 47 and requires the documented short maintenance window.'
$backendPr = gh pr view $backendPrUrl --repo invader05-language/HSD_alliance_backend --json number --jq '.number'
```

PR 描述必须记录：两条迁移、45→47、短维护窗口、全量测试、OpenAPI 来源、`hsd_test` 边界和无 down migration 回滚规则。

- [ ] **Step 6: 从当前 main 创建前端发布分支**

```powershell
Set-Location 'E:/文档/ChatGPT/HSD'
git switch -c codex/activity-registration-web-20260830
```

- [ ] **Step 7: 提交活动基础流程兼容改动**

```powershell
git add -- app/components/admin/ActivityEditor.vue app/components/admin/ContentMediaUploader.vue app/pages/admin/activities.vue app/pages/admin/activities/[id].vue app/pages/admin/activities/new.vue app/utils/activity-errors.ts app/utils/activity-registration.ts app/utils/activity-time.ts
git diff --cached --check
git diff --cached
git commit -m 'fix(activities): align editor and registration lifecycle'
```

- [ ] **Step 8: 提交成员和管理端报名闭环**

```powershell
git add -- app/assets/css/main.css app/components/activity/ActivityRegistrationForm.vue app/components/admin/ActivityRegistrationDetailDrawer.vue app/pages/activities/[slug].vue app/pages/admin/activities/registration-template.vue app/pages/admin/activities/registrations.vue app/stores/activities.ts app/types/activity-registration.ts app/types/activity.ts tests/unit/activity-workflow.test.ts
git diff --cached --check
git diff --cached
git commit -m 'feat(registrations): add member and admin workflows'
```

- [ ] **Step 9: 提交前端 API 契约**

```powershell
git add -- packages/api-client/openapi.snapshot.json packages/api-client/scripts/generate-from-openapi.mjs packages/api-client/src/client.ts packages/api-client/src/generated.ts tests/unit/api-client-contract.test.ts
git diff --cached --check
git diff --cached
git commit -m 'chore(api): sync activity registration contract'
```

- [ ] **Step 10: 提交需求和 QA 证据**

```powershell
git add -- HSD需求文档.md docs/superpowers/plans/2026-08-30-activity-registration-closed-loop.md docs/superpowers/plans/2026-08-30-activity-registration-release-deployment.md docs/testing/qa-data-coverage.md
git diff --cached --check
git diff --cached
git commit -m 'docs: record activity registration release gates'
```

显式排除 `app/components/OrganizationLeadershipPanel.vue` 和无关历史 handoff/plan；全部提交后重跑前端完整验证。

- [ ] **Step 11: 推送并创建前端 PR**

```powershell
git push -u origin codex/activity-registration-web-20260830
$frontendPrUrl = gh pr create --repo invader05-language/HSD-web- --base main --head codex/activity-registration-web-20260830 --title 'feat: complete activity registration experience' --body "Adds shared registration template configuration, dynamic member forms, scoped server-side registration management, detail review, and safe CSV export. Depends on backend PR $backendPrUrl and must deploy after the backend migration and API switch."
$frontendPr = gh pr view $frontendPrUrl --repo invader05-language/HSD-web- --json number --jq '.number'
```

前端 PR 链接后端 PR，并声明只有包含新迁移和新 API 的后端先上线后，前端按钮和动态表单才允许切换。

## Task 6：等待 CI、审阅并合并

- [ ] **Step 1: 等待两个 PR CI 全绿**

```powershell
gh pr checks $backendPr --repo invader05-language/HSD_alliance_backend --watch
gh pr checks $frontendPr --repo invader05-language/HSD-web- --watch
```

任何红灯都回到对应分支修复并重跑，不允许管理员绕过。

- [ ] **Step 2: 先合并后端，再合并前端**

使用 squash merge；每次合并前确认 PR head 未变化、review 无阻塞项。合并后等待两个仓库 `push: main` CI 再次全绿。

- [ ] **Step 3: 锁定部署 SHA**

```powershell
$backendSha = (git ls-remote https://github.com/invader05-language/HSD_alliance_backend.git refs/heads/main).Split()[0]
$frontendSha = (git ls-remote https://github.com/invader05-language/HSD-web-.git refs/heads/main).Split()[0]
$releaseStamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$releaseId = "$releaseStamp-$($backendSha.Substring(0,8))-$($frontendSha.Substring(0,8))"
```

记录 PR URL、merge SHA、main CI URL 和 Release ID。

## Task 7：服务器备份和隔离迁移演练

**Server:** `ssh hsd-server`

- [ ] **Step 1: 记录发布前基线**

记录 `current`、三个 WorkingDirectory、服务状态、NRestarts、磁盘、端口、live/ready/Web、数据库名、迁移数、报名数、未处理 Outbox 数。预期仍为 `hsd_test`、45、0、0。

- [ ] **Step 2: 创建受限备份目录和数据库备份**

```bash
release_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="/var/backups/hsd/${release_stamp}-before-activity-registration"
sudo install -d -m 700 "$backup_dir"
sudo docker exec hsd-postgres pg_dump -U hsd -d hsd_test --format=custom | sudo tee "$backup_dir/hsd_test.dump" >/dev/null
sudo cp --preserve=all /etc/systemd/system/hsd-api.service.d/zzzzzzzz-current-release.conf "$backup_dir/hsd-api-current.conf"
sudo cp --preserve=all /etc/systemd/system/hsd-worker.service.d/zzzzzzzz-current-release.conf "$backup_dir/hsd-worker-current.conf"
sudo cp --preserve=all /etc/systemd/system/hsd-web.service.d/zzzzzzzz-current-release.conf "$backup_dir/hsd-web-current.conf"
sudo bash -c 'set -a; . /var/lib/hsd/hsd-http-test.env; set +a; mc alias set hsd-release "$OBJECT_STORAGE_ENDPOINT" "$OBJECT_STORAGE_ACCESS_KEY" "$OBJECT_STORAGE_SECRET_KEY" >/dev/null; mc find "hsd-release/$OBJECT_STORAGE_BUCKET" --json' | sudo tee "$backup_dir/minio-manifest.jsonl" >/dev/null
sudo sha256sum "$backup_dir"/* | sudo tee "$backup_dir/SHA256SUMS" >/dev/null
sudo chmod -R go-rwx "$backup_dir"
sudo sha256sum -c "$backup_dir/SHA256SUMS"
sudo docker exec hsd-postgres pg_restore -l < "$backup_dir/hsd_test.dump" >/dev/null
```

对象存储凭据只在受限 root shell 中加载，不进入命令输出、聊天或 Git。

## Task 8：构建不可变 Release 和候选验证

- [ ] **Step 1: 按固定 SHA 构建服务器 Release**

```bash
export PATH="/opt/hsd/node/bin:$PATH"
backend_sha="$(git ls-remote https://github.com/invader05-language/HSD_alliance_backend.git refs/heads/main | cut -f1)"
frontend_sha="$(git ls-remote https://github.com/invader05-language/HSD-web-.git refs/heads/main | cut -f1)"
release_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
release_id="${release_stamp}-${backend_sha:0:8}-${frontend_sha:0:8}"
release_root="/var/www/hsd/releases/$release_id"
sudo install -d -o ubuntu -g ubuntu -m 755 "$release_root"
git clone https://github.com/invader05-language/HSD_alliance_backend.git "$release_root/backend"
git -C "$release_root/backend" checkout --detach "$backend_sha"
git clone https://github.com/invader05-language/HSD-web-.git "$release_root/frontend"
git -C "$release_root/frontend" checkout --detach "$frontend_sha"
cd "$release_root/backend"
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
cd "$release_root/frontend"
pnpm install --frozen-lockfile
pnpm build
test -f "$release_root/backend/dist/main.js"
test -f "$release_root/backend/dist/worker-main.js"
test -f "$release_root/frontend/server/index.mjs"
```

生成 `$release_root/release-manifest.txt`，记录完整 SHA、两个 lockfile SHA-256、Node/pnpm、预期迁移 47、构建时间和旧 Release 路径；manifest 生成后不再修改 Release 内容。

- [ ] **Step 2: 在隔离恢复库演练 45→47**

```bash
restore_db="hsd_restore_$(date -u +%Y%m%d%H%M%S)"
sudo docker exec hsd-postgres createdb -U hsd "$restore_db"
sudo cat "$backup_dir/hsd_test.dump" | sudo docker exec -i hsd-postgres pg_restore --exit-on-error --no-owner --no-privileges -U hsd -d "$restore_db"
sudo -n env RELEASE_BACKEND="$release_root/backend" RESTORE_DB="$restore_db" PATH="/opt/hsd/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" bash -c 'set -a; . /var/lib/hsd/hsd-http-test.env; set +a; database_base_url="${DATABASE_URL%%\?*}"; export DATABASE_URL="${database_base_url%/*}/${RESTORE_DB}?schema=public"; cd "$RELEASE_BACKEND"; pnpm db:status; pnpm db:migrate; pnpm db:status'
sudo docker exec hsd-postgres psql -U hsd -d "$restore_db" -v ON_ERROR_STOP=1 -Atc "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL; SELECT COUNT(*) FROM activity_registrations; SELECT COUNT(*) FROM activity_registration_templates WHERE key='global'; SELECT COUNT(*) FROM activity_registration_template_revisions WHERE published_at IS NOT NULL;"
restore_env="/run/hsd-${restore_db}.env"
sudo -n env RESTORE_ENV="$restore_env" RESTORE_DB="$restore_db" bash -c 'cp /var/lib/hsd/hsd-http-test.env "$RESTORE_ENV"; set -a; . /var/lib/hsd/hsd-http-test.env; set +a; database_base_url="${DATABASE_URL%%\?*}"; printf "\nDATABASE_URL=%s\n" "${database_base_url%/*}/${RESTORE_DB}?schema=public" >> "$RESTORE_ENV"; chmod 600 "$RESTORE_ENV"'
sudo systemd-run --unit=hsd-api-candidate --property=User=ubuntu --property="WorkingDirectory=$release_root/backend" --property="EnvironmentFile=$restore_env" --setenv=API_PORT=18080 /opt/hsd/node/bin/node dist/main.js
curl --retry 20 --retry-delay 1 --retry-connrefused --fail --silent --show-error http://127.0.0.1:18080/api/v1/health/live
curl --fail --silent --show-error http://127.0.0.1:18080/api/v1/health/ready
curl --fail --silent --show-error http://127.0.0.1:18080/api/v1/activities >/dev/null
sudo systemctl stop hsd-api-candidate
sudo systemctl reset-failed hsd-api-candidate || true
sudo rm -f "$restore_env"
case "$restore_db" in hsd_restore_*) sudo docker exec hsd-postgres dropdb -U hsd "$restore_db" ;; *) exit 1 ;; esac
```

预期依次为 47、0、1、1；候选 API 必须在隔离恢复库上通过 live、ready 和公开活动读取后，才允许删除隔离数据库。

不启动第二个 Worker，避免候选版本消费恢复库或线上 Outbox。

## Task 9：短维护窗口迁移并原子切换

- [ ] **Step 1: 进入维护窗口并阻断旧写入**

停止 `hsd-worker`，随后停止 `hsd-api`；Web 可暂时保留，但 API 请求会在短窗口内不可用。再次记录未处理 Outbox 为 0。

- [ ] **Step 2: 对 `hsd_test` 执行迁移**

在新后端 Release 中加载 `/var/lib/hsd/hsd-http-test.env`，先确认 `SELECT current_database()` 精确返回 `hsd_test`，再执行：

```bash
pnpm db:status
pnpm db:migrate
pnpm db:status
```

预期：45→47，最后两条名称精确为 `20260830000100_activity_registration_lifecycle` 和 `20260830000200_activity_registration_template`。任何异常立即停止，不启动旧 API，也不修改 migration 历史。

- [ ] **Step 3: 原子更新三个固定 drop-in 和 current**

```bash
for service in api worker; do
  config="/tmp/hsd-${service}-${release_id}.conf"
  printf '[Service]\nWorkingDirectory=%s/backend\n' "$release_root" > "$config"
  sudo install -o root -g root -m 644 "$config" "/etc/systemd/system/hsd-${service}.service.d/zzzzzzzz-current-release.conf"
done
web_config="/tmp/hsd-web-${release_id}.conf"
printf '[Service]\nWorkingDirectory=%s/frontend\n' "$release_root" > "$web_config"
sudo install -o root -g root -m 644 "$web_config" /etc/systemd/system/hsd-web.service.d/zzzzzzzz-current-release.conf
sudo ln -s "$release_root" "/var/www/hsd/current-${release_id}"
sudo mv -Tf "/var/www/hsd/current-${release_id}" /var/www/hsd/current
sudo systemctl daemon-reload
```

- [ ] **Step 4: 按 API → Web → Worker 启动**

```bash
sudo systemctl start hsd-api
curl --retry 20 --retry-delay 1 --retry-connrefused --fail http://127.0.0.1:3001/api/v1/health/ready
sudo systemctl restart hsd-web
curl --retry 20 --retry-delay 1 --retry-connrefused --fail http://127.0.0.1:3000/
sudo systemctl start hsd-worker
systemctl is-active hsd-api hsd-worker hsd-web nginx
```

API 未 ready 时不得启动 Worker。

## Task 10：部署后闭环验收与观察

- [ ] **Step 1: 技术健康检查**

确认四个服务 active、三个 HSD 服务无重启循环、3000/3001 loopback 正常、18080 已关闭、Nginx 路由和 live/ready/Web 均为 200、数据库 47 条迁移、Outbox 无堆积。

- [ ] **Step 2: OWNER 管理端验收**

使用受保护会话验证：配置共享报名字段、保存草稿、发布模板、活动首次开放时绑定发布修订、名单按活动/状态/姓名或学号筛选、服务端分页、详情抽屉、接受/拒绝、CSV 导出和导出审计。

- [ ] **Step 3: 成员端验收**

使用测试成员验证：活动详情读取锁定模板、姓名/学号只读、必填和类型错误定位、成功报名、取消、同一记录重新报名、旧审核状态清空；匿名访问活动详情不得触发受保护表单请求。

- [ ] **Step 4: 观察 10 分钟**

检查 API、Worker、Web、Nginx 日志，无持续 5xx、Prisma 错误、模板校验异常、Outbox 重试/死信或进程重启。

## Task 11：回滚和发布归档

- [ ] **Step 1: 应用层失败处理**

若迁移成功且 schema 完整，只在确认旧代码仍与 47 条 schema 兼容时才允许回切旧 Release；本次旧 API 的报名写入不兼容新 `NOT NULL` 列，因此默认不回切旧后端，而是停止报名写入并修复前进。前端可以独立回切旧 Web Release。

- [ ] **Step 2: 迁移失败处理**

若迁移事务失败但数据库保持 45 条，恢复旧三个 drop-in/current 并按 API→Web→Worker 启动。若出现部分应用或数据不一致，保持 API/Worker 停止，先恢复到隔离库验证；未经事故决策不得覆盖恢复 `hsd_test`。

- [ ] **Step 3: 归档发布事实**

记录两个 PR、两个 main SHA、CI URL、Release 路径、旧 Release、备份 SHA-256、隔离恢复结果、45→47、服务状态、业务验收和明确回滚命令。审计文件保存在由 `$releaseId` 创建的 `E:/HSD-LocalData/audits/releases/$releaseId` 和服务器受限备份目录，不提交 Git。

## Go / No-Go

只有以下条件全部满足才允许进入 Task 9：

- 后端全量隔离 PostgreSQL 测试、fresh migration、build、storage test 全绿。
- 前端 unit、typecheck、build、完整 Playwright 和真实 API 闭环验证全绿。
- 后端生成 OpenAPI 与前端 snapshot SHA-256 完全一致。
- 两个 PR 已审阅合并，两个 main CI 绿色，部署 SHA 与远端 main 完全一致。
- `hsd_test` 备份、SHA-256、隔离恢复和 45→47 演练成功。
- 当前旧 Release、三个 systemd 指针、数据库数量和回滚命令已记录。
- 维护窗口被接受，目标仍为 `hsd_test`，未触碰正式库 `hsd`。

任一条件不满足即为 No-Go：保留当前 `20260829T160451Z-7564e4cf-a53ce1ff` Release，不执行部分迁移或部分服务切换。
