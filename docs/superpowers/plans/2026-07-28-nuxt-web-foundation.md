# 白云 HSD 官网首阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的桌面端原型实现为可运行的 Nuxt Web 官网首版，包含完整首页、公共路由、按需登录拦截和关键二级页面骨架。

**Architecture:** 使用 Nuxt 混合渲染承载公开内容和成员任务页。公开页面通过静态 Mock 数据生成并支持 SEO；成员操作通过统一访问策略判断是否弹出登录页，并在登录后保留来源路由。视觉组件使用自研 CSS 令牌和 Tailwind 工具类，不用通用后台组件替代官网设计。

**Tech Stack:** Nuxt 4.5、Vue 3.5、TypeScript、Tailwind CSS 4、Pinia、VeeValidate、Zod、Pretext、Vitest、Nuxt Test Utils、Playwright。

## Global Constraints

- 产品名统一使用“白云 HSD 开发者部落”。
- 当前视觉验收基准为 1440px 桌面端，并兼容 1366px。
- 正文最小字号 16px；辅助标签最小字号 12px。
- 品牌颜色为 `#B1202B`、`#211F1E`、`#F4F0EB`、`#F5F6F7`。
- 不使用用户提供的宣传海报、华为 Logo 或未授权官方品牌素材。
- 公开内容无需登录；个人资料、报名提交、申请进度、考核和成长记录按需登录。
- 未提供真实素材时使用明确的媒体占位组件或 HSD 默认头像。
- 保留用户对 `白云HSD开发者部落-首页设计稿.png` 的删除，不恢复、不暂存。
- 页面变更同步更新 README、需求文档和设计变更记录。

---

### Task 1: Scaffold Nuxt and the Test Harness

**Files:**
- Create: `package.json`
- Create: `nuxt.config.ts`
- Create: `tsconfig.json`
- Create: `app/app.vue`
- Create: `app/assets/css/main.css`
- Create: `vitest.config.ts`
- Create: `tests/unit/site-config.test.ts`

**Interfaces:**
- Produces: Nuxt runtime, global CSS tokens, `SITE_CONFIG`.
- Consumes: project identity and navigation from `init/AGENTS.md`.

- [ ] **Step 1: Write the failing site configuration test**

```ts
import { describe, expect, it } from "vitest";
import { SITE_CONFIG } from "../../app/data/site";

describe("SITE_CONFIG", () => {
  it("uses the approved public brand and desktop navigation", () => {
    expect(SITE_CONFIG.name).toBe("白云 HSD 开发者部落");
    expect(SITE_CONFIG.navigation.map((item) => item.label)).toEqual([
      "首页", "部落介绍", "四大中心", "项目成果", "活动中心",
      "媒体画廊", "资源中心", "加入我们"
    ]);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm install && npm run test:unit -- tests/unit/site-config.test.ts`

Expected: FAIL because `app/data/site.ts` does not exist.

- [ ] **Step 3: Add Nuxt, testing configuration and the minimal site data**

```ts
export const SITE_CONFIG = {
  name: "白云 HSD 开发者部落",
  shortName: "< HSD >",
  navigation: [
    { label: "首页", to: "/" },
    { label: "部落介绍", to: "/about" },
    { label: "四大中心", to: "/centers" },
    { label: "项目成果", to: "/projects" },
    { label: "活动中心", to: "/activities" },
    { label: "媒体画廊", to: "/gallery" },
    { label: "资源中心", to: "/resources" },
    { label: "加入我们", to: "/join" }
  ]
} as const;
```

- [ ] **Step 4: Run unit tests and build**

Run: `npm run test:unit && npm run build`

Expected: tests pass and Nuxt creates `.output`.

---

### Task 2: Build the Shared Brand Shell

**Files:**
- Create: `app/layouts/default.vue`
- Create: `app/components/SiteHeader.vue`
- Create: `app/components/SiteFooter.vue`
- Create: `app/components/MediaPlaceholder.vue`
- Create: `app/components/HsdAvatar.vue`
- Create: `app/composables/usePretextLayout.ts`
- Create: `tests/unit/access-policy.test.ts`
- Create: `app/utils/access-policy.ts`

**Interfaces:**
- Produces: shared site header/footer, media and avatar fallbacks, `requiresLogin`.
- Consumes: `SITE_CONFIG`.

- [ ] **Step 1: Write a failing access-policy test**

```ts
expect(requiresLogin({ kind: "view-project" })).toBe(false);
expect(requiresLogin({ kind: "submit-activity" })).toBe(true);
expect(requiresLogin({ kind: "view-assessment" })).toBe(true);
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test:unit -- tests/unit/access-policy.test.ts`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement the access policy and shared shell**

```ts
export function requiresLogin(action: SiteAction): boolean {
  return ["submit-activity", "edit-profile", "view-application", "view-assessment", "view-growth", "download-internal"].includes(action.kind);
}
```

Use semantic landmarks, 16px body text, visible focus states, a single-level desktop navigation and a reusable HSD default avatar.

- [ ] **Step 4: Run tests**

Run: `npm run test:unit`

Expected: all tests pass.

---

### Task 3: Implement the Complete Homepage

**Files:**
- Create: `app/pages/index.vue`
- Create: `app/data/home.ts`
- Create: `app/components/home/HomeHero.vue`
- Create: `app/components/home/FlashNews.vue`
- Create: `app/components/home/StatsBand.vue`
- Create: `app/components/home/NewsSection.vue`
- Create: `app/components/home/CentersSection.vue`
- Create: `app/components/home/ProjectsSection.vue`
- Create: `app/components/home/ActivitiesSection.vue`
- Create: `app/components/home/GallerySection.vue`
- Create: `app/components/home/MembersSection.vue`
- Create: `app/components/home/ResourcesSection.vue`
- Create: `tests/unit/home-content.test.ts`

**Interfaces:**
- Produces: complete homepage and typed home content arrays.
- Consumes: shared layout and media placeholders.

- [ ] **Step 1: Write the failing content-order test**

```ts
expect(HOME_SECTIONS).toEqual([
  "hero", "flash", "stats", "news", "centers", "projects",
  "activities", "gallery", "members", "resources", "recruitment"
]);
expect(PROJECTS[0].title).toBe("智巡先锋");
expect(PROJECTS[1].title).toBe("智学领航");
expect(PROJECTS[2].title).toBe("小白云");
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test:unit -- tests/unit/home-content.test.ts`

Expected: FAIL because the homepage data does not exist.

- [ ] **Step 3: Implement data and sections**

Use real approved copy, editor-style grids, no promotional posters, no random member photos and no text below the approved minimum sizes.

- [ ] **Step 4: Run tests and build**

Run: `npm run test:unit && npm run build`

Expected: all tests pass and the homepage route builds.

---

### Task 4: Add Real Routes and Login Continuation

**Files:**
- Create: `app/pages/about.vue`
- Create: `app/pages/centers.vue`
- Create: `app/pages/projects/index.vue`
- Create: `app/pages/projects/[slug].vue`
- Create: `app/pages/activities/index.vue`
- Create: `app/pages/activities/[slug].vue`
- Create: `app/pages/gallery.vue`
- Create: `app/pages/resources.vue`
- Create: `app/pages/join.vue`
- Create: `app/pages/login.vue`
- Create: `app/pages/member/index.vue`
- Create: `app/data/projects.ts`
- Create: `app/data/activities.ts`
- Create: `app/stores/session.ts`
- Create: `app/middleware/member.ts`
- Create: `tests/unit/login-continuation.test.ts`

**Interfaces:**
- Produces: public routes, protected member route and `buildLoginTarget`.
- Consumes: access policy and shared shell.

- [ ] **Step 1: Write the failing continuation test**

```ts
expect(buildLoginTarget("/activities/harmonyos?signup=1"))
  .toBe("/login?redirect=%2Factivities%2Fharmonyos%3Fsignup%3D1");
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test:unit -- tests/unit/login-continuation.test.ts`

Expected: FAIL because the redirect helper does not exist.

- [ ] **Step 3: Implement routes and login continuation**

Public content remains visible. Only buttons that mutate personal state navigate through `/login?redirect=...`. Member routes use middleware and return to the exact source route after simulated login.

- [ ] **Step 4: Run unit tests and build**

Run: `npm run test:unit && npm run build`

Expected: tests pass and all routes compile.

---

### Task 5: Browser Verification and Documentation

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/home.spec.ts`
- Modify: `README.md`
- Modify: `HSD需求文档.md`
- Modify: `init/AGENTS.md`

**Interfaces:**
- Consumes: built Nuxt application.
- Produces: browser evidence and updated handoff documentation.

- [ ] **Step 1: Write browser acceptance tests**

```ts
test("desktop homepage exposes the approved sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /鸿蒙启航/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "四大中心，共同完成一件事" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "把想法做成真实项目" })).toBeVisible();
});
```

- [ ] **Step 2: Run all verification**

Run:

```text
npm run test:unit
npm run build
npm run test:e2e
```

Expected: zero failures, no horizontal overflow at 1440px and 1366px.

- [ ] **Step 3: Update documentation**

Document the Nuxt stack, local commands, implemented routes, Mock-data boundary, design-review corrections and a dated change-log row.

- [ ] **Step 4: Capture desktop screenshots**

Capture 1440px homepage and key route screenshots. Compare them against the approved prototype and inspect typography, content order, login boundaries and console errors.

