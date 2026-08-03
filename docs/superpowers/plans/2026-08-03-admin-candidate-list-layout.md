# 管理员候选项布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** 将管理员资格弹窗的候选项简化为“姓名、归属、身份”三列，并统一负责人弹窗底部操作区间距。

**Architecture:** 在 `admin-system` 数据边界新增纯函数，统一把账号映射为候选项展示模型；页面模板只消费该模型，CSS 使用固定三列网格保持对齐。管理员权限、候选资格、存储和审计逻辑保持不变。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、Pinia、Vitest、Playwright、现有 `main.css` 设计系统。

## Global Constraints

- 候选项从左到右只显示姓名、归属、身份。
- 管理员身份显示具体中心负责人名称，普通账号显示“普通成员”。
- 不显示登录账号、成员编号或重复的内部标识。
- 负责人弹窗按钮区与添加管理员弹窗保持一致的上间距。
- 不修改权限边界、候选筛选规则、持久化和审计行为。

### Task 1: Add Candidate Display Mapping

**Files:**
- Modify: `app/data/admin-system.ts`
- Test: `tests/unit/admin-access.test.ts`

**Interfaces:**
- Produces `getAdminCandidateDisplay(account: MockAccount): { name: string; affiliation: string; identity: string }`.

- [ ] **Step 1: Write the failing test**

Add the import and test to `tests/unit/admin-access.test.ts`:

```ts
import { getAdminCandidateDisplay } from "../../app/data/admin-system";

it("maps candidate display fields to name, affiliation, and identity", () => {
  expect(getAdminCandidateDisplay(MOCK_ACCOUNTS.find((account) => account.account === "media-admin")!)).toEqual({
    name: "李同学",
    affiliation: "新媒体中心",
    identity: "新媒体中心负责人"
  });
  expect(getAdminCandidateDisplay(MOCK_ACCOUNTS.find((account) => account.account === "demo-member")!)).toEqual({
    name: "林同学",
    affiliation: "白泽开发中心",
    identity: "普通成员"
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec vitest run tests/unit/admin-access.test.ts -t "candidate display"`

Expected: FAIL because `getAdminCandidateDisplay` does not exist yet.

- [ ] **Step 3: Implement the minimal mapping**

Use `ADMIN_MEMBERS` by `account.memberId` for affiliation. Use `getAdminQualificationLabel(account)` for configured admins and `普通成员` for members. Fall back to `待确定` when a demo applicant has no `ADMIN_MEMBERS` record.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm exec vitest run tests/unit/admin-access.test.ts -t "candidate display"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/data/admin-system.ts tests/unit/admin-access.test.ts
git commit -m "feat: add administrator candidate display mapping"
```

### Task 2: Render Three-Column Candidates and Align Owner Footer

**Files:**
- Modify: `app/pages/admin/accounts.vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/e2e/admin-qualification-v2.spec.ts`

**Interfaces:**
- Consumes `getAdminCandidateDisplay` from Task 1.
- Keeps existing candidate selection, search, submit handlers, and role options unchanged.

- [ ] **Step 1: Add the browser assertions**

Update the reassignment flow with these assertions after opening the dialog:

```ts
const candidate = dialog.getByRole("button", { name: /选择 media-admin/ });
await expect(candidate).toContainText("李同学");
await expect(candidate).toContainText("新媒体中心");
await expect(candidate).toContainText("新媒体中心负责人");
```

The account remains in the accessible name only; it is not rendered in the three visible columns.

- [ ] **Step 2: Run the focused E2E collection/check**

Run: `pnpm exec playwright test tests/e2e/admin-qualification-v2.spec.ts --list`

Expected: the file is collected successfully; a full browser run may require the local Playwright runtime.

- [ ] **Step 3: Render the display model**

Import `getAdminCandidateDisplay`, render three spans in each candidate button, and retain an accessible account label for automation and keyboard users without showing the account in the visual columns.

- [ ] **Step 4: Update the layout styles**

Change `.admin-candidate-list button` to a three-column grid and style the three values with the existing admin typography. Add a scoped owner-dialog footer margin that matches the spacing already produced by the administrator dialog.

- [ ] **Step 5: Run focused unit and type checks**

Run: `pnpm exec vitest run tests/unit/admin-access.test.ts && pnpm run typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add app/pages/admin/accounts.vue app/assets/css/main.css tests/e2e/admin-qualification-v2.spec.ts
git commit -m "fix: simplify administrator candidate options"
```

### Task 3: Full Verification

**Files:**
- Verify: `app/pages/admin/accounts.vue`, `app/assets/css/main.css`, `app/data/admin-system.ts`

- [ ] **Step 1: Run the full unit suite**

Run: `pnpm run test:unit`

Expected: all existing and new tests pass.

- [ ] **Step 2: Build the application**

Run: `pnpm run build`

Expected: Nuxt production build completes successfully.

- [ ] **Step 3: Check the diff**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 4: Manually verify the preview**

Open `/admin/accounts`, open both add dialogs, and verify the three columns and owner footer spacing at desktop and narrow viewport widths.
