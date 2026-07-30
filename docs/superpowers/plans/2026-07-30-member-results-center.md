# Member Results Center Implementation Plan

> 本草稿形成于完整业务规则确认之前，暂不执行。后续实现应使用
> `2026-07-30-recruitment-results-frontend.md`；完整规格见
> `../specs/2026-07-30-recruitment-results-system-design.md`。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the protected assessment placeholder with an integrated, desktop-first user results center for current admission and assessment status.

**Architecture:** Add a typed front-end result contract and pure presentation helpers under `app/data`, then render the current Mock record in a new protected `/member/results` Nuxt page. Keep the old route as a compatibility redirect, reuse the existing site shell and login continuation, and keep all admin workflow and database concerns outside the user page.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, Pinia demo session, Vitest, Vue Test Utils, Playwright, existing global CSS.

## Global Constraints

- Product name remains “白云 HSD 开发者部落”.
- Primary review target is desktop Web at `1440×1000`; `1366px` must not overflow horizontally.
- Most public content remains anonymous; `/member/results` is personal data and requires login.
- The page shows only current effective result data and one responsible contact.
- Do not show scores, rankings, public comments, internal notes, historical timelines, adjustment workflow, confirmation/decline actions, report time, report location, or required materials.
- Current implementation remains Mock front end; do not define database columns or claim real API persistence.

---

### Task 1: Typed member result presentation contract

**Files:**
- Create: `app/data/member-results.ts`
- Create: `tests/unit/member-results.test.ts`

**Interfaces:**
- Produces: `MemberResultRecord`, `DEMO_MEMBER_RESULT`, `describeAdmission(record)`, and `describeAssessment(record)`.
- Consumers: `app/pages/member/results.vue` and unit tests.

- [ ] **Step 1: Write the failing unit tests**

Create tests that import the missing module and assert literal, user-visible behavior:

```ts
import { describe, expect, it } from "vitest";
import {
  DEMO_MEMBER_RESULT,
  describeAdmission,
  describeAssessment
} from "../../app/data/member-results";

describe("member result presentation", () => {
  it("presents the current admitted destination without exposing history", () => {
    expect(describeAdmission(DEMO_MEMBER_RESULT)).toEqual({
      badge: "已录取",
      headline: "你已正式加入白泽开发中心",
      description: "你已完成本期招新考核，当前身份已由预备成员更新为正式成员。后续安排请与对应负责人保持联系。"
    });
    expect(DEMO_MEMBER_RESULT.preferences.map((item) => item.center)).toEqual([
      "白泽开发中心",
      "新媒体中心",
      "人才发展中心"
    ]);
  });

  it("presents only the current assessment state after assessment ends", () => {
    expect(describeAssessment(DEMO_MEMBER_RESULT)).toEqual({
      badge: "考核已结束",
      headline: "当前没有进行中的考核",
      description: "你的本期考核已经结束。本页只呈现当前有效状态，不展示历史轮次、分数、公开评语或调剂过程。"
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm exec vitest run tests/unit/member-results.test.ts`

Expected: FAIL because `app/data/member-results.ts` does not exist.

- [ ] **Step 3: Implement the minimal typed contract**

Create the exact status unions, preference/contact interfaces, one Mock record, and pure switch-based presentation helpers needed by the tests. Include all approved user statuses (`pending`, `admitted`, `waitlisted`, `not-admitted`, `adjusted-admission`, `no-application`) without adding score or history fields.

- [ ] **Step 4: Run the unit test and verify GREEN**

Run: `pnpm exec vitest run tests/unit/member-results.test.ts`

Expected: 2 tests pass.

### Task 2: Protected integrated results page and navigation

**Files:**
- Create: `app/pages/member/results.vue`
- Modify: `app/pages/assessment-results.vue`
- Modify: `app/data/site.ts`
- Modify: `app/pages/member/index.vue`
- Modify: `app/pages/login.vue`
- Modify: `tests/unit/site-config.test.ts`
- Create: `tests/e2e/member-results.spec.ts`

**Interfaces:**
- Consumes: `DEMO_MEMBER_RESULT`, `describeAdmission`, `describeAssessment`, and `useSessionStore`.
- Produces: protected `/member/results`, compatible `/assessment-results` redirect, and main-site navigation labeled “结果中心”.

- [ ] **Step 1: Change the navigation unit expectation and write the browser test**

Update the navigation expectation from `考核结果` to `结果中心`. Add an end-to-end test that clicks the new nav item, verifies `/login?redirect=%2Fmember%2Fresults`, completes demo login, checks the two tabs and approved result content, switches to the assessment tab, verifies current-only copy, and confirms prohibited copy is absent.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm exec vitest run tests/unit/site-config.test.ts
pnpm exec playwright test tests/e2e/member-results.spec.ts
```

Expected: unit test fails on the old navigation label; browser test fails because `/member/results` does not exist.

- [ ] **Step 3: Implement the Nuxt page and route integration**

Implement:

- existing `SiteHeader` and `SiteFooter` through the default layout;
- warm/near-black page header;
- accessible `招新录取` and `阶段考核` tabs;
- current result facts, three preferences, white-direction preference, adjustment preference, and one responsible contact;
- contact-copy feedback;
- old route redirect;
- member-space links to `/member/results`;
- login copy referring to the unified results center.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run the same Vitest and Playwright commands.

Expected: both commands exit 0.

### Task 3: Desktop visual implementation and responsive safety

**Files:**
- Modify: `app/assets/css/main.css`
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: class names emitted by `app/pages/member/results.vue`.
- Produces: the approved 1440px档案式 layout and safe responsive reflow.

- [ ] **Step 1: Extend the existing overflow test before styling**

Update the protected-route section to use the `结果中心` nav item and `/member/results`, then keep the horizontal overflow assertion at the 1440px Playwright viewport.

- [ ] **Step 2: Run the overflow test and verify RED**

Run: `pnpm exec playwright test tests/e2e/home.spec.ts --grep "desktop routes do not overflow horizontally"`

Expected: FAIL while the nav and route still use the old result path or the new page lacks the required layout.

- [ ] **Step 3: Add scoped result-center CSS**

Add result-center styles using existing CSS variables. Use 8/4 desktop columns, 4–8px radii, restrained borders, deep-red current state, near-black responsible-contact block, single-column reflow below 900px, and 44px minimum touch targets.

- [ ] **Step 4: Re-run overflow and page tests**

Run:

```powershell
pnpm exec playwright test tests/e2e/home.spec.ts --grep "desktop routes do not overflow horizontally"
pnpm exec playwright test tests/e2e/member-results.spec.ts
```

Expected: both commands exit 0.

### Task 4: Documentation sync and complete verification

**Files:**
- Modify: `HSD需求文档.md`
- Modify: `README.md`
- Modify: `init/AGENTS.md`
- Create: `docs/superpowers/specs/2026-07-30-member-results-center-design.md`

**Interfaces:**
- Documents the route, state, privacy, Mock boundary, and approved design so future API/backend work uses the same contract.

- [ ] **Step 1: Update all documentation sources**

Replace the old stable-placeholder boundary with the approved result-center rules, add `/member/results`, record the old-route redirect, and add a 2026-07-30 design-change row. Keep management workflow and database schema explicitly out of scope.

- [ ] **Step 2: Run placeholder and stale-route scans**

Run:

```powershell
rg -n "考核数据暂未接入|导航新增受保护的 /assessment-results|只呈现“考核数据暂未接入”" HSD需求文档.md README.md init/AGENTS.md
rg -n "结果中心|/member/results|/assessment-results" HSD需求文档.md README.md init/AGENTS.md
```

Expected: the stale placeholder scan returns no active requirements; the new-route scan shows synchronized references.

- [ ] **Step 3: Run full verification**

Run:

```powershell
pnpm test
pnpm exec playwright test
pnpm build
git diff --check
```

Expected: all tests pass, production build exits 0, and `git diff --check` reports no whitespace errors.

- [ ] **Step 4: Commit intentional files**

Stage only the plan, spec, result code, tests, and synchronized docs. Do not stage existing `artifacts/hsd-static-20260729.tar.gz` or local reference screenshots.

Commit message:

```text
feat: add integrated member results center
```
