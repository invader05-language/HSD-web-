# Member Center Transfer and Preparatory Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Register the two new candidates as preparatory members and add an audited, owner-only workflow for transferring formal members between active centers.

**Architecture:** Use the existing preparatory-member import API for the two additive account records. Add a separate transfer command that updates the existing center-membership row transactionally, synchronizes public projection and avatar ownership when safe, records an audit event, and emits an in-site notification. Add an explicit transfer control to the admin member detail page.

**Tech Stack:** NestJS/Fastify, Prisma/PostgreSQL, Nuxt 4/Vue 3, TypeScript, Vitest, Playwright, pnpm.

---

### Task 1: Establish clean baselines and import scope

**Files:**
- No production source changes.
- Source workbook: `E:/学习/华为HSD联盟/白泽/内推/25.6.3内推/384224191_按文本_华为HSD联盟招新报名表_222_222.xlsx`

- [ ] Verify both feature worktrees are clean and based on the latest locally available main commits; preserve all unrelated dirty files in the primary frontend checkout.
- [ ] Run backend and frontend baseline tests appropriate to the existing branches. Record pre-existing failures before feature work.
- [ ] In production, read-only check student IDs `202502210063`, `202402210019`, and `202502210184`. Confirm the first two are absent and that 莫曜鸿 remains the existing formal member in 人才发展中心.
- [ ] Do not change 莫曜鸿, do not create test data, and do not import the workbook itself.

### Task 2: Add backend transfer command with tests first

**Files:**
- Create: `src/centers/dto/transfer-membership.dto.ts`
- Modify: `src/centers/organization-admin.controller.ts`
- Modify: `src/centers/organization.service.ts`
- Modify: `test/organization-administration.e2e-spec.ts`
- Modify: generated OpenAPI artifacts as required by the repository workflow

- [ ] Add failing tests for owner-only transfer, version conflicts, same/inactive target centers, formal-member requirement, duty preservation, public projection synchronization, audit and notification creation, and transaction rollback.
- [ ] Add failing tests for active center-minister, scoped-admin, and cross-center project-lead blockers; Baize direction required/cleared; and safe avatar center synchronization or rejection when the asset is shared.
- [ ] Add a `POST admin/organization/memberships/:personId/transfer` route returning the existing membership response shape.
- [ ] Implement the transaction with deterministic locks, live alliance-owner validation, target-center validation, dual optimistic versions, required trimmed reason, `confirmed: true`, and `organization.membership.transferred` audit data.
- [ ] Update the existing membership row and public projection; preserve duty; apply Baize direction rules; upsert a deduplicated in-site notification; and handle avatar Upload/MediaAsset center ownership only when it is exclusively profile-owned and ready.
- [ ] Keep the existing duty-only PATCH contract unchanged and continue rejecting hidden `centerId` fields.
- [ ] Run the focused backend tests and OpenAPI contract tests after each red/green cycle.

### Task 3: Update API client and admin store

**Files:**
- Modify: `packages/api-client/src/client.ts`
- Modify: `packages/api-client/src/generated.ts`
- Modify: `packages/api-client/openapi.snapshot.json`
- Modify: `app/services/organization/organization-gateway.ts`
- Modify: `app/services/organization/api-organization.gateway.ts`
- Modify: `app/stores/member-administration.ts`
- Modify: relevant frontend unit tests

- [ ] Regenerate or update the client from the backend OpenAPI output; do not hand-maintain inconsistent duplicate types.
- [ ] Add a typed `transferMembership` gateway method and a store action that sends expected versions, target center, reason, confirmation, and optional Baize direction.
- [ ] Map every transfer error code to a user-facing Chinese message and refresh authoritative members/centers after success or conflict.
- [ ] Verify the client contract with unit tests before changing the page.

### Task 4: Add the admin member-detail transfer UI

**Files:**
- Modify: `app/pages/admin/members/[id].vue`
- Modify: page/component styles only where needed
- Modify: relevant page and E2E tests

- [ ] For formal members, show an editable center selector only to a live OWNER; keep center admins and other accounts read-only.
- [ ] Place a distinct “调整所属中心” action beside the selector, separate from ordinary “保存资料”.
- [ ] Show a confirmation dialog with current/target center, preserved duty, direction changes, blockers, and required reason.
- [ ] Show the Baize direction selector only when the target is 白泽开发中心; block invalid submissions locally.
- [ ] Disable duplicate submits, preserve form input on failure, refresh after success, and display version/permission/role conflicts in Chinese.
- [ ] Cover desktop, mobile, keyboard, modal close, overflow, and API error states.

### Task 5: Validate and integrate

**Files:**
- Tests and documentation generated by Tasks 2–4 only

- [ ] Run backend focused tests, full tests, build, and OpenAPI export.
- [ ] Run frontend unit tests, typecheck, build, and the relevant real-mode Playwright tests without writing production data.
- [ ] Run `git diff --check`; review for secret leakage, accidental center reassignment, duplicate notification, timezone or avatar regressions, and unrelated files.
- [ ] Commit backend and frontend changes separately with descriptive messages; fetch/rebase only when remote connectivity permits; never force-push.
- [ ] Push both branches, create PRs, wait for required CI, and merge only after CI is green.

### Task 6: Production registration, release, and deployment

**Files:**
- No additional source changes after merge.

- [ ] Before production writes, create a root-only backup of the current Release pointer, service configuration, and affected member records.
- [ ] Execute the existing preparatory-member dry-run for only 付豪 and 汪钰尧; commit only if both rows are ready and no duplicates/invalid rows exist.
- [ ] Verify both accounts are enabled `PREPARATORY`, have `mustChangePassword = true`, have no center membership, and have `member.imported` audit events. Never print initial passwords.
- [ ] Build an immutable frontend/backend Release from the complete merged SHAs with frozen lockfiles. Do not run migrations, seeds, or test-data synchronization because this feature has no schema migration.
- [ ] Candidate-test the Release on alternate loopback ports, then atomically switch `/var/www/hsd/current` and restart `hsd-api`, `hsd-worker`, and `hsd-web` only after health checks pass.
- [ ] Immediately verify home page, API live/ready, service status, admin member detail permissions, and public member responses. Do not perform an actual center change for 莫曜鸿 because no target center has been specified.
- [ ] If deployment fails, atomically restore the recorded Release pointer and restart the three services.

### Completion checklist

- [ ] 付豪和汪钰尧注册成功且可首次登录改密。
- [ ] 莫曜鸿生产身份、中心、账号和职务未被修改。
- [ ] OWNER 可在成员详情中执行有审计、通知和并发保护的中心调整。
- [ ] 非 OWNER 无法执行跨中心调整。
- [ ] 全部声明的测试、构建、CI、Release 和即时生产验收均有真实输出记录。
- [ ] 最终报告包含 PR/CI/合并 SHA、Release 路径、备份位置、服务状态及未执行的莫曜鸿实际调动说明。
