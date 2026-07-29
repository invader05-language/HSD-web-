# 资源、画廊、考核结果与成员荣誉实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐资源详情、媒体专题详情、考核结果登录入口和成员荣誉详情，同时保持 1440px 桌面 Web 的既有视觉基线。

**Architecture:** 资源、媒体专题和公开人员继续使用独立 TypeScript 数据模块与解析函数，页面只消费公开、已脱敏的数据。Pinia 仅保留演示登录状态；考核结果由现有全局中间件保护。资源和画廊先实现完整前端状态，不接后端、数据库、对象存储或真实文件。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、Pinia、Vitest、Playwright、现有全局 CSS

## Global Constraints

- 产品名称固定为“白云 HSD 开发者部落”。
- 主要验收视口为 `1440 × 1000` 桌面 Web。
- 不使用用户提供的招新海报、参考截图或未授权照片作为网站素材。
- 当前不开发后端、数据库、CMS、对象存储或真实下载接口。
- 资源列表统一先进入详情页，不从列表直接下载。
- 画廊照片直接铺满图片区，暗层承载标题与说明，不出现内部灰色素材框。
- 顶部导航新增“考核结果”；未登录先登录，登录成功后返回 `/assessment-results`。
- 考核结果页不得虚构分数、评级、排名、评语、周期或通过状态。
- 成员名录显示一至三个重点荣誉；完整公开荣誉在 `/people/:id` 展示。
- Pinia 不保存资源、画廊、人员或荣誉内容。
- 每次页面变更同步更新 PRD、README、`init/AGENTS.md`、视觉截图与验收记录。

---

## File Map

### 新建

- `app/data/resources.ts`：资源类型、公开 Mock 条目、slug 解析和动作文案。
- `app/data/gallery.ts`：媒体专题、公开媒体条目、slug 解析和分批读取。
- `app/components/GalleryMediaFrame.vue`：全幅媒体占位面、暗层、标题和灯箱触发按钮。
- `app/components/GalleryLightbox.vue`：可访问灯箱、键盘切换、焦点恢复和滚动锁定。
- `app/pages/resources/[slug].vue`：资源详情。
- `app/pages/gallery/[slug].vue`：媒体专题详情。
- `app/pages/assessment-results.vue`：受保护的考核结果占位页。
- `app/pages/people/[id].vue`：公开成员详情与完整荣誉。
- `tests/unit/content-details.test.ts`：资源、媒体、荣誉数据契约。
- `tests/e2e/content-details.spec.ts`：资源、媒体和考核结果流程。
- `tests/e2e/member-honors.spec.ts`：成员名录、详情、荣誉与 404。

### 修改

- `app/data/site.ts`：新增“考核结果”导航。
- `app/data/people.ts`：公开荣誉类型、公开人员解析和重点荣誉限制。
- `app/pages/resources.vue`：改用资源数据模块与详情路由。
- `app/pages/gallery.vue`：改为可点击专题卡片。
- `app/pages/people/core.vue`：整卡进入成员详情并显示一至三个重点荣誉。
- `app/pages/people/members.vue`：整卡进入成员详情并显示一至三个重点荣誉。
- `app/middleware/auth.global.ts`：保护 `/assessment-results`。
- `app/assets/css/main.css`：新增详情页、灯箱、荣誉与导航密度样式。
- `tests/unit/site-config.test.ts`：更新导航顺序。
- `tests/unit/public-directory.test.ts`：更新公开人员与荣誉契约。
- `tests/e2e/centers.spec.ts`：从 About 实际点击中心卡进入详情。
- `tests/e2e/home.spec.ts`：新增详情路由并保持无横向溢出。
- `HSD需求文档.md`、`README.md`、`init/AGENTS.md`：同步实现状态和验收边界。

---

### Task 1: 考核结果导航与登录续接

**Files:**
- Modify: `app/data/site.ts`
- Modify: `app/middleware/auth.global.ts`
- Create: `app/pages/assessment-results.vue`
- Modify: `app/assets/css/main.css`
- Modify: `tests/unit/site-config.test.ts`
- Create: `tests/e2e/content-details.spec.ts`

**Interfaces:**
- Consumes: `buildLoginTarget(target: string): string`、`useSessionStore().isAuthenticated`
- Produces: 受保护路由 `/assessment-results` 和导航项 `{ label: "考核结果", to: "/assessment-results" }`

- [ ] **Step 1: 写导航与登录保护的失败测试**

在 `tests/unit/site-config.test.ts` 将期望导航顺序改为：

```ts
expect(SITE_CONFIG.navigation.map((item) => item.label)).toEqual([
  "首页",
  "部落介绍",
  "四大中心",
  "项目成果",
  "活动中心",
  "媒体画廊",
  "资源中心",
  "考核结果",
  "加入我们"
]);
```

在 `tests/e2e/content-details.spec.ts` 写入：

```ts
import { expect, test } from "@playwright/test";

test("assessment results require login and continue back after demo sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "考核结果" }).click();

  await expect(page).toHaveURL(/\/login\?redirect=%2Fassessment-results$/);
  await page.getByLabel("成员账号").fill("demo-member");
  await page.getByLabel("密码", { exact: true }).fill("demo-password");
  await page.getByRole("button", { name: "登录并继续" }).click();

  await expect(page).toHaveURL(/\/assessment-results$/);
  await expect(page.getByRole("heading", { level: 1, name: "考核结果" })).toBeVisible();
  await expect(page.getByText("考核数据暂未接入", { exact: true })).toBeVisible();
  await expect(page.getByText(/分数|评级|排名|评语|通过状态/)).toHaveCount(0);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
pnpm vitest run tests/unit/site-config.test.ts
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/content-details.spec.ts --reporter=line
```

Expected:

- 单测因缺少“考核结果”导航失败。
- E2E 因找不到导航或页面失败。

- [ ] **Step 3: 最小实现导航、保护规则和占位页**

`app/data/site.ts` 在“资源中心”和“加入我们”之间加入：

```ts
{ label: "考核结果", to: "/assessment-results" },
```

`app/middleware/auth.global.ts` 将保护条件改为：

```ts
const protectedRoute =
  to.path.startsWith("/member")
  || to.path === "/join/apply"
  || to.path === "/assessment-results";
```

`app/pages/assessment-results.vue` 使用：

```vue
<script setup lang="ts">
useHead({ title: "考核结果｜白云 HSD 开发者部落" });
</script>

<template>
  <main class="assessment-page">
    <section class="assessment-page__header">
      <div class="shell">
        <p class="eyebrow">Assessment Results</p>
        <h1>考核结果</h1>
        <p>该页面用于承载成员个人考核信息。</p>
      </div>
    </section>
    <section class="section">
      <div class="shell assessment-empty">
        <p class="eyebrow">Data Connection</p>
        <h2>考核数据暂未接入</h2>
        <p>后端和数据库字段确认后，将根据正式数据契约设计展示结构。</p>
        <div class="button-row">
          <NuxtLink class="button button--dark" to="/member">返回成员空间</NuxtLink>
          <NuxtLink class="button button--ghost" to="/">返回首页</NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>
```

在 `app/assets/css/main.css` 为 `assessment-page__header` 和 `assessment-empty` 添加与登录任务页一致的近黑页头、暖白内容区和最大阅读宽度；把桌面 `.site-nav` 的 `gap` 上限收紧到能容纳 9 个导航项，保持链接 `min-height: 44px`。

- [ ] **Step 4: 运行聚焦测试并确认 GREEN**

Run:

```powershell
pnpm vitest run tests/unit/site-config.test.ts
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/content-details.spec.ts --reporter=line
```

Expected: 两组测试通过。

- [ ] **Step 5: 提交**

```powershell
git add app/data/site.ts app/middleware/auth.global.ts app/pages/assessment-results.vue app/assets/css/main.css tests/unit/site-config.test.ts tests/e2e/content-details.spec.ts
git commit -m "feat: add protected assessment results entry"
```

---

### Task 2: 资源类型与详情页

**Files:**
- Create: `app/data/resources.ts`
- Modify: `app/pages/resources.vue`
- Create: `app/pages/resources/[slug].vue`
- Modify: `app/assets/css/main.css`
- Create/Modify: `tests/unit/content-details.test.ts`
- Modify: `tests/e2e/content-details.spec.ts`

**Interfaces:**
- Produces:
  - `ResourceKind = "article" | "pdf" | "docx" | "archive" | "external"`
  - `ResourceAccess = "public" | "member"`
  - `ResourceStatus = "ready" | "not-connected" | "offline"`
  - `findResource(slug: string): PublicResource | undefined`
  - `resourcePrimaryAction(resource: PublicResource): string`

- [ ] **Step 1: 写资源数据与路由的失败测试**

在 `tests/unit/content-details.test.ts` 写入：

```ts
import { describe, expect, it } from "vitest";
import {
  PUBLIC_RESOURCES,
  findResource,
  resourcePrimaryAction
} from "../../app/data/resources";

describe("public resource details", () => {
  it("publishes one typed detail route for every resource", () => {
    expect(PUBLIC_RESOURCES.map((item) => item.kind)).toEqual([
      "article",
      "article",
      "docx",
      "pdf",
      "archive",
      "external"
    ]);
    expect(PUBLIC_RESOURCES.every((item) => item.to === `/resources/${item.slug}`)).toBe(true);
  });

  it("keeps file actions honest while real files are not connected", () => {
    expect(findResource("project-requirement-template")?.status).toBe("not-connected");
    expect(resourcePrimaryAction(findResource("project-requirement-template")!)).toBe("文件暂未接入");
    expect(findResource("missing")).toBeUndefined();
  });
});
```

在 `tests/e2e/content-details.spec.ts` 增加：

```ts
test("resource entries open details before any file action", async ({ page }) => {
  await page.goto("/resources");
  await page.getByRole("link", { name: /校园科创项目需求说明模板/ }).click();

  await expect(page).toHaveURL(/\/resources\/project-requirement-template$/);
  await expect(page.getByRole("heading", { level: 1, name: "校园科创项目需求说明模板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "文件暂未接入" })).toBeDisabled();
  await expect(page.getByText("DOCX", { exact: true })).toBeVisible();
});

test("unknown resource returns 404", async ({ page }) => {
  const response = await page.goto("/resources/missing");
  expect(response?.status()).toBe(404);
});

test("external resources are explicitly marked and open in a new tab", async ({ page }) => {
  await page.goto("/resources/harmonyos-official-docs");
  const link = page.getByRole("link", { name: "前往外部网站" });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
pnpm vitest run tests/unit/content-details.test.ts
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/content-details.spec.ts --grep "resource|unknown resource" --reporter=line
```

Expected: 模块不存在、列表没有详情链接或详情路由不存在。

- [ ] **Step 3: 实现资源数据模块**

`app/data/resources.ts` 定义：

```ts
export type ResourceKind = "article" | "pdf" | "docx" | "archive" | "external";
export type ResourceAccess = "public" | "member";
export type ResourceStatus = "ready" | "not-connected" | "offline";

export interface PublicResource {
  slug: string;
  title: string;
  category: "学习路线" | "项目模板" | "活动资料" | "内部课程";
  kind: ResourceKind;
  format: "网页" | "PDF" | "DOCX" | "ZIP";
  access: ResourceAccess;
  status: ResourceStatus;
  summary: string;
  contents: readonly string[];
  version: string;
  updatedAt: string;
  fileSize?: string;
  to: string;
}

export function findResource(slug: string): PublicResource | undefined {
  return PUBLIC_RESOURCES.find((item) => item.slug === slug);
}

export function resourcePrimaryAction(resource: PublicResource): string {
  if (resource.status === "not-connected") return "文件暂未接入";
  if (resource.status === "offline") return "该版本已下线";
  if (resource.kind === "article") return "阅读正文";
  if (resource.kind === "external") return "前往外部网站";
  return resource.access === "member" ? "登录后下载" : `下载 ${resource.format}`;
}
```

`PUBLIC_RESOURCES` 使用五条现有资源和一条外部参考，slug 固定为：

```ts
[
  "harmonyos-getting-started",
  "aigc-practice-roadmap",
  "project-requirement-template",
  "event-checklist",
  "member-training-package",
  "harmonyos-official-docs"
]
```

前五条沿用现有资源；第六条为“外部参考 · HarmonyOS 官方开发文档”，用于呈现外部链接的完整交互。所有文件类资源当前 `status: "not-connected"`，站内网页与外部链接资源 `status: "ready"`。

- [ ] **Step 4: 实现资源列表与详情页**

`app/pages/resources.vue` 删除本地 `resources` 数组，导入 `PUBLIC_RESOURCES`；每个条目使用：

```vue
<NuxtLink :to="item.to">
  <span>0{{ index + 1 }}</span>
  <div>
    <small>{{ item.category }} · {{ item.format }}</small>
    <h2>{{ item.title }}</h2>
  </div>
  <strong>{{ resourcePrimaryAction(item) }} →</strong>
</NuxtLink>
```

`app/pages/resources/[slug].vue`：

- 使用 `findResource(String(route.params.slug))`。
- 找不到时 `throw createError({ statusCode: 404, statusMessage: "资源不存在" })`。
- 渲染面包屑、标题、简介、文件信息、禁用主按钮、内容清单、版本记录和相关资源。
- `article` 类型在详情正文中呈现学习步骤。
- `not-connected` 和 `offline` 使用禁用 `<button>`，不渲染空 `href`。
- 内部资源可以显示“登录查看下载权限”链接，目标为 `buildLoginTarget(route.fullPath)`；登录后仍保留“文件暂未接入”状态。

- [ ] **Step 5: 添加资源详情样式**

在 `app/assets/css/main.css` 增加：

- `.resource-detail-hero`
- `.resource-file-panel`
- `.resource-detail-body`
- `.resource-version-list`
- `.resource-related`

桌面使用 `1fr 360px` 栅格；信息面板只使用细边框和暖白背景；按钮禁用状态同时使用文字、透明度和 `cursor: not-allowed`。

- [ ] **Step 6: 运行聚焦测试并确认 GREEN**

Run:

```powershell
pnpm vitest run tests/unit/content-details.test.ts
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/content-details.spec.ts --grep "resource|unknown resource" --reporter=line
```

Expected: 资源数据测试和两条 E2E 通过。

- [ ] **Step 7: 提交**

```powershell
git add app/data/resources.ts app/pages/resources.vue 'app/pages/resources/[slug].vue' app/assets/css/main.css tests/unit/content-details.test.ts tests/e2e/content-details.spec.ts
git commit -m "feat: add typed resource detail pages"
```

---

### Task 3: 媒体专题详情与灯箱

**Files:**
- Create: `app/data/gallery.ts`
- Create: `app/components/GalleryMediaFrame.vue`
- Create: `app/components/GalleryLightbox.vue`
- Modify: `app/pages/gallery.vue`
- Create: `app/pages/gallery/[slug].vue`
- Modify: `app/assets/css/main.css`
- Modify: `tests/unit/content-details.test.ts`
- Modify: `tests/e2e/content-details.spec.ts`

**Interfaces:**
- Produces:
  - `GalleryAlbum`
  - `GalleryAsset`
  - `findGalleryAlbum(slug: string): GalleryAlbum | undefined`
  - `getGalleryBatch(album: GalleryAlbum, visibleCount: number): readonly GalleryAsset[]`
  - `GalleryLightbox` props `{ items, activeIndex }` 与 emits `close`、`update:activeIndex`

- [ ] **Step 1: 写媒体数据、详情和灯箱的失败测试**

在 `tests/unit/content-details.test.ts` 增加：

```ts
import {
  GALLERY_ALBUMS,
  findGalleryAlbum,
  getGalleryBatch
} from "../../app/data/gallery";

it("publishes gallery albums with twelve-item incremental batches", () => {
  const album = findGalleryAlbum("annual-activity-record");
  expect(GALLERY_ALBUMS).toHaveLength(6);
  expect(album?.assets).toHaveLength(18);
  expect(getGalleryBatch(album!, 12)).toHaveLength(12);
  expect(findGalleryAlbum("missing")).toBeUndefined();
});
```

在 `tests/e2e/content-details.spec.ts` 增加：

```ts
test("gallery album uses full media frames and an accessible lightbox", async ({ page }) => {
  await page.goto("/gallery");
  await page.getByRole("link", { name: /年度活动影像记录/ }).click();

  await expect(page).toHaveURL(/\/gallery\/annual-activity-record$/);
  const media = page.getByTestId("gallery-media");
  await expect(media).toHaveCount(12);
  await expect(media.first().locator(".media-placeholder")).toHaveCount(0);
  await expect(media.first().getByText("开场前的最后一次确认")).toBeVisible();

  await media.first().click();
  const dialog = page.getByRole("dialog", { name: "照片浏览" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByText("分享与讨论")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(media.first()).toBeFocused();
});

test("gallery loads twelve more assets without replacing the first batch", async ({ page }) => {
  await page.goto("/gallery/annual-activity-record");
  await expect(page.getByTestId("gallery-media")).toHaveCount(12);
  await page.getByRole("button", { name: "继续加载 6 张" }).click();
  await expect(page.getByTestId("gallery-media")).toHaveCount(18);
});

test("unknown gallery album returns 404", async ({ page }) => {
  const response = await page.goto("/gallery/missing");
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
pnpm vitest run tests/unit/content-details.test.ts
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/content-details.spec.ts --grep "gallery" --reporter=line
```

Expected: 数据模块、专题路由和灯箱均不存在。

- [ ] **Step 3: 实现媒体专题数据**

`app/data/gallery.ts` 定义：

```ts
export interface GalleryAsset {
  id: string;
  title: string;
  caption: string;
  alt: string;
  aspect: "landscape" | "portrait" | "wide";
  imageUrl?: string;
}

export interface GalleryAlbum {
  slug: string;
  title: string;
  category: "活动摄影" | "海报设计" | "短视频" | "人物专访";
  year: string;
  summary: string;
  team: string;
  assets: readonly GalleryAsset[];
  to: string;
}

export function findGalleryAlbum(slug: string): GalleryAlbum | undefined {
  return GALLERY_ALBUMS.find((album) => album.slug === slug);
}

export function getGalleryBatch(
  album: GalleryAlbum,
  visibleCount: number
): readonly GalleryAsset[] {
  return album.assets.slice(0, Math.max(0, visibleCount));
}
```

创建六个现有专题；`annual-activity-record` 包含 18 条明确命名的品牌占位媒体，其他专题至少包含 3 条。所有 `imageUrl` 暂时省略，避免引入未授权图片。

- [ ] **Step 4: 实现全幅媒体帧**

`GalleryMediaFrame.vue`：

```vue
<script setup lang="ts">
import type { GalleryAsset } from "~/data/gallery";

defineProps<{ item: GalleryAsset; featured?: boolean }>();
defineEmits<{ open: [] }>();
</script>

<template>
  <button
    type="button"
    class="gallery-media-frame"
    :class="[`gallery-media-frame--${item.aspect}`, { 'is-featured': featured }]"
    data-testid="gallery-media"
    :aria-label="`查看照片：${item.title}`"
    @click="$emit('open')"
  >
    <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.alt" loading="lazy">
    <span v-else class="gallery-media-frame__fallback" aria-hidden="true">&lt; HSD &gt;</span>
    <span class="gallery-media-frame__overlay">
      <strong>{{ item.title }}</strong>
      <small>{{ item.caption }}</small>
    </span>
  </button>
</template>
```

CSS 要求：

- 背景或 `<img>` 铺满整个按钮。
- `object-fit: cover`。
- `::after` 使用底部深色渐变。
- 标题和说明位于渐变上方。
- 不嵌套 `.media-placeholder`。
- `is-featured` 占据主图尺寸。

- [ ] **Step 5: 实现灯箱**

`GalleryLightbox.vue`：

- 使用 `<Teleport to="body">`。
- 根节点 `role="dialog" aria-modal="true" aria-label="照片浏览"`。
- 打开时记录触发元素、聚焦关闭按钮并给 `document.body` 增加 `is-scroll-locked`。
- `ArrowLeft`、`ArrowRight` 更新索引，首尾禁用。
- `Escape` emit `close`。
- 关闭和卸载时恢复 body 状态，并把焦点还给触发元素。
- 没有 `imageUrl` 时仍显示全幅品牌降级面、标题和说明。

- [ ] **Step 6: 实现专题列表和详情**

`app/pages/gallery.vue`：

- 删除本地 `works`。
- 导入 `GALLERY_ALBUMS`。
- 每个专题使用 `NuxtLink :to="album.to"`，保留非对称精选布局。

`app/pages/gallery/[slug].vue`：

- 找不到专题时返回 404。
- 初始 `visibleCount = 12`。
- 主图、右侧两张次图和后续非对称网格全部使用 `GalleryMediaFrame`。
- 加载按钮文本使用：

```ts
const remainingCount = computed(() => album.value.assets.length - visibleCount.value);
const nextBatchCount = computed(() => Math.min(12, remainingCount.value));
```

- 点击媒体设置 `activeIndex` 并打开 `GalleryLightbox`。
- 空相册显示“该专题暂无公开作品”和返回画廊入口。

- [ ] **Step 7: 运行聚焦测试并确认 GREEN**

Run:

```powershell
pnpm vitest run tests/unit/content-details.test.ts
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/content-details.spec.ts --grep "gallery" --reporter=line
```

Expected: 媒体数据、详情、灯箱、分批加载和 404 测试通过。

- [ ] **Step 8: 提交**

```powershell
git add app/data/gallery.ts app/components/GalleryMediaFrame.vue app/components/GalleryLightbox.vue app/pages/gallery.vue 'app/pages/gallery/[slug].vue' app/assets/css/main.css tests/unit/content-details.test.ts tests/e2e/content-details.spec.ts
git commit -m "feat: add gallery album details and lightbox"
```

---

### Task 4: 成员详情与一至三个重点荣誉

**Files:**
- Modify: `app/data/people.ts`
- Modify: `app/pages/people/core.vue`
- Modify: `app/pages/people/members.vue`
- Create: `app/pages/people/[id].vue`
- Modify: `app/assets/css/main.css`
- Modify: `tests/unit/public-directory.test.ts`
- Create: `tests/e2e/member-honors.spec.ts`

**Interfaces:**
- Produces:
  - `PublicHonor`
  - `findPublicPerson(id: string): PublicPerson | undefined`
  - `getFeaturedHonors(person: PublicPerson): readonly PublicHonor[]`
- Public invariant: 匿名数据只包含已审核、已公开的荣誉；每人最多三条 `featured: true`

- [ ] **Step 1: 写公开荣誉数据的失败测试**

在 `tests/unit/public-directory.test.ts` 增加：

```ts
import {
  findPublicPerson,
  getFeaturedHonors
} from "../../app/data/people";

it("limits public directory cards to three featured honors", () => {
  const person = findPublicPerson("lin-development");
  expect(person).toBeDefined();
  expect(getFeaturedHonors(person!)).toHaveLength(3);
  expect(getFeaturedHonors(person!).every((honor) => honor.featured)).toBe(true);
});

it("keeps every published honor approved and public", () => {
  for (const person of [...CORE_PEOPLE, ...PUBLIC_MEMBERS]) {
    expect(person.honors.every((honor) => honor.approved && honor.visible)).toBe(true);
    expect(getFeaturedHonors(person).length).toBeLessThanOrEqual(3);
  }
  expect(findPublicPerson("missing")).toBeUndefined();
});
```

在 `tests/e2e/member-honors.spec.ts` 写入：

```ts
import { expect, test } from "@playwright/test";

test("member directories show up to three featured honors and open details", async ({ page }) => {
  await page.goto("/people/core");
  const card = page.getByRole("link", { name: /林同学.*查看成员详情/ });
  await expect(card.getByTestId("featured-honor")).toHaveCount(3);
  await card.click();

  await expect(page).toHaveURL(/\/people\/lin-development$/);
  await expect(page.getByRole("heading", { level: 1, name: "林同学" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "个人荣誉" })).toBeVisible();
  await expect(page.getByTestId("honor-record")).toHaveCount(4);
});

test("members without public honors render no empty honor label", async ({ page }) => {
  await page.goto("/people/members");
  const card = page.getByRole("link", { name: /孙同学.*查看成员详情/ });
  await expect(card.getByTestId("featured-honor")).toHaveCount(0);
  await expect(card).not.toContainText("暂无荣誉");
});

test("unknown public person returns 404", async ({ page }) => {
  const response = await page.goto("/people/missing");
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
pnpm vitest run tests/unit/public-directory.test.ts
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/member-honors.spec.ts --reporter=line
```

Expected: 荣誉类型、成员解析、详情路由和可点击卡片均不存在。

- [ ] **Step 3: 扩展公开人员契约**

在 `app/data/people.ts` 增加：

```ts
export interface PublicHonor {
  id: string;
  title: string;
  awardedAt: string;
  description: string;
  featured: boolean;
  visible: true;
  approved: true;
  order: number;
}
```

`PublicPersonBase` 增加：

```ts
honors: readonly PublicHonor[];
```

新增解析函数：

```ts
export function findPublicPerson(id: string): PublicPerson | undefined {
  return ALL_PUBLIC_PEOPLE.find((person) => person.id === id);
}

export function getFeaturedHonors(person: PublicPerson): readonly PublicHonor[] {
  return person.honors
    .filter((honor) => honor.featured)
    .sort((a, b) => a.order - b.order)
    .slice(0, 3);
}
```

Mock 规则：

- `lin-development`：四条公开荣誉，其中三条 `featured: true`。
- `chen-media`：两条重点荣誉。
- `guo-development`：一条重点荣誉。
- `sun-talent`：空数组。
- 其他成员使用零至两条公开荣誉。
- 不在 `PublicHonor` 中加入证明材料 URL、内部备注或审核失败记录。

- [ ] **Step 4: 把名录卡改为整卡链接**

`core.vue` 与 `members.vue`：

- `<article>` 改为 `<NuxtLink :to="\`/people/${person.id}\`">`。
- 在方向下方渲染：

```vue
<ul v-if="getFeaturedHonors(person).length" class="featured-honors">
  <li
    v-for="honor in getFeaturedHonors(person)"
    :key="honor.id"
    data-testid="featured-honor"
  >
    重点荣誉 · {{ honor.title }}
  </li>
</ul>
```

- 卡片底部加入 `<span class="directory-card__action">查看成员详情 →</span>`。
- 无荣誉时不渲染 `<ul>`。

CSS：

- 栅格保持核心 `3 × 2`、成员 `2 × 3`。
- 卡片使用 `height: 100%` 和内部 flex 布局保持同一行等高。
- `.featured-honors` 最多三条，使用品牌红小字和细分隔线。
- 动作提示在非 hover 状态可见。

- [ ] **Step 5: 实现公开成员详情**

`app/pages/people/[id].vue`：

- `findPublicPerson(String(route.params.id))`。
- 找不到时返回 404。
- 展示头像、姓名、中心、方向、简介。
- “个人荣誉”只在 `person.honors.length > 0` 时渲染；无荣誉时整个区块省略。
- 荣誉按 `order` 排列，每条显示标题、时间和说明。
- 不渲染联系方式、考核、成长、申请或证明材料。
- 提供返回全体成员和所属中心的链接。

- [ ] **Step 6: 运行聚焦测试并确认 GREEN**

Run:

```powershell
pnpm vitest run tests/unit/public-directory.test.ts
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/member-honors.spec.ts --reporter=line
```

Expected: 荣誉契约、名录、详情和 404 全部通过。

- [ ] **Step 7: 提交**

```powershell
git add app/data/people.ts app/pages/people/core.vue app/pages/people/members.vue 'app/pages/people/[id].vue' app/assets/css/main.css tests/unit/public-directory.test.ts tests/e2e/member-honors.spec.ts
git commit -m "feat: add public member honors and details"
```

---

### Task 5: About 中心点击回归、全站文档与最终验收

**Files:**
- Modify: `tests/e2e/centers.spec.ts`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `HSD需求文档.md`
- Modify: `README.md`
- Modify: `init/AGENTS.md`
- Create/Update: `.gstack/design-reports/hsd-2026-07-29/screenshots/`

**Interfaces:**
- Consumes: Tasks 1–4 的全部公开路由和数据契约
- Produces: 最终可回归前端基线和文档记录

- [ ] **Step 1: 增加 About 实际点击和全路由无溢出测试**

在 `tests/e2e/centers.spec.ts` 增加：

```ts
test("about collaboration cards navigate from the card body", async ({ page }) => {
  await page.goto("/about");
  const card = page.getByRole("link", { name: /新媒体中心.*查看中心详情/ });
  await card.click({ position: { x: 24, y: 24 } });
  await expect(page).toHaveURL(/\/centers\/new-media$/);
});
```

在 `tests/e2e/home.spec.ts` 的无横向溢出路由数组中加入：

```ts
"/assessment-results",
"/resources/project-requirement-template",
"/gallery/annual-activity-record",
"/people/lin-development"
```

其中 `/assessment-results` 测试前调用演示登录，避免被登录页替代。

- [ ] **Step 2: 运行新增回归测试**

Run:

```powershell
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/centers.spec.ts tests/e2e/home.spec.ts --reporter=line
```

Expected: About 整卡点击和新增路由 1440px 无溢出。

- [ ] **Step 3: 同步文档**

更新内容：

- `HSD需求文档.md`：把资源详情、画廊专题、考核结果、成员详情和荣誉状态改为“已实现”，记录路由、权限和变更日期。
- `README.md`：新增四类路由、当前文件未接入说明、灯箱键盘操作和 1–3 个重点荣誉规则。
- `init/AGENTS.md`：固化资源详情优先、全幅媒体暗层、考核字段禁用虚构、公开荣誉最多三条和成员详情隐私规则。

- [ ] **Step 4: 运行完整验证**

Run:

```powershell
pnpm test
pnpm build
$env:NUXT_IGNORE_LOCK='1'; pnpm test:e2e
git diff --check
```

Expected:

- Vitest 全部通过。
- Nuxt production build exit 0。
- Playwright 全部通过。
- `git diff --check` 无输出。

- [ ] **Step 5: 生成视觉证据**

使用系统 Chrome 和 Playwright 在 `1440 × 1000` 生成：

- `resources-detail-1440.png`
- `gallery-detail-1440.png`
- `gallery-lightbox-1440.png`
- `assessment-results-1440.png`
- `people-directory-honors-1440.png`
- `people-detail-1440.png`
- `about-centers-1440.png`

检查：

- 画廊照片占满版面，无内部灰色框。
- 暗层文字对比清晰。
- 导航新增考核结果后不拥挤、不换行。
- 1–3 个重点荣誉不破坏卡片等高。
- 所有页面无横向溢出。

- [ ] **Step 6: 最终提交**

```powershell
git add HSD需求文档.md README.md init/AGENTS.md tests/e2e/centers.spec.ts tests/e2e/home.spec.ts
git commit -m "docs: record content details and member honors"
```

- [ ] **Step 7: 最终复审**

使用 `superpowers:requesting-code-review` 和 `superpowers:verification-before-completion`：

- 对照两份设计规格逐项检查。
- Critical、Important、Minor finding 全部处理或明确记录。
- 再次确认未触碰后端、数据库和真实文件存储。
