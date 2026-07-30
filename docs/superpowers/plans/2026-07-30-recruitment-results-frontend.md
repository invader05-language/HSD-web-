# Recruitment Results Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved personal results center, three-preference application form, and desktop recruitment administration workbench as a coherent Nuxt front-end prototype with deterministic Pinia Mock state.

**Architecture:** Define recruitment domain types and pure transition rules before UI work. A Pinia recruitment store acts as the replaceable data-access boundary for the prototype; personal, application, and administration pages consume public selectors/actions instead of importing fixtures directly. Real authorization, APIs, database transactions, notifications, and persistence remain outside this plan.

**Tech Stack:** Nuxt 4.5.1, Vue 3.5.40, TypeScript 5.9, Pinia 4.0, VeeValidate 4.15, Zod 4.4, Vitest 4.1, Playwright 1.62, existing global CSS.

## Global Constraints

- Product name remains “白云 HSD 开发者部落”.
- Node.js must be `>=22.18.0`; pnpm must be `10+`.
- Primary review target is desktop Web at `1440×1000`; `1366px` must not overflow horizontally.
- `/member/results`, `/join/apply`, and `/admin/recruitment` contain personal or administrative data and require login.
- All 26-level registered participants begin as preparatory members and retain normal platform access.
- White Ze development may appear only as preference 1; it is forbidden in preferences 2–3 and every adjustment target.
- Selecting White Ze requires exactly one of five directions; the direction does not consume a preference slot.
- Regular centers use one interview; White Ze requires three sequential rounds and becomes formal only after round 3 passes.
- Adjustment decisions happen offline. The prototype records only the final regular center or not-admitted outcome; it must not implement an online adjustment workflow.
- Personal UI shows only the current effective result. It must not show history, adjustment source, internal notes, scores, ranks, public comments, report arrangements, confirmation, or decline actions.
- Front-end state is explicitly Mock. Do not add network calls, database libraries, server routes, ORM configuration, or claims of persistent synchronization.
- Preserve unrelated untracked artifacts and reference screenshots.

---

### Task 1: Recruitment domain contract and pure business rules

**Files:**
- Create: `app/types/recruitment.ts`
- Create: `app/utils/recruitment-rules.ts`
- Create: `tests/unit/recruitment-rules.test.ts`
- Modify: `tests/unit/member-results.test.ts`

**Interfaces:**
- Produces:

```ts
export type CenterSlug =
  | "baize-development"
  | "new-media"
  | "tuowei-planning"
  | "talent-development";

export type RegularCenterSlug = Exclude<CenterSlug, "baize-development">;
export type BaizeDirection = "harmonyos" | "backend" | "aigc" | "ui-ux" | "embedded";
export type CandidateIdentity = "preparatory" | "formal-member" | "not-admitted";
export type AssessmentStage =
  | "not-submitted"
  | "interview"
  | "baize-round-1"
  | "baize-round-2"
  | "baize-round-3"
  | "offline-adjustment"
  | "completed";
export type AssessmentOutcome = "pending" | "passed" | "failed";
export type AdmissionStatus =
  | "no-application"
  | "pending"
  | "waitlisted"
  | "admitted"
  | "not-admitted";

export interface ApplicationPreferences {
  centers: [CenterSlug, CenterSlug?, CenterSlug?];
  baizeDirection?: BaizeDirection;
  acceptsAdjustment: boolean;
}

export interface PreferenceValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePreferences(input: ApplicationPreferences): PreferenceValidationResult;
export function getAdjustmentTargets(): readonly RegularCenterSlug[];
export function getNextStage(
  current: AssessmentStage,
  outcome: AssessmentOutcome,
  acceptsAdjustment: boolean
): AssessmentStage | "formal-member" | "not-admitted";
```

- Consumers: recruitment Pinia store, application form, personal result selectors, administration drawer.

- [ ] **Step 1: Write failing rule tests**

Create `tests/unit/recruitment-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getAdjustmentTargets,
  getNextStage,
  validatePreferences
} from "../../app/utils/recruitment-rules";

describe("recruitment preference rules", () => {
  it("accepts White Ze only as first preference with one direction", () => {
    expect(validatePreferences({
      centers: ["baize-development", "new-media", "talent-development"],
      baizeDirection: "harmonyos",
      acceptsAdjustment: true
    })).toEqual({ valid: true, errors: [] });
  });

  it("rejects White Ze outside first preference and duplicate centers", () => {
    expect(validatePreferences({
      centers: ["new-media", "baize-development", "new-media"],
      acceptsAdjustment: true
    }).errors).toEqual([
      "白泽开发中心只能作为第一志愿",
      "三个中心志愿不得重复"
    ]);
  });

  it("requires a direction only when White Ze is first", () => {
    expect(validatePreferences({
      centers: ["baize-development"],
      acceptsAdjustment: false
    }).errors).toEqual(["选择白泽开发中心后必须选择一个意向方向"]);

    expect(validatePreferences({
      centers: ["new-media"],
      baizeDirection: "harmonyos",
      acceptsAdjustment: false
    }).errors).toEqual(["非白泽第一志愿不得提交白泽意向方向"]);
  });

  it("never exposes White Ze as an adjustment target", () => {
    expect(getAdjustmentTargets()).toEqual([
      "new-media",
      "tuowei-planning",
      "talent-development"
    ]);
  });
});

describe("recruitment stage rules", () => {
  it("promotes regular-center interview pass directly to formal member", () => {
    expect(getNextStage("interview", "passed", true)).toBe("formal-member");
  });

  it("unlocks White Ze rounds sequentially", () => {
    expect(getNextStage("baize-round-1", "passed", true)).toBe("baize-round-2");
    expect(getNextStage("baize-round-2", "passed", true)).toBe("baize-round-3");
    expect(getNextStage("baize-round-3", "passed", true)).toBe("formal-member");
  });

  it("sends only adjustment-accepting failures to offline handling", () => {
    expect(getNextStage("interview", "failed", true)).toBe("offline-adjustment");
    expect(getNextStage("baize-round-2", "failed", true)).toBe("offline-adjustment");
    expect(getNextStage("interview", "failed", false)).toBe("not-admitted");
  });
});
```

Modify the existing `tests/unit/member-results.test.ts` expectation for adjusted admission so the personal badge and headline are indistinguishable from normal admission:

```ts
expect(describeAdmission({
  ...DEMO_MEMBER_RESULT,
  status: "admitted",
  finalCenter: "新媒体中心",
  finalDirection: undefined
})).toMatchObject({
  badge: "已录取",
  headline: "你已正式加入新媒体中心"
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm exec vitest run tests/unit/recruitment-rules.test.ts tests/unit/member-results.test.ts
```

Expected: FAIL because the recruitment rule module and final member-result behavior do not exist.

- [ ] **Step 3: Implement exact domain types and rules**

Create `app/types/recruitment.ts` with the exported unions and interfaces above.

Create `app/utils/recruitment-rules.ts`:

```ts
import type {
  ApplicationPreferences,
  AssessmentOutcome,
  AssessmentStage,
  PreferenceValidationResult,
  RegularCenterSlug
} from "~/types/recruitment";

const REGULAR_CENTERS = [
  "new-media",
  "tuowei-planning",
  "talent-development"
] as const satisfies readonly RegularCenterSlug[];

export function validatePreferences(input: ApplicationPreferences): PreferenceValidationResult {
  const errors: string[] = [];
  const definedCenters = input.centers.filter(Boolean);

  if (definedCenters.slice(1).includes("baize-development")) {
    errors.push("白泽开发中心只能作为第一志愿");
  }
  if (new Set(definedCenters).size !== definedCenters.length) {
    errors.push("三个中心志愿不得重复");
  }
  if (input.centers[0] === "baize-development" && !input.baizeDirection) {
    errors.push("选择白泽开发中心后必须选择一个意向方向");
  }
  if (input.centers[0] !== "baize-development" && input.baizeDirection) {
    errors.push("非白泽第一志愿不得提交白泽意向方向");
  }

  return { valid: errors.length === 0, errors };
}

export function getAdjustmentTargets(): readonly RegularCenterSlug[] {
  return REGULAR_CENTERS;
}

export function getNextStage(
  current: AssessmentStage,
  outcome: AssessmentOutcome,
  acceptsAdjustment: boolean
): AssessmentStage | "formal-member" | "not-admitted" {
  if (outcome === "pending") return current;
  if (outcome === "failed") {
    return acceptsAdjustment ? "offline-adjustment" : "not-admitted";
  }
  if (current === "interview") return "formal-member";
  if (current === "baize-round-1") return "baize-round-2";
  if (current === "baize-round-2") return "baize-round-3";
  if (current === "baize-round-3") return "formal-member";
  return "not-admitted";
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
pnpm exec vitest run tests/unit/recruitment-rules.test.ts tests/unit/member-results.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit the domain contract**

```powershell
git add -- app/types/recruitment.ts app/utils/recruitment-rules.ts tests/unit/recruitment-rules.test.ts tests/unit/member-results.test.ts
git commit -m "feat: define recruitment result rules"
```

---

### Task 2: Replaceable Pinia recruitment data boundary

**Files:**
- Create: `app/data/recruitment.ts`
- Create: `app/stores/recruitment.ts`
- Modify: `app/stores/session.ts`
- Modify: `app/pages/login.vue`
- Create: `tests/unit/recruitment-store.test.ts`

**Interfaces:**
- Produces:

```ts
export interface ResponsibleContact {
  name: string;
  role: string;
  contact: string;
}

export interface RecruitmentCandidate {
  id: string;
  userId: string;
  name: string;
  studentId: string;
  batchLabel: string;
  identity: CandidateIdentity;
  preferences: ApplicationPreferences;
  stage: AssessmentStage;
  outcome: AssessmentOutcome;
  admissionStatus: AdmissionStatus;
  finalCenter?: CenterSlug;
  finalDirection?: BaizeDirection;
  internalNote: string;
  updatedAt: string;
}

export interface RecordAssessmentInput {
  candidateId: string;
  stage: AssessmentStage;
  outcome: AssessmentOutcome;
  internalNote: string;
}

export interface RecordFinalDecisionInput {
  candidateId: string;
  decision: "admit-regular" | "not-admitted";
  finalCenter?: RegularCenterSlug;
  internalNote: string;
}

export interface PersonalResultView {
  batchLabel: string;
  identity: CandidateIdentity;
  admissionStatus: AdmissionStatus;
  currentStage: AssessmentStage;
  currentOutcome: AssessmentOutcome;
  preferences: ApplicationPreferences;
  finalCenter?: CenterSlug;
  finalDirection?: BaizeDirection;
  responsibleContact: ResponsibleContact;
}
```

- Store actions:

```ts
submitApplication(userId: string, preferences: ApplicationPreferences): void;
recordAssessment(input: RecordAssessmentInput): void;
recordFinalDecision(input: RecordFinalDecisionInput): void;
getPersonalResult(userId: string): PersonalResultView | undefined;
```

- [ ] **Step 1: Write failing Pinia store tests**

Create `tests/unit/recruitment-store.test.ts`:

```ts
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useRecruitmentStore } from "../../app/stores/recruitment";

describe("recruitment store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("groups candidates by first preference", () => {
    const store = useRecruitmentStore();
    expect(store.candidatesByCenter("baize-development").every(
      (candidate) => candidate.preferences.centers[0] === "baize-development"
    )).toBe(true);
  });

  it("promotes a regular-center interview pass", () => {
    const store = useRecruitmentStore();
    const candidate = store.candidates.find(
      (item) => item.preferences.centers[0] === "new-media"
    )!;

    store.recordAssessment({
      candidateId: candidate.id,
      stage: "interview",
      outcome: "passed",
      internalNote: "面试通过"
    });

    expect(candidate.identity).toBe("formal-member");
    expect(candidate.finalCenter).toBe("new-media");
    expect(candidate.stage).toBe("completed");
  });

  it("requires three sequential White Ze passes", () => {
    const store = useRecruitmentStore();
    const candidate = store.candidates.find(
      (item) => item.preferences.centers[0] === "baize-development"
    )!;

    store.recordAssessment({
      candidateId: candidate.id,
      stage: "baize-round-1",
      outcome: "passed",
      internalNote: ""
    });
    expect(candidate.stage).toBe("baize-round-2");
    expect(candidate.identity).toBe("preparatory");

    expect(() => store.recordAssessment({
      candidateId: candidate.id,
      stage: "baize-round-3",
      outcome: "passed",
      internalNote: ""
    })).toThrow("只能录入当前考核轮次");
  });

  it("records offline adjustment only to a regular center", () => {
    const store = useRecruitmentStore();
    const candidate = store.candidates[0]!;
    candidate.stage = "offline-adjustment";

    store.recordFinalDecision({
      candidateId: candidate.id,
      decision: "admit-regular",
      finalCenter: "talent-development",
      internalNote: "线下确认调剂"
    });

    expect(candidate.identity).toBe("formal-member");
    expect(candidate.finalCenter).toBe("talent-development");
    expect(store.getPersonalResult(candidate.userId)?.admissionStatus).toBe("admitted");
  });
});
```

- [ ] **Step 2: Run the store test and verify RED**

Run:

```powershell
pnpm exec vitest run tests/unit/recruitment-store.test.ts
```

Expected: FAIL because the store and fixtures do not exist.

- [ ] **Step 3: Create deterministic fixtures**

Create `app/data/recruitment.ts` with:

- one White Ze first-round candidate with `userId: "demo-white"`;
- one new-media interview candidate with `userId: "demo-pending"`;
- one planning candidate awaiting offline result with `userId: "demo-adjustment"`;
- one admitted talent-development member with `userId: "demo-member"`;
- one already-adjusted new-media admission with `userId: "demo-adjusted"` whose personal view is still plain `"admitted"`;
- center labels, direction labels, and one approved responsible contact per center.

Every record must use obviously fictional names such as “演示成员甲” and must not use user-provided screenshots or posters.

- [ ] **Step 4: Add a stable Mock user identifier to the session**

Add `userId: "demo-member"` to the existing session state and change the action signature to:

```ts
signIn(account = "demo-member") {
  this.isAuthenticated = true;
  this.userId = account;
}
```

Change the login page to call `session.signIn(account.value)`. Task 5 will extend the same action to derive Mock administration roles without changing this user-ID behavior.

- [ ] **Step 5: Implement store actions and selectors**

Create `app/stores/recruitment.ts` using `defineStore`. Clone fixtures into store state so tests do not mutate the imported constants. Validate every application with `validatePreferences`, reject out-of-order rounds with `"只能录入当前考核轮次"`, and reject a regular admission without a regular `finalCenter` with `"调剂录取必须选择普通中心"`.

When an assessment creates a formal member, update in one synchronous action:

```ts
candidate.identity = "formal-member";
candidate.admissionStatus = "admitted";
candidate.stage = "completed";
candidate.outcome = "passed";
candidate.finalCenter = candidate.preferences.centers[0];
candidate.finalDirection =
  candidate.finalCenter === "baize-development"
    ? candidate.preferences.baizeDirection
    : undefined;
candidate.updatedAt = new Date().toISOString();
```

The prototype labels this behavior “Mock 联动预览”; it does not claim database persistence.

- [ ] **Step 6: Run store tests and verify GREEN**

Run:

```powershell
pnpm exec vitest run tests/unit/recruitment-store.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 7: Commit the data boundary**

```powershell
git add -- app/data/recruitment.ts app/stores/recruitment.ts app/pages/login.vue app/stores/session.ts tests/unit/recruitment-store.test.ts
git commit -m "feat: add recruitment mock data boundary"
```

---

### Task 3: Three-preference recruitment application

**Files:**
- Modify: `app/pages/join/apply.vue`
- Modify: `app/assets/css/main.css`
- Create: `tests/e2e/recruitment-application.spec.ts`

**Interfaces:**
- Consumes: `validatePreferences`, center/direction labels, `useRecruitmentStore().submitApplication`.
- Produces: validated `ApplicationPreferences`.

- [ ] **Step 1: Write failing application E2E tests**

Create `tests/e2e/recruitment-application.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login?redirect=%2Fjoin%2Fapply");
  await page.getByLabel("学号或成员账号").fill("20260001");
  await page.getByLabel("密码").fill("123456");
  await page.getByRole("button", { name: "登录并继续" }).click();
});

test("White Ze first preference requires one direction and excludes White Ze later", async ({ page }) => {
  await page.getByLabel("第一志愿").selectOption("baize-development");
  await expect(page.getByLabel("白泽意向方向")).toBeVisible();
  await expect(page.getByLabel("第二志愿").locator("option[value='baize-development']")).toHaveCount(0);
  await expect(page.getByLabel("第三志愿").locator("option[value='baize-development']")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "提交招新申请" })).toBeDisabled();
});

test("regular first preference never offers White Ze as a later preference", async ({ page }) => {
  await page.getByLabel("第一志愿").selectOption("new-media");
  await expect(page.getByLabel("白泽意向方向")).toHaveCount(0);
  await expect(page.getByLabel("第二志愿").locator("option[value='baize-development']")).toHaveCount(0);
});

test("duplicate preferences produce an explicit validation error", async ({ page }) => {
  await page.getByLabel("第一志愿").selectOption("new-media");
  await page.getByLabel("第二志愿").selectOption("new-media");
  await expect(page.getByText("三个中心志愿不得重复")).toBeVisible();
});
```

- [ ] **Step 2: Run E2E and verify RED**

Run:

```powershell
pnpm exec playwright test tests/e2e/recruitment-application.spec.ts
```

Expected: FAIL because the current form exposes only one center field.

- [ ] **Step 3: Implement conditional preference fields**

Replace `center` with `preference1`, `preference2`, `preference3`, `baizeDirection`, and `acceptsAdjustment`.

Use slug values for `<option>` values and human labels for visible text. `preference1` is required; the other two are optional. Never include White Ze in the second/third option arrays. Render the direction field with `v-if="preference1 === 'baize-development'"` and clear a stale direction whenever the first preference changes away from White Ze.

Use a form-level computed validation:

```ts
const preferenceValidation = computed(() => validatePreferences({
  centers: [
    values.preference1,
    values.preference2 || undefined,
    values.preference3 || undefined
  ],
  baizeDirection: values.preference1 === "baize-development"
    ? values.baizeDirection
    : undefined,
  acceptsAdjustment: values.acceptsAdjustment === "yes"
}));
```

Disable submission while this result is invalid, VeeValidate fields are invalid, or submission is in progress.

- [ ] **Step 4: Wire Mock submission**

On submit, call:

```ts
recruitment.submitApplication(session.userId, {
  centers: [
    values.preference1,
    values.preference2 || undefined,
    values.preference3 || undefined
  ],
  baizeDirection: values.preference1 === "baize-development"
    ? values.baizeDirection
    : undefined,
  acceptsAdjustment: values.acceptsAdjustment === "yes"
});
```

Keep the success copy explicit: “当前为前端演示，志愿仅保存在本次页面会话中，不写入真实数据库。”

- [ ] **Step 5: Add form layout CSS and verify GREEN**

Use existing two-column `.form-grid` at desktop, conditional full-width direction/adjustment rows, visible field errors, and single-column reflow below the existing form breakpoint.

Run:

```powershell
pnpm exec playwright test tests/e2e/recruitment-application.spec.ts
```

Expected: all application tests pass.

- [ ] **Step 6: Commit the application task**

```powershell
git add -- app/pages/join/apply.vue app/assets/css/main.css tests/e2e/recruitment-application.spec.ts
git commit -m "feat: add ranked recruitment preferences"
```

---

### Task 4: Protected personal results center

**Files:**
- Modify: `app/data/member-results.ts`
- Create: `app/components/results/ResultStatusPanel.vue`
- Create: `app/components/results/PreferenceSummary.vue`
- Create: `app/components/results/ResponsibleContactCard.vue`
- Modify: `app/pages/member/results.vue`
- Modify: `app/pages/assessment-results.vue`
- Modify: `app/pages/member/index.vue`
- Modify: `app/pages/login.vue`
- Modify: `app/data/site.ts`
- Modify: `app/assets/css/main.css`
- Modify: `tests/unit/site-config.test.ts`
- Modify: `tests/e2e/member-results.spec.ts`

**Interfaces:**
- Consumes: `useRecruitmentStore().getPersonalResult(userId)`.
- Produces:

```ts
export interface ResultPresentation {
  badge: string;
  headline: string;
  description: string;
  tone: "neutral" | "success" | "attention";
}

export function describeAdmission(view: PersonalResultView): ResultPresentation;
export function describeAssessment(view: PersonalResultView): ResultPresentation;
```

- [ ] **Step 1: Finish result presentation unit tests**

Update `tests/unit/member-results.test.ts` to assert:

- normal and adjusted admissions both return badge `"已录取"`;
- adjusted source text never appears;
- offline adjustment maps to `"结果待公布"`;
- no history, score, rank, public-comment, report, confirmation, or decline fields exist in `PersonalResultView`.

- [ ] **Step 2: Extend the existing browser tests with new failing states**

Update `tests/e2e/member-results.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("result center requires login and returns to the personal page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "结果中心" }).click();
  await expect(page).toHaveURL((url) =>
    url.pathname === "/login" && url.searchParams.get("redirect") === "/member/results"
  );

  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码").fill("123456");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page).toHaveURL(/\/member\/results$/);
  await expect(page.getByRole("heading", { level: 1, name: "结果中心" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "招新录取" })).toHaveAttribute("aria-selected", "true");
});

test("personal result shows current information without prohibited details", async ({ page }) => {
  await page.goto("/login?redirect=%2Fmember%2Fresults");
  await page.getByLabel("学号或成员账号").fill("demo-member");
  await page.getByLabel("密码").fill("123456");
  await page.getByRole("button", { name: "登录并继续" }).click();

  const main = page.getByRole("main");
  await expect(main).toContainText("第一志愿");
  await expect(main).toContainText("对应负责人");
  await expect(main).not.toContainText("调剂来源");
  await expect(main).not.toContainText("确认加入");
  await expect(main).not.toContainText("放弃名额");
  await expect(main).not.toContainText("报到地点");

  await page.getByRole("tab", { name: "阶段考核" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("当前阶段");
  await expect(page.getByRole("tabpanel")).not.toContainText("历史记录");
});

test("offline adjusted admission is presented only as the final admission", async ({ page }) => {
  await page.goto("/login?redirect=%2Fmember%2Fresults");
  await page.getByLabel("学号或成员账号").fill("demo-adjusted");
  await page.getByLabel("密码").fill("123456");
  await page.getByRole("button", { name: "登录并继续" }).click();

  const main = page.getByRole("main");
  await expect(main).toContainText("已录取");
  await expect(main).toContainText("新媒体中心");
  await expect(main).not.toContainText("调剂后录取");
  await expect(main).not.toContainText("调剂来源");
});

test("old assessment route remains compatible", async ({ page }) => {
  await page.goto("/assessment-results");
  await expect(page).toHaveURL((url) =>
    url.pathname === "/login" && url.searchParams.get("redirect") === "/assessment-results"
  );
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
pnpm exec vitest run tests/unit/member-results.test.ts tests/unit/site-config.test.ts
pnpm exec playwright test tests/e2e/member-results.spec.ts
```

Expected: tests fail because the existing visual draft imports one fixed result record directly and exposes a distinct adjusted-admission presentation instead of consuming account-scoped store results.

- [ ] **Step 4: Implement presentation helpers and components**

`describeAdmission` maps all admitted records—including offline adjusted records—to:

```ts
{
  badge: "已录取",
  headline: `你已正式加入${centerLabel}`,
  description: "你已完成本期招新安排，当前身份为正式成员。后续事项请与对应负责人保持联系。",
  tone: "success"
}
```

Do not accept adjustment-source, score, history, or public-comment inputs in the personal component props.

Implement the three components with semantic headings, definition lists, visible status text, and a copy button that announces `"联系方式已复制"` in an `aria-live="polite"` region.

- [ ] **Step 5: Implement route integration**

Create `/member/results` with accessible tabs:

```vue
<div role="tablist" aria-label="结果分类">
  <button role="tab" :aria-selected="activeTab === 'admission'">招新录取</button>
  <button role="tab" :aria-selected="activeTab === 'assessment'">阶段考核</button>
</div>
<section role="tabpanel" tabindex="0">
  <!-- current tab content -->
</section>
```

Modify the old page to use `await navigateTo("/member/results", { replace: true })` after middleware authentication. Change the site navigation and member-space link to “结果中心”. Keep login copy focused on protected personal data.

- [ ] **Step 6: Implement desktop and responsive CSS**

Use:

- `max-width: 1240px`;
- 8/4 result/summary columns at `>=900px`;
- deep-red status line, restrained 4–8px radii, borders instead of large shadows;
- near-black responsible contact panel;
- single-column order result → preferences → responsible contact below `900px`;
- minimum 44px tab and copy controls.

- [ ] **Step 7: Verify the personal result task**

Run:

```powershell
pnpm exec vitest run tests/unit/member-results.test.ts tests/unit/site-config.test.ts
pnpm exec playwright test tests/e2e/member-results.spec.ts
```

Expected: all focused tests pass.

- [ ] **Step 8: Commit the result center**

```powershell
git add -- app/data/member-results.ts app/components/results app/pages/member/results.vue app/pages/assessment-results.vue app/pages/member/index.vue app/pages/login.vue app/data/site.ts app/assets/css/main.css tests/unit/member-results.test.ts tests/unit/site-config.test.ts tests/e2e/member-results.spec.ts
git commit -m "feat: add protected recruitment results center"
```

---

### Task 5: Mock administration role and recruitment workbench shell

**Files:**
- Modify: `app/stores/session.ts`
- Modify: `app/pages/login.vue`
- Create: `app/middleware/admin.ts`
- Create: `app/pages/admin/recruitment.vue`
- Create: `app/components/admin/RecruitmentFilters.vue`
- Create: `app/components/admin/RecruitmentTable.vue`
- Modify: `app/assets/css/main.css`
- Create: `tests/unit/admin-access.test.ts`
- Create: `tests/e2e/recruitment-admin.spec.ts`

**Interfaces:**
- Session produces:

```ts
export type DemoRole = "member" | "center-lead" | "alliance-lead";

interface SessionState {
  isAuthenticated: boolean;
  userId: string;
  memberName: string;
  role: DemoRole;
  managedCenter?: CenterSlug;
}

signIn(account: string): void;
canManageRecruitment: boolean;
```

- Administration filters:

```ts
export interface RecruitmentFilters {
  query: string;
  center: CenterSlug | "all";
  stage: AssessmentStage | "all";
  outcome: AssessmentOutcome | "all";
  acceptsAdjustment: boolean | "all";
}
```

- [ ] **Step 1: Write failing access tests**

Create `tests/unit/admin-access.test.ts`:

```ts
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "../../app/stores/session";

describe("demo administration access", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("maps alliance and center demo accounts to scoped roles", () => {
    const session = useSessionStore();
    session.signIn("admin-alliance");
    expect(session.role).toBe("alliance-lead");
    expect(session.canManageRecruitment).toBe(true);

    session.signOut();
    session.signIn("admin-baize");
    expect(session.role).toBe("center-lead");
    expect(session.managedCenter).toBe("baize-development");
  });

  it("does not grant administration access to a member account", () => {
    const session = useSessionStore();
    session.signIn("20260001");
    expect(session.role).toBe("member");
    expect(session.canManageRecruitment).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing workbench E2E tests**

Create `tests/e2e/recruitment-admin.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("alliance lead sees all recruitment groups", async ({ page }) => {
  await page.goto("/login?redirect=%2Fadmin%2Frecruitment");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码").fill("123456");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "预备成员考核台" })).toBeVisible();
  await expect(page.getByRole("button", { name: "全部人员" })).toBeVisible();
  await expect(page.getByRole("button", { name: "白泽开发中心" })).toBeVisible();
  await expect(page.getByRole("table", { name: "预备成员名单" })).toBeVisible();
});

test("member account receives an explicit forbidden state", async ({ page }) => {
  await page.goto("/login?redirect=%2Fadmin%2Frecruitment");
  await page.getByLabel("学号或成员账号").fill("20260001");
  await page.getByLabel("密码").fill("123456");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page.getByRole("heading", { name: "无权访问预备成员考核台" })).toBeVisible();
});
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```powershell
pnpm exec vitest run tests/unit/admin-access.test.ts
pnpm exec playwright test tests/e2e/recruitment-admin.spec.ts
```

Expected: FAIL because role state, middleware, and workbench do not exist.

- [ ] **Step 4: Extend the demo session without implying real authorization**

Change login to `session.signIn(account.value)`. Map only these exact demo accounts:

- `admin-alliance` → alliance lead;
- `admin-baize` → White Ze center lead;
- `admin-media` → new-media center lead;
- `admin-planning` → planning center lead;
- `admin-talent` → talent-development center lead;
- every other valid account → member.

Add visible login help explaining these are local prototype roles and not production credentials.

- [ ] **Step 5: Implement administration middleware and forbidden state**

`app/middleware/admin.ts` must:

1. redirect anonymous users through the existing safe login continuation;
2. allow `center-lead` and `alliance-lead`;
3. render `/admin/recruitment?forbidden=1` for an authenticated member instead of redirecting in a loop.

The page reads `route.query.forbidden` and renders a standard task-page error panel with a return link to `/member`.

- [ ] **Step 6: Implement workbench shell, filters, and scoped rows**

The alliance lead sees “全部人员” plus four center groups. A center lead sees only the managed center group and records whose first preference matches it.

The table uses the approved columns and a single “查看/处理” button per row. Filtering must be computed locally and preserve current filter values when no rows match.

- [ ] **Step 7: Add desktop and responsive workbench CSS**

At desktop use a fixed 220px group column and flexible table region. At widths below 1024px, move group buttons into a horizontally scrollable tab row and keep the data table inside a labeled horizontal scroll container; do not shrink text below 14px.

- [ ] **Step 8: Verify and commit the workbench shell**

Run:

```powershell
pnpm exec vitest run tests/unit/admin-access.test.ts
pnpm exec playwright test tests/e2e/recruitment-admin.spec.ts
```

Expected: all focused tests pass.

Commit:

```powershell
git add -- app/stores/session.ts app/pages/login.vue app/middleware/admin.ts app/pages/admin/recruitment.vue app/components/admin/RecruitmentFilters.vue app/components/admin/RecruitmentTable.vue app/assets/css/main.css tests/unit/admin-access.test.ts tests/e2e/recruitment-admin.spec.ts
git commit -m "feat: add recruitment administration workbench"
```

---

### Task 6: Candidate drawer, sequential assessment, and final-decision confirmation

**Files:**
- Create: `app/components/admin/CandidateAssessmentDrawer.vue`
- Create: `app/components/admin/IdentityChangeDialog.vue`
- Modify: `app/pages/admin/recruitment.vue`
- Modify: `app/stores/recruitment.ts`
- Modify: `app/assets/css/main.css`
- Modify: `tests/unit/recruitment-store.test.ts`
- Modify: `tests/e2e/recruitment-admin.spec.ts`

**Interfaces:**
- Drawer props/events:

```ts
interface Props {
  candidate: RecruitmentCandidate;
}

const emit = defineEmits<{
  close: [];
  requestSave: [
    input: RecordAssessmentInput | RecordFinalDecisionInput
  ];
}>();
```

- Confirmation dialog:

```ts
interface IdentityChangePreview {
  previousIdentity: CandidateIdentity;
  nextIdentity: CandidateIdentity;
  finalCenter?: CenterSlug;
  finalDirection?: BaizeDirection;
  affectedModules: string[];
}
```

- [ ] **Step 1: Extend store tests for forbidden transitions**

Add:

```ts
it("forbids White Ze as a final adjustment destination", () => {
  const store = useRecruitmentStore();
  const candidate = store.candidates[0]!;
  candidate.stage = "offline-adjustment";

  expect(() => store.recordFinalDecision({
    candidateId: candidate.id,
    decision: "admit-regular",
    finalCenter: "baize-development" as never,
    internalNote: "invalid"
  })).toThrow("白泽开发中心不能作为调剂目标");
});

it("maps an offline adjustment to admitted without exposing its source", () => {
  const store = useRecruitmentStore();
  const candidate = store.candidates[0]!;
  candidate.stage = "offline-adjustment";
  store.recordFinalDecision({
    candidateId: candidate.id,
    decision: "admit-regular",
    finalCenter: "new-media",
    internalNote: "线下确认"
  });

  const personal = store.getPersonalResult(candidate.userId)!;
  expect(personal.admissionStatus).toBe("admitted");
  expect("internalNote" in personal).toBe(false);
  expect("adjustmentSource" in personal).toBe(false);
});
```

- [ ] **Step 2: Add drawer E2E coverage**

Append:

```ts
test("White Ze drawer locks future rounds and previews identity changes", async ({ page }) => {
  await page.goto("/login?redirect=%2Fadmin%2Frecruitment");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码").fill("123456");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await page.getByRole("button", { name: "白泽开发中心" }).click();
  await page.getByRole("button", { name: /查看处理 演示成员甲/ }).click();

  const drawer = page.getByRole("dialog", { name: "预备成员详情" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByLabel("第二轮结果")).toBeDisabled();
  await expect(drawer.getByLabel("第三轮结果")).toBeDisabled();
});

test("adjustment selector never offers White Ze", async ({ page }) => {
  // Sign in as alliance lead and open the fixture awaiting offline decision.
  await page.goto("/login?redirect=%2Fadmin%2Frecruitment");
  await page.getByLabel("学号或成员账号").fill("admin-alliance");
  await page.getByLabel("密码").fill("123456");
  await page.getByRole("button", { name: "登录并继续" }).click();
  await page.getByRole("button", { name: /查看处理 演示成员丙/ }).click();

  const target = page.getByLabel("最终中心");
  await expect(target.locator("option[value='baize-development']")).toHaveCount(0);
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
pnpm exec vitest run tests/unit/recruitment-store.test.ts
pnpm exec playwright test tests/e2e/recruitment-admin.spec.ts
```

Expected: FAIL because the drawer and confirmation behavior do not exist.

- [ ] **Step 4: Implement accessible drawer**

Use `role="dialog"`, `aria-modal="true"`, a visible title, and a close button. On open, focus the close button and lock body scrolling. Trap Tab/Shift+Tab inside the drawer, close with Escape, and restore focus to the original row action.

For regular centers, render only an interview result. For White Ze, render all three rounds but disable every round after the current stage. For offline adjustment, render:

```vue
<select aria-label="最终中心">
  <option value="">请选择普通中心</option>
  <option value="new-media">新媒体中心</option>
  <option value="tuowei-planning">拓维策划中心</option>
  <option value="talent-development">人才发展中心</option>
</select>
```

Do not render a White Ze option.

- [ ] **Step 5: Implement identity-change preview and confirmation**

Before calling a store mutation that produces `formal-member` or `not-admitted`, show:

```ts
{
  previousIdentity: candidate.identity,
  nextIdentity,
  finalCenter,
  finalDirection,
  affectedModules: [
    "预备成员当前身份",
    "个人结果中心",
    "中心成员关系",
    "公开成员数据来源"
  ]
}
```

Label the list “Mock 联动预览：正式后端接入后需在同一事务中完成”。 Only the confirmation button invokes the store action.

- [ ] **Step 6: Preserve unsaved form state on errors**

Catch store errors, keep the drawer open, preserve selected values and internal note, and render the exact error in `role="alert"`. On success, close the confirmation dialog, keep the drawer open with refreshed data, and announce `"结果已保存到当前 Mock 会话"`.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
pnpm exec vitest run tests/unit/recruitment-store.test.ts
pnpm exec playwright test tests/e2e/recruitment-admin.spec.ts
```

Expected: all focused tests pass.

Commit:

```powershell
git add -- app/components/admin/CandidateAssessmentDrawer.vue app/components/admin/IdentityChangeDialog.vue app/pages/admin/recruitment.vue app/stores/recruitment.ts app/assets/css/main.css tests/unit/recruitment-store.test.ts tests/e2e/recruitment-admin.spec.ts
git commit -m "feat: add recruitment result administration"
```

---

### Task 7: Documentation state change and complete verification

**Files:**
- Modify: `HSD需求文档.md`
- Modify: `README.md`
- Modify: `init/AGENTS.md`
- Modify: `docs/superpowers/specs/2026-07-30-recruitment-results-system-design.md` only if implementation evidence requires a factual correction
- Modify: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes all routes, types, stores, and components from Tasks 1–6.
- Produces synchronized implementation status and regression evidence.

- [ ] **Step 1: Extend desktop route overflow coverage**

Add `/member/results` and `/admin/recruitment` to the authenticated route coverage in `tests/e2e/home.spec.ts`. Log in with `demo-member` before the member route and `admin-alliance` before the administration route. At `1440×1000`, assert:

```ts
expect(await page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth
)).toBe(true);
```

- [ ] **Step 2: Update documentation from planned to implemented**

Change the 2026-07-30 result-center rows from “设计已确认，待实现” to “已实现” only after all focused tests pass. Record:

- `/member/results`;
- `/assessment-results` compatibility behavior;
- `/admin/recruitment`;
- three-preference and White Ze restrictions;
- Mock role accounts;
- personal visibility boundary;
- no real backend/database/transaction.

Do not change the historical Task 4 statement that the old placeholder was the behavior delivered on 2026-07-29; mark it as superseded by the new implementation instead.

- [ ] **Step 3: Run stale-copy and forbidden-route scans**

Run:

```powershell
rg -n "调剂后录取|调剂来源|确认加入|放弃名额|报到地点|需携带材料" app/pages/member app/components/results app/data/member-results.ts
rg -n "value=\"baize-development\"" app/pages/join/apply.vue app/components/admin
rg -n "设计已确认，待实现" HSD需求文档.md README.md init/AGENTS.md
```

Expected:

- first command finds no personal result UI copy exposing prohibited content;
- second command finds White Ze only in the first-preference control, never later preferences or adjustment controls;
- third command finds no active implementation-status row after documentation is updated.

- [ ] **Step 4: Run the full unit suite**

Run:

```powershell
pnpm test
```

Expected: zero test failures.

- [ ] **Step 5: Run the full E2E suite**

Run:

```powershell
pnpm test:e2e
```

Expected: all Playwright tests pass with the repository’s current Playwright configuration.

- [ ] **Step 6: Run type and production build verification**

Run:

```powershell
pnpm exec nuxi typecheck
pnpm build
```

Expected: typecheck and build both exit 0.

- [ ] **Step 7: Run worktree checks**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors. Preserve unrelated untracked artifacts and reference screenshots; do not stage, modify, or delete them.

- [ ] **Step 8: Commit documentation and regression coverage**

```powershell
git add -- HSD需求文档.md README.md init/AGENTS.md docs/superpowers/specs/2026-07-30-recruitment-results-system-design.md tests/e2e/home.spec.ts
git commit -m "docs: record recruitment result workflows"
```

---

## Plan Self-Review

- Spec coverage: Tasks 1–7 cover preference validation, White Ze first-choice restriction, one-direction selection, four-group administration, regular interview, sequential White Ze rounds, offline final-result entry, personal current-only visibility, responsible contact, role scoping, Mock synchronization preview, responsive Web behavior, accessibility, and documentation.
- Placeholder scan: every implementation and error-state step includes exact behavior, commands, and expected results.
- Type consistency: `CenterSlug`, `RegularCenterSlug`, `BaizeDirection`, `AssessmentStage`, `AssessmentOutcome`, `AdmissionStatus`, `ApplicationPreferences`, and store action signatures are defined once and reused consistently.
- Scope control: the plan adds no backend, database, server API, ORM, real authorization, online adjustment workflow, score model, notification system, or batch result mutation.
- Data safety: personal selectors exclude internal notes and adjustment source; White Ze is excluded from all adjustment targets; unrelated untracked files remain untouched.
