# Secondary Prototype Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a public desktop Web prototype containing all 13 confirmed secondary pages, including the previously designed project and activity details.

**Architecture:** Use a Next.js App Router site with one reusable prototype shell and a typed page registry. Public content pages and member task pages are rendered by focused components, while browser-only interactions such as page switching, tabs, form steps, gallery preview, and login interception remain local demo state with no backend.

**Tech Stack:** Next.js, React, TypeScript, CSS, Vitest, Playwright, Codex Sites.

## Global Constraints

- Brand name is `白云 HSD 开发者部落`.
- Desktop Web is the only design target for this version; design baseline is `1440px`.
- The layout must remain usable at common desktop widths of `1366px` and above.
- Core colors are `#B1202B`, `#211F1E`, `#F4F0EB`, and `#F5F6F7`.
- Do not use the supplied promotional posters as page backgrounds or banners.
- Do not use Huawei logos, Huawei ICT Academy marks, or other official brand assets without confirmed authorization.
- Do not include real names, phone numbers, emails, student IDs, assessment results, or application data.
- Public content remains viewable without login; login appears only when a personal action or personal record is requested.
- Login completion must preserve the originating task in the prototype flow.
- The deployed site must state that it is a design preview and not a production business system.
- Preserve the user's existing deletion of `白云HSD开发者部落-首页设计稿.png`; do not restore, stage, or commit that deletion.
- Read `.openai/hosting.json` before any Sites creation call. If it contains a `project_id`, reuse it exactly. Never call `create_site` more than once for this local site.

---

### Task 1: Scaffold the Typed Prototype Application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `lib/prototypes.ts`
- Create: `tests/prototypes.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `PrototypeSlug`, `PrototypeDefinition`, `PROTOTYPES`, and `getPrototype(slug)`.
- Consumes: the 13-page inventory in `docs/superpowers/specs/2026-07-28-secondary-prototype-design.md`.

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "baiyun-hsd-prototype",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.62.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.8.0",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Write the failing page-registry test**

```ts
import { describe, expect, it } from "vitest";
import { PROTOTYPES, getPrototype } from "../lib/prototypes";

describe("prototype registry", () => {
  it("contains every approved secondary page exactly once", () => {
    expect(PROTOTYPES.map((item) => item.slug)).toEqual([
      "project",
      "activity",
      "news",
      "center",
      "gallery",
      "resource",
      "directory",
      "story",
      "contact",
      "join",
      "member",
      "profile",
      "records",
    ]);
    expect(new Set(PROTOTYPES.map((item) => item.slug)).size).toBe(13);
  });

  it("marks personal pages as protected demonstrations", () => {
    expect(getPrototype("join").access).toBe("login-action");
    expect(getPrototype("member").access).toBe("protected");
    expect(getPrototype("profile").access).toBe("protected");
    expect(getPrototype("records").access).toBe("protected");
  });
});
```

- [ ] **Step 3: Run the registry test and verify failure**

Run: `npm install && npm test`

Expected: FAIL because `lib/prototypes.ts` does not exist.

- [ ] **Step 4: Implement the registry**

```ts
export type PrototypeSlug =
  | "project"
  | "activity"
  | "news"
  | "center"
  | "gallery"
  | "resource"
  | "directory"
  | "story"
  | "contact"
  | "join"
  | "member"
  | "profile"
  | "records";

export type PrototypeAccess = "public" | "login-action" | "protected";

export interface PrototypeDefinition {
  slug: PrototypeSlug;
  name: string;
  summary: string;
  category: "content" | "action" | "member";
  access: PrototypeAccess;
}

export const PROTOTYPES: PrototypeDefinition[] = [
  { slug: "project", name: "项目详情", summary: "智巡先锋项目档案", category: "content", access: "public" },
  { slug: "activity", name: "活动详情", summary: "活动信息与报名入口", category: "action", access: "login-action" },
  { slug: "news", name: "新闻详情", summary: "新闻、公告与活动回顾", category: "content", access: "public" },
  { slug: "center", name: "中心详情", summary: "白泽开发中心示例", category: "content", access: "public" },
  { slug: "gallery", name: "媒体相册", summary: "摄影作品与灯箱预览", category: "content", access: "public" },
  { slug: "resource", name: "资源预览", summary: "文档预览与下载权限", category: "action", access: "login-action" },
  { slug: "directory", name: "成员名册", summary: "经授权的公开成员信息", category: "content", access: "public" },
  { slug: "story", name: "成员故事", summary: "成员主动公开的成长经历", category: "content", access: "public" },
  { slug: "contact", name: "联系我们", summary: "咨询、合作与留言渠道", category: "action", access: "public" },
  { slug: "join", name: "招新申请", summary: "四步申请表单", category: "action", access: "login-action" },
  { slug: "member", name: "成员空间", summary: "个人概览与近期进度", category: "member", access: "protected" },
  { slug: "profile", name: "资料编辑", summary: "资料与公开范围设置", category: "member", access: "protected" },
  { slug: "records", name: "个人记录", summary: "申请、考核、活动与成长", category: "member", access: "protected" },
];

export function getPrototype(slug: string): PrototypeDefinition {
  const prototype = PROTOTYPES.find((item) => item.slug === slug);
  if (!prototype) throw new Error(`Unknown prototype: ${slug}`);
  return prototype;
}
```

- [ ] **Step 5: Add the root layout and index entry point**

Create a Chinese-language root layout with metadata title `白云 HSD 开发者部落｜二级页面原型` and render a placeholder index that imports `PROTOTYPES`.

- [ ] **Step 6: Run unit tests and production build**

Run: `npm test && npm run build`

Expected: all registry tests pass and Next.js produces a successful production build.

- [ ] **Step 7: Commit the scaffold**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts app/layout.tsx app/page.tsx app/globals.css lib/prototypes.ts tests/prototypes.test.ts vitest.config.ts
git commit -m "feat: scaffold desktop prototype site"
```

### Task 2: Build the Shared Desktop Shell and Prototype Directory

**Files:**
- Create: `components/prototype-directory.tsx`
- Create: `components/site-navigation.tsx`
- Create: `components/prototype-frame.tsx`
- Create: `components/access-badge.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `tests/directory.test.tsx`

**Interfaces:**
- Consumes: `PrototypeDefinition[]` from `lib/prototypes.ts`.
- Produces: `<PrototypeDirectory />`, `<SiteNavigation active={slug} />`, and `<PrototypeFrame definition={definition}>`.

- [ ] **Step 1: Write the failing directory behavior test**

Test that the directory renders 13 links, that `/prototype/project` and `/prototype/activity` are present, and that the page contains the disclaimer `设计预览，不是正式业务系统`.

- [ ] **Step 2: Run the directory test and verify failure**

Run: `npm test -- tests/directory.test.tsx`

Expected: FAIL because `PrototypeDirectory` does not exist.

- [ ] **Step 3: Implement the directory and shared navigation**

The directory groups pages into:

```ts
const groups = [
  { key: "content", label: "公开内容详情" },
  { key: "action", label: "报名、资源与联系" },
  { key: "member", label: "成员个人空间" },
];
```

Every card links to `/prototype/${definition.slug}` and displays the page name, summary, and access badge.

- [ ] **Step 4: Implement the desktop visual tokens**

Define CSS custom properties:

```css
:root {
  --brand-red: #b1202b;
  --near-black: #211f1e;
  --warm-white: #f4f0eb;
  --cool-gray: #f5f6f7;
  --placeholder: #dedad5;
  --border: #dedbd7;
  --content-width: 1280px;
}
```

Use a minimum content width compatible with `1366px`, keep navigation single-level, and do not add a mobile hamburger layout.

- [ ] **Step 5: Run tests and inspect the index locally**

Run: `npm test && npm run dev`

Expected: the index lists all 13 pages and the browser renders the desktop directory without horizontal clipping at 1366px and 1440px.

- [ ] **Step 6: Commit the shell**

```bash
git add components/prototype-directory.tsx components/site-navigation.tsx components/prototype-frame.tsx components/access-badge.tsx app/page.tsx app/globals.css tests/directory.test.tsx
git commit -m "feat: add prototype directory and desktop shell"
```

### Task 3: Implement the Nine Public Content Prototypes

**Files:**
- Create: `app/prototype/[slug]/page.tsx`
- Create: `components/public/project-page.tsx`
- Create: `components/public/activity-page.tsx`
- Create: `components/public/news-page.tsx`
- Create: `components/public/center-page.tsx`
- Create: `components/public/gallery-page.tsx`
- Create: `components/public/resource-page.tsx`
- Create: `components/public/directory-page.tsx`
- Create: `components/public/story-page.tsx`
- Create: `components/public/contact-page.tsx`
- Create: `components/media-placeholder.tsx`
- Modify: `app/globals.css`
- Create: `tests/public-pages.test.tsx`

**Interfaces:**
- Consumes: `PrototypeSlug` and `getPrototype(slug)`.
- Produces: `PUBLIC_PAGE_COMPONENTS: Partial<Record<PrototypeSlug, ComponentType>>`.

- [ ] **Step 1: Write the failing public-page coverage test**

```ts
const publicSlugs = [
  "project",
  "activity",
  "news",
  "center",
  "gallery",
  "resource",
  "directory",
  "story",
  "contact",
];

it.each(publicSlugs)("renders the %s prototype", (slug) => {
  expect(PUBLIC_PAGE_COMPONENTS[slug]).toBeDefined();
});
```

- [ ] **Step 2: Run the public-page test and verify failure**

Run: `npm test -- tests/public-pages.test.tsx`

Expected: FAIL because the component map and page components do not exist.

- [ ] **Step 3: Implement project and activity pages first**

Preserve the previously approved complete structures:

- Project: problem, solution, process, demo gallery, results, project metadata, team, related projects.
- Activity: date, location, capacity, registration status, introduction, agenda, participation notice, FAQ, sticky registration action, related activities.

- [ ] **Step 4: Implement news, center, and media pages**

- News: heading metadata, cover placeholder, article body, table of contents, related news.
- Center: mission, five technical directions, key data, current projects, other-center navigation.
- Gallery: album heading, category filters, asymmetric image grid, keyboard-compatible lightbox.

- [ ] **Step 5: Implement resource, directory, story, and contact pages**

- Resource: document metadata, simulated PDF preview, public/internal permission switch, download action.
- Directory: center filters, search input, public-only member cards, explicit privacy note.
- Story: voluntary profile label, public growth timeline, representative work, no private fields.
- Contact: four inquiry types, location placeholder, local-only message form with success state.

- [ ] **Step 6: Run tests and production build**

Run: `npm test && npm run build`

Expected: all nine public slugs resolve, tests pass, and the build succeeds.

- [ ] **Step 7: Commit the public pages**

```bash
git add app/prototype/[slug]/page.tsx components/public components/media-placeholder.tsx app/globals.css tests/public-pages.test.tsx
git commit -m "feat: add public secondary page prototypes"
```

### Task 4: Implement Member Tasks and Interaction States

**Files:**
- Create: `components/member/member-shell.tsx`
- Create: `components/member/member-overview.tsx`
- Create: `components/member/profile-page.tsx`
- Create: `components/member/records-page.tsx`
- Create: `components/actions/join-page.tsx`
- Create: `components/actions/login-dialog.tsx`
- Create: `components/actions/status-simulator.tsx`
- Modify: `app/prototype/[slug]/page.tsx`
- Modify: `app/globals.css`
- Create: `tests/member-pages.test.tsx`

**Interfaces:**
- Produces: `<LoginDialog originLabel onCancel onContinue />`, `<StatusSimulator states initialState />`, and member page components for `join`, `member`, `profile`, and `records`.
- Consumes: the shared prototype frame and page registry.

- [ ] **Step 1: Write failing tests for access and state behavior**

Test these exact behaviors:

1. The activity registration button opens a login dialog.
2. The dialog contains the originating activity title.
3. Cancelling closes the dialog without navigating.
4. Continuing changes the prototype to the registration form state.
5. The join form moves through four named steps.
6. Profile privacy toggles do not reveal private contact fields publicly.
7. Record tabs include application, assessment, activities, and growth.

- [ ] **Step 2: Run the interaction tests and verify failure**

Run: `npm test -- tests/member-pages.test.tsx`

Expected: FAIL because the member and action components do not exist.

- [ ] **Step 3: Implement the login and status simulators**

`LoginDialog` accepts the origin label and returns to the same in-memory page state after the simulated login action. `StatusSimulator` supports:

```ts
type DemoStatus =
  | "open"
  | "submitted"
  | "pending"
  | "approved"
  | "closed"
  | "full"
  | "empty"
  | "error"
  | "forbidden";
```

- [ ] **Step 4: Implement join and member overview**

- Join: four-step form, draft state, submit confirmation, application status.
- Member overview: metrics, recent progress, next actions, growth path, upcoming schedule.

- [ ] **Step 5: Implement profile and personal records**

- Profile: private fields, public profile fields, privacy toggles, save-success feedback.
- Records: tabs for application, assessment, activities, and growth plus empty, error, and forbidden states.

- [ ] **Step 6: Run all unit tests and build**

Run: `npm test && npm run build`

Expected: access rules and state transitions pass, and the production build succeeds.

- [ ] **Step 7: Commit member interactions**

```bash
git add components/member components/actions app/prototype/[slug]/page.tsx app/globals.css tests/member-pages.test.tsx
git commit -m "feat: add member and interaction prototypes"
```

### Task 5: Verify, Document, Push, and Deploy the Prototype

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/prototype.spec.ts`
- Modify: `README.md`
- Modify: `init/AGENTS.md`
- Create or update through Sites: `.openai/hosting.json`

**Interfaces:**
- Consumes: the complete 13-page site.
- Produces: a pushed Git commit, a saved Sites version, and a production deployment URL.

- [ ] **Step 1: Add browser coverage**

The Playwright test must:

```ts
test("all approved prototypes are reachable", async ({ page }) => {
  await page.goto("/");
  const links = page.locator("[data-prototype-link]");
  await expect(links).toHaveCount(13);
});

test("project and activity are included", async ({ page }) => {
  await page.goto("/prototype/project");
  await expect(page.getByRole("heading", { name: "智巡先锋" })).toBeVisible();
  await page.goto("/prototype/activity");
  await expect(page.getByRole("heading", { name: /HarmonyOS/ })).toBeVisible();
});

test("personal action opens login without blocking public content", async ({ page }) => {
  await page.goto("/prototype/activity");
  await expect(page.getByText("活动介绍")).toBeVisible();
  await page.getByRole("button", { name: "提交活动报名" }).click();
  await expect(page.getByRole("dialog")).toContainText("登录后继续");
});
```

- [ ] **Step 2: Run the full validation suite**

Run:

```bash
npm test
npm run build
npm run test:e2e
```

Expected: all tests pass, all 13 pages render, and the production build completes.

- [ ] **Step 3: Update developer documentation**

Add the public prototype purpose, local commands, page inventory, and explicit desktop-only scope to `README.md`. Add the deployment and secondary-page change to the design change log in `init/AGENTS.md`.

- [ ] **Step 4: Check the hosting configuration before site creation**

Run:

```powershell
if (Test-Path -LiteralPath '.openai/hosting.json') {
  Get-Content -LiteralPath '.openai/hosting.json' -Raw -Encoding UTF8
} else {
  Write-Output 'NO_HOSTING_CONFIG'
}
```

If no configuration exists, call the Sites `create_site` tool exactly once and persist the returned configuration. If configuration exists, use its opaque `project_id` unchanged.

- [ ] **Step 5: Commit the verified source**

Stage only the implementation, tests, README, AGENTS, and hosting configuration. Do not stage the user's deleted homepage PNG.

```bash
git add package.json package-lock.json tsconfig.json next.config.ts app components lib tests playwright.config.ts vitest.config.ts README.md init/AGENTS.md .openai/hosting.json
git commit -m "feat: publish interactive desktop prototype"
```

- [ ] **Step 6: Push the exact source state**

Run:

```bash
git push origin main
git rev-parse HEAD
```

Expected: `main` is synchronized with `origin/main`; retain the exact printed commit SHA.

Use the Sites source repository credential only per command and never persist its token. Push the same commit identified above to the configured Sites source branch.

- [ ] **Step 7: Save and deploy the Sites version**

Use the exact `project_id` from `.openai/hosting.json` and the exact pushed commit SHA:

1. Save a site version.
2. Retain the opaque returned `version_id`.
3. Deploy only that saved version.
4. If deployment is not terminal, inspect status until it is deployed or fails.

- [ ] **Step 8: Verify the production URL**

Open the production URL and rerun these checks:

- Prototype index displays 13 page links.
- Project and activity pages open.
- Login dialog opens from the activity registration action.
- No real personal information appears.
- The preview disclaimer is visible.
- Browser console contains no uncaught errors.

- [ ] **Step 9: Commit any documentation-only deployment metadata**

If deployment adds a public URL to README or updates tracked hosting metadata, stage those exact files, commit them, and push `main` again before saving a new Sites version.
