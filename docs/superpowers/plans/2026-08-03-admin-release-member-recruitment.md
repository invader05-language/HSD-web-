# Admin Release, Member, and Recruitment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved HSD admin release scope: disable three unused modules, complete recruitment detail/export, create formal member accounts with forced first-password change, normalize public member data, and simplify core-member management.

**Architecture:** Keep the Nuxt frontend Mock boundary. Put release flags and pure route/export/filter rules in focused modules, keep `sessionStore.currentMemberId` as the sole current-person authority, and project formal profiles into admin/public views through `useMemberRepository`. Persist versioned Mock account/profile state in browser storage without claiming production security.

**Tech Stack:** Nuxt 4.5.1, Vue 3.5.40, Pinia 4.0.2, TypeScript 5.9.3, Vitest 4.1.10, Playwright 1.62.0, project-local Node 22.19.0 and pnpm 10.33.0.

## Global Constraints

- Implement exactly `docs/superpowers/specs/2026-08-03-admin-release-scope-member-recruitment-design.md`.
- Do not change or disable the current recruitment-batch page.
- Do not add runtime dependencies for CSV or XLSX.
- Do not implement a fake XLSX file; document the backend XLSX contract and implement UTF-8 BOM CSV only.
- Formal member public fields are always public; student ID, class, contact, application, assessment, and account data remain private.
- The only white-list direction values are `鸿蒙开发`, `后端架构`, `大模型 AIGC`, `UI/UX 设计`, and `嵌入式开发`.
- Non-Baize members must not store or render a member direction.
- Member duty is `普通成员` or `核心人员`; centre leadership remains a separate admin qualification and always implies core membership.
- New member accounts use student ID as login, initial password `hsd1314`, and a forced first-password-change flow.
- Preserve unrelated local and untracked work. Never stage `.tools`, `node_modules`, `.pnpm-store`, or `.superpowers`.
- Use the project wrapper shown in each task for every pnpm command.

---

### Task 1: Centralize release feature availability

**Files:**
- Create: `app/config/release-features.ts`
- Create: `app/utils/admin-release-access.ts`
- Create: `app/middleware/release-features.global.ts`
- Modify: `app/data/admin-platform.ts`
- Modify: `app/layouts/admin.vue`
- Test: `tests/unit/admin-release-features.test.ts`

**Interfaces:**
- Produces `ReleaseFeatures`, `RELEASE_FEATURES`, and `resolveDisabledAdminRoute(path, features)`.
- `getAdminNavigationForAccess` accepts release features and removes disabled items.

- [ ] **Step 1: Write failing release-access tests**

```ts
expect(resolveDisabledAdminRoute("/admin/logs", RELEASE_FEATURES)).toEqual({
  to: "/admin",
  notice: "当前版本暂未开放"
});
expect(resolveDisabledAdminRoute("/admin/uploads", RELEASE_FEATURES)?.to).toBe("/admin/media");
expect(resolveDisabledAdminRoute("/admin/recruitment/batches", RELEASE_FEATURES)).toBeUndefined();
expect(getAdminNavigationForAccess({ canManageAdminAccounts: true }, RELEASE_FEATURES)
  .flatMap((group) => group.items.map((item) => item.id)))
  .not.toEqual(expect.arrayContaining(["logs", "recycle-bin", "uploads"]));
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/admin-release-features.test.ts`

Expected: FAIL because the release-feature modules and second navigation argument do not exist.

- [ ] **Step 3: Add the release configuration and pure resolver**

```ts
export interface ReleaseFeatures {
  auditLog: boolean;
  recycleBin: boolean;
  uploadTasks: boolean;
  recruitmentBatches: boolean;
}

export const RELEASE_FEATURES: ReleaseFeatures = {
  auditLog: false,
  recycleBin: false,
  uploadTasks: false,
  recruitmentBatches: true
};

export function resolveDisabledAdminRoute(path: string, features = RELEASE_FEATURES) {
  if (!features.auditLog && path.startsWith("/admin/logs")) return { to: "/admin", notice: "当前版本暂未开放" };
  if (!features.recycleBin && path.startsWith("/admin/recycle-bin")) return { to: "/admin", notice: "当前版本暂未开放" };
  if (!features.uploadTasks && path.startsWith("/admin/uploads")) return { to: "/admin/media", notice: "当前版本暂未开放" };
  return undefined;
}
```

The global middleware uses `navigateTo({ path: disabled.to, query: { notice: disabled.notice }, replace: true })`. The admin layout renders the notice once and removes only the `notice` query key with `history.replaceState` after display.

- [ ] **Step 4: Run focused tests**

Expected: all tests in `admin-release-features.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add app/config/release-features.ts app/utils/admin-release-access.ts app/middleware/release-features.global.ts app/data/admin-platform.ts app/layouts/admin.vue tests/unit/admin-release-features.test.ts
git commit -m "feat: gate unavailable admin modules"
```

### Task 2: Remove disabled-module cross-links and copy

**Files:**
- Modify: `app/pages/admin/index.vue`
- Modify: `app/pages/admin/media.vue`
- Modify: `app/pages/admin/accounts.vue`
- Modify: `app/pages/login.vue`
- Modify: `app/data/admin-dashboard.ts`
- Modify: `tests/e2e/admin-platform.spec.ts`
- Modify: `tests/unit/login-page-copy.test.ts`

**Interfaces:**
- Consumes `RELEASE_FEATURES` behavior from Task 1.
- Produces release-safe UI without links or promises for disabled modules.

- [ ] **Step 1: Change tests to require the approved UI**

```ts
await expect(page.getByRole("link", { name: "操作日志", exact: true })).toHaveCount(0);
await expect(page.getByRole("link", { name: "上传任务", exact: true })).toHaveCount(0);
await expect(page.getByRole("button", { name: "移入回收站" })).toHaveCount(0);
await expect(page.getByText("最近操作记录", { exact: true })).toHaveCount(0);
```

The login-copy unit test must assert that administrator copy does not contain `操作日志` or `回收站`.

- [ ] **Step 2: Run affected tests and verify failure**

Run: `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/login-page-copy.test.ts`

Expected: FAIL on the existing administrator copy.

- [ ] **Step 3: Remove only the disabled entry points**

Remove the dashboard audit-preview section, media upload-task link, recycle-bin button, audit-log promise from qualification confirmation, and disabled-feature login copy. Keep recruitment batches and the media upload drawer.

- [ ] **Step 4: Run unit tests and typecheck**

Run: `sh scripts/with-hsd-node.sh corepack pnpm run test:unit`

Expected: existing unit suite PASS after obsolete audit-navigation assertions are updated.

- [ ] **Step 5: Commit**

```bash
git add app/pages/admin/index.vue app/pages/admin/media.vue app/pages/admin/accounts.vue app/pages/login.vue app/data/admin-dashboard.ts tests/e2e/admin-platform.spec.ts tests/unit/login-page-copy.test.ts
git commit -m "fix: remove disabled admin entry points"
```

### Task 3: Add recruitment filtering, sorting, and read-only details

**Files:**
- Modify: `app/data/recruitment-admin.ts`
- Modify: `app/pages/admin/recruitment/applications.vue`
- Create: `app/pages/admin/recruitment/applications/[id].vue`
- Create: `tests/unit/recruitment-applications.test.ts`
- Modify: `tests/e2e/recruitment-admin.spec.ts`

**Interfaces:**
- Produces `RecruitmentApplicationSort`, `filterAndSortRecruitmentApplications`, and `findRecruitmentApplication`.

- [ ] **Step 1: Write failing domain tests**

```ts
expect(filterAndSortRecruitmentApplications(ADMIN_CANDIDATES, {
  query: "林",
  firstChoice: "全部中心",
  sort: "submittedAt.desc"
}).map((item) => item.id)).toEqual(["candidate-lin"]);

expect(filterAndSortRecruitmentApplications(ADMIN_CANDIDATES, {
  query: "",
  firstChoice: "全部中心",
  sort: "submittedAt.asc"
})[0]?.id).toBe("candidate-wu");

expect(findRecruitmentApplication("missing")).toBeUndefined();
```

- [ ] **Step 2: Verify tests fail**

Run: `sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/recruitment-applications.test.ts`

- [ ] **Step 3: Implement typed timestamps and functions**

Add `submittedAt` ISO timestamps and read-only detail fields `grade`, `className`, `contact`, and optional `bio` to `AdminCandidate`. Keep `updatedAt` only for assessment workflow display.

```ts
export type RecruitmentApplicationSort = "submittedAt.desc" | "submittedAt.asc";

export function findRecruitmentApplication(id: string) {
  return ADMIN_CANDIDATES.find((candidate) => candidate.id === id);
}
```

The filter function must copy before sorting and compare `Date.parse(left.submittedAt)` values. Remove the status selector, rename the time control to `排序`, and render `NuxtLink` to `/admin/recruitment/applications/${candidate.id}`.

- [ ] **Step 4: Build the full-width read-only detail page**

The page must throw `createError({ statusCode: 404, statusMessage: "报名记录不存在" })` for an unknown ID. It renders only submitted applicant data; it contains no note editor, assessment link, mutation button, or application-status badge.

- [ ] **Step 5: Run focused unit tests and typecheck**

Expected: recruitment tests PASS and typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add app/data/recruitment-admin.ts app/pages/admin/recruitment/applications.vue app/pages/admin/recruitment/applications/[id].vue tests/unit/recruitment-applications.test.ts tests/e2e/recruitment-admin.spec.ts
git commit -m "feat: add recruitment application details"
```

### Task 4: Export filtered recruitment CSV

**Files:**
- Create: `app/utils/recruitment-export.ts`
- Create: `tests/unit/recruitment-export.test.ts`
- Modify: `app/pages/admin/recruitment/applications.vue`

**Interfaces:**
- Produces `serializeRecruitmentCsv(records)` and `buildRecruitmentExportName(batchName, now)`.

- [ ] **Step 1: Write failing serialization tests**

```ts
const csv = serializeRecruitmentCsv([{ ...ADMIN_CANDIDATES[0]!, name: "=SUM(1,1)" }]);
expect(csv.startsWith("\uFEFF姓名,学号,联系方式")).toBe(true);
expect(csv).toContain("'=SUM(1,1)");
expect(buildRecruitmentExportName("2026 秋季招新", new Date("2026-08-03T16:30:00")))
  .toBe("HSD-2026秋季招新-报名名单-20260803-1630.csv");
```

- [ ] **Step 2: Verify failure, then implement pure CSV helpers**

Escape double quotes as `""`, wrap cells containing comma/quote/newline in quotes, prefix dangerous formula-leading values with `'`, and prepend the UTF-8 BOM. Add JSDoc stating that the backend replacement must generate `.xlsx` with the same filters, columns, authorization, and date cells.

- [ ] **Step 3: Wire browser download**

```ts
const blob = new Blob([serializeRecruitmentCsv(visible.value)], { type: "text/csv;charset=utf-8" });
const url = URL.createObjectURL(blob);
const anchor = document.createElement("a");
anchor.href = url;
anchor.download = buildRecruitmentExportName("2026 秋季招新", new Date());
anchor.click();
URL.revokeObjectURL(url);
```

Disable export when `visible.length === 0` and render `当前没有可导出的报名人员`.

- [ ] **Step 4: Run focused tests and commit**

```bash
git add app/utils/recruitment-export.ts tests/unit/recruitment-export.test.ts app/pages/admin/recruitment/applications.vue
git commit -m "feat: export recruitment roster csv"
```

### Task 5: Normalize member duty, public projection, and Baize direction

**Files:**
- Modify: `app/data/member-profile.ts`
- Modify: `app/data/admin-members.ts`
- Modify: `app/data/people.ts`
- Modify: `app/composables/useMemberRepository.ts`
- Modify: `app/stores/member-profile.ts`
- Modify: `app/utils/member-profile-form.ts`
- Modify: `app/utils/recruitment-application-form.ts`
- Test: `tests/unit/member-profile.test.ts`
- Test: `tests/unit/admin-members.test.ts`
- Test: `tests/unit/public-directory.test.ts`

**Interfaces:**
- Produces `MemberDuty = "普通成员" | "核心人员"` and optional `baizeDirection?: BaizeDirection`.
- Removes `AdminPublicState` and generic member `direction` from member/admin/public contracts.

- [ ] **Step 1: Write failing projection and validation tests**

```ts
expect(projectMemberToPublic(baizeProfile, basePerson).baizeDirection).toBe("鸿蒙开发");
expect(projectMemberToPublic(nonBaizeProfile, basePerson).baizeDirection).toBeUndefined();
expect(validateMemberProfileDraft({ center: "新媒体中心", baizeDirection: undefined, bio: "" }))
  .toEqual({});
expect(validateMemberProfileDraft({ center: "白泽开发中心", baizeDirection: undefined, bio: "" }))
  .toEqual({ baizeDirection: "请选择白泽实践方向。" });
```

- [ ] **Step 2: Run tests and verify type/behavior failures**

- [ ] **Step 3: Replace member-facing direction and public state contracts**

```ts
export const MEMBER_DUTIES = ["普通成员", "核心人员"] as const;
export type MemberDuty = (typeof MEMBER_DUTIES)[number];

export interface MemberProfile {
  // keep existing identity fields
  memberDuty: MemberDuty;
  baizeDirection?: BaizeDirection;
  bio: string;
}
```

Remove `publicState` from `AdminMember` and make `PublicPerson.baizeDirection` optional. Normalize existing Baize fixture members to one of the five values. Remove member-direction values from non-Baize fixtures. Keep centre, activity, and asset descriptive text unchanged.

- [ ] **Step 4: Make bio optional and enforce centre-direction compatibility**

The member and registration validators accept an empty trimmed bio. Only Baize centre/member selection requires `baizeDirection`; non-Baize submission clears it.

- [ ] **Step 5: Run the three focused test files, then all unit tests**

Expected: no public-state contract remains and all unit tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/data/member-profile.ts app/data/admin-members.ts app/data/people.ts app/composables/useMemberRepository.ts app/stores/member-profile.ts app/utils/member-profile-form.ts app/utils/recruitment-application-form.ts tests/unit/member-profile.test.ts tests/unit/admin-members.test.ts tests/unit/public-directory.test.ts
git commit -m "refactor: normalize member public profiles"
```

### Task 6: Add persistent formal-member account creation

**Files:**
- Modify: `app/data/admin-system.ts`
- Modify: `app/stores/admin-access.ts`
- Modify: `app/stores/member-profile.ts`
- Create: `app/stores/member-administration.ts`
- Create: `app/utils/member-account-form.ts`
- Modify: `app/pages/admin/members/index.vue`
- Create: `tests/unit/member-account-creation.test.ts`
- Modify: `tests/unit/admin-access.test.ts`

**Interfaces:**
- `useMemberAdministrationStore().createFormalMember(input)` is the only UI orchestration entry point; it coordinates `useAdminAccessStore` and `useMemberProfileStore`.
- Produces `CreateFormalMemberInput` and `CreateFormalMemberResult`.
- New `MockAccount` records carry `mustChangePassword: boolean`; no changed password is persisted.

- [ ] **Step 1: Write failing creation tests**

```ts
const administration = useMemberAdministrationStore();
expect(administration.createFormalMember(validInput)).toMatchObject({ status: "success" });
expect(access.getAccount(validInput.studentId)?.mustChangePassword).toBe(true);
expect(profileStore.getProfile(`member-${validInput.studentId}`).identity).toBe("正式成员");
expect(administration.createFormalMember(validInput)).toEqual({ status: "duplicate_student_id" });
```

- [ ] **Step 2: Run focused tests and verify failure**

- [ ] **Step 3: Add strict input validation**

```ts
export interface CreateFormalMemberInput {
  name: string;
  studentId: string;
  grade: string;
  className: string;
  center: AdminCenter;
  memberDuty: MemberDuty;
  baizeDirection?: BaizeDirection;
  bio: string;
  avatarUrl?: string;
}

export type CreateFormalMemberResult =
  | { status: "success"; memberId: string; accountId: string }
  | { status: "duplicate_student_id" }
  | { status: "invalid_input"; errors: Record<string, string> }
  | { status: "storage_unavailable" };
```

Reject duplicate student IDs across all accounts. Require a five-value direction only for Baize and delete it otherwise. The action creates account and profile only after all validation succeeds, persists both versioned states, and rolls memory state back if either persistence operation throws.

- [ ] **Step 4: Build the approved add-member drawer**

The drawer contains no existing-account selector. It displays fixed identity `正式成员`, fixed initial password `hsd1314`, and first-login change notice. Member duty is a select with `普通成员` and `核心人员`. Direction is a select rendered only for Baize. Bio and avatar are optional.

- [ ] **Step 5: Run focused tests, full unit tests, and typecheck**

- [ ] **Step 6: Commit**

```bash
git add app/data/admin-system.ts app/stores/admin-access.ts app/stores/member-profile.ts app/stores/member-administration.ts app/utils/member-account-form.ts app/pages/admin/members/index.vue tests/unit/member-account-creation.test.ts tests/unit/admin-access.test.ts
git commit -m "feat: create formal member accounts"
```

### Task 7: Enforce first-login password change

**Files:**
- Modify: `app/pages/login.vue`
- Modify: `app/stores/session.ts`
- Modify: `app/middleware/auth.global.ts`
- Create: `app/pages/member/change-password.vue`
- Create: `app/utils/password-change.ts`
- Modify: `tests/unit/session-persistence.test.ts`
- Create: `tests/unit/password-change.test.ts`
- Modify: `tests/e2e/member-profile.spec.ts`

**Interfaces:**
- `session.signIn(account, password, options)` accepts the submitted password.
- Produces `mustChangePassword`, `completePasswordChange(newPassword, confirmation)`, and redirect guard behavior.

- [ ] **Step 1: Write failing session/password tests**

```ts
expect(session.signIn("20269999", "wrong-password").status).toBe("invalid_credentials");
expect(session.signIn("20269999", "hsd1314").status).toBe("password_change_required");
expect(validateNewPassword("hsd1314", "hsd1314")).toEqual({ password: "新密码不能与初始密码相同。" });
expect(validateNewPassword("new-pass-2026", "different")).toEqual({ confirmation: "两次输入的密码不一致。" });
```

- [ ] **Step 2: Verify focused tests fail**

- [ ] **Step 3: Implement the Mock security boundary**

New accounts accept only `hsd1314` while `mustChangePassword` is true. After change, set the flag false and continue to the original safe member target. Do not persist the replacement password or claim real password verification. Existing demo accounts keep current prototype behavior.

The auth middleware allows only `/member/change-password` and logout while the flag is true; all other protected destinations redirect there. Session restore preserves the restriction.

- [ ] **Step 4: Build the accessible password-change page**

Use current member styling, two password fields, inline errors, success continuation, and no admin/public navigation escape around the guard.

- [ ] **Step 5: Run focused tests, unit suite, and typecheck**

- [ ] **Step 6: Commit**

```bash
git add app/pages/login.vue app/stores/session.ts app/middleware/auth.global.ts app/pages/member/change-password.vue app/utils/password-change.ts tests/unit/session-persistence.test.ts tests/unit/password-change.test.ts tests/e2e/member-profile.spec.ts
git commit -m "feat: require first-login password change"
```

### Task 8: Simplify member, core-member, and centre UI

**Files:**
- Modify: `app/pages/admin/members/index.vue`
- Modify: `app/pages/admin/members/[id].vue`
- Modify: `app/pages/admin/core-members.vue`
- Modify: `app/pages/admin/centers.vue`
- Modify: `app/pages/member/profile.vue`
- Modify: `app/pages/join/apply.vue`
- Modify: `app/pages/people/members.vue`
- Modify: `app/pages/people/core.vue`
- Modify: `app/pages/people/[id].vue`
- Modify: `app/pages/centers/[slug].vue`
- Modify: `app/pages/about.vue`
- Modify: `tests/e2e/admin-platform.spec.ts`
- Modify: `tests/e2e/join-application.spec.ts`
- Modify: `tests/e2e/public-directory.spec.ts`

**Interfaces:**
- Consumes normalized profiles from Task 5 and account creation from Task 6.
- Derives core membership as manual core duty OR enabled centre-lead admin qualification.

- [ ] **Step 1: Update E2E expectations before UI code**

Tests must require no public-state filter/column, no generic direction input, no non-Baize direction rendering, no core term/edit/public/reorder controls, and no `配置中心资料` button.

- [ ] **Step 2: Run Playwright collection and focused unit tests**

Run: `sh scripts/with-hsd-node.sh corepack pnpm exec playwright test --list`

Expected: tests collect. If Chrome later aborts with `SIGABRT`/`kill EPERM`, report an environment startup blocker rather than an assertion failure.

- [ ] **Step 3: Apply public/profile UI rules**

Remove every public-state control. Render the Baize select only when centre is Baize. Remove the generic registration-profile direction input. Hide empty bio blocks. Update search copy and searchable fields so non-Baize records do not use direction.

- [ ] **Step 4: Implement add-only core-member interaction**

Candidate list contains formal members for whom derived `isCore` is false. Confirmation sets manual member duty to `核心人员`. The page displays only name, centre, and `核心人员` or `核心人员 · 中心负责人`; it has no term, edit, remove, public-state, preview, or drag controls.

- [ ] **Step 5: Remove centre configuration action**

Keep centre cards read-only and retain public centre pages.

- [ ] **Step 6: Run unit tests, typecheck, and build**

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add app/pages/admin/members/index.vue app/pages/admin/members/[id].vue app/pages/admin/core-members.vue app/pages/admin/centers.vue app/pages/member/profile.vue app/pages/join/apply.vue app/pages/people/members.vue app/pages/people/core.vue app/pages/people/[id].vue app/pages/centers/[slug].vue app/pages/about.vue tests/e2e/admin-platform.spec.ts tests/e2e/join-application.spec.ts tests/e2e/public-directory.spec.ts
git commit -m "feat: simplify member administration"
```

### Task 9: Final regression and documentation alignment

**Files:**
- Modify: `docs/superpowers/specs/2026-07-30-admin-platform-design.md`
- Modify: `docs/superpowers/specs/2026-08-03-login-admin-access-design.md`
- Modify: `docs/superpowers/specs/2026-08-03-admin-release-scope-member-recruitment-design.md`

**Interfaces:**
- No new runtime interface; closes test and documentation gaps.

- [ ] **Step 1: Search for obsolete UI and contracts**

Run:

```bash
rg -n "报名状态|公开资料.*全部状态|暂不公开|配置中心资料|查看上传任务|移入回收站|拖动手柄仅作原型展示" app tests
```

Expected: no active UI occurrence. Documentation may describe removed behavior only where explicitly marked historical.

- [ ] **Step 2: Run complete verification**

```bash
sh scripts/with-hsd-node.sh corepack pnpm run typecheck
sh scripts/with-hsd-node.sh corepack pnpm run test:unit
sh scripts/with-hsd-node.sh corepack pnpm run build
NUXT_TELEMETRY_DISABLED=1 sh scripts/with-hsd-node.sh corepack pnpm run test:e2e
git diff --check
```

Expected: typecheck, unit tests, build, and diff check pass. E2E must pass in a functioning browser environment; a system Chrome `SIGABRT`/`kill EPERM` is reported separately as an environment blocker with no false claim about assertions.

- [ ] **Step 3: Perform browser QA**

Check `/admin/recruitment/applications`, one application detail, `/admin/members`, add-member drawer, first-password-change flow, `/admin/core-members`, `/admin/centers`, `/people/members`, and one person detail at 1440px and 390px. Verify keyboard focus, Escape on dialogs, no root horizontal overflow, and no stale disabled-module links.

- [ ] **Step 4: Align specs and mark implementation status accurately**

Update only statements contradicted by shipped behavior. Preserve the Mock/backend boundary and XLSX handoff intent.

- [ ] **Step 5: Commit final verification changes**

```bash
git add docs/superpowers/specs/2026-07-30-admin-platform-design.md docs/superpowers/specs/2026-08-03-login-admin-access-design.md docs/superpowers/specs/2026-08-03-admin-release-scope-member-recruitment-design.md
git commit -m "docs: align admin release behavior"
```
