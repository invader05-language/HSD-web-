# 首页沉浸式双层海报舞台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页方案 B 的竖版海报从普通居中图片升级为带背景氛围层、完整前景海报和阴影层次的沉浸式双层舞台。

**Architecture:** 保留 `index.vue` 当前的媒体回退和后台上传优先逻辑，只在首页媒体容器中增加背景渲染层；CSS 通过伪元素/同源 `background-image` 复用当前受控素材，前景继续使用现有 `ContentMediaView` 或 `MediaPlaceholder`。测试覆盖结构、视觉层样式和桌面/移动端加载。

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, CSS, Vitest, Playwright.

---

### Task 1: 为双层舞台建立结构契约

**Files:**
- Modify: `app/pages/index.vue`
- Test: `tests/unit/portal-visual.test.ts`

- [x] **Step 1: 写失败测试**

在首页视觉测试中断言默认海报容器带有 `data-visual-stage="poster"`，并且背景层的 URL 与前景默认资产一致；上传媒体路径仍只渲染一个媒体前景。

- [x] **Step 2: 运行测试确认失败**

运行 `corepack pnpm --config.engine-strict=false exec vitest run tests/unit/portal-visual.test.ts`，预期新断言因舞台结构尚不存在而失败。

- [x] **Step 3: 写最小实现**

在首页 `homeVisual.media`/`MediaPlaceholder` 分支外增加 `home-hero__stage` 包裹层；默认资产场景渲染 `.home-hero__stage-backdrop`，上传媒体场景只保留前景媒体。

- [x] **Step 4: 运行测试确认通过**

再次运行同一 Vitest 命令，确认结构测试通过。

- [x] **Step 5: 提交**

运行 `git add app/pages/index.vue tests/unit/portal-visual.test.ts && git commit -m "feat: add layered home poster stage"`。

### Task 2: 实现桌面端背景氛围与前景海报层次

**Files:**
- Modify: `app/assets/css/main.css`
- Test: `tests/e2e/home.spec.ts`

- [x] **Step 1: 写失败端到端断言**

增加断言：默认首页包含 `.home-hero__stage-backdrop`，前景图片 `object-fit: contain`，舞台具有非透明背景层，且前景图片高度大于现有小海报比例。

- [x] **Step 2: 运行测试确认失败**

运行 `CI=1 HSD_E2E_CHROMIUM_PATH=... HSD_E2E_PORT=49885 corepack pnpm --config.engine-strict=false exec playwright test tests/e2e/home.spec.ts`，预期新选择器断言失败。

- [x] **Step 3: 写最小 CSS 实现**

为 `.home-hero__stage`、`.home-hero__stage-backdrop`、`.home-hero__media--poster` 增加定位、背景裁切、红黑蒙版、前景海报阴影和轻微边缘高光；前景保持 `object-fit: contain`，高度约为舞台的 88%–92%。

- [x] **Step 4: 运行端到端测试确认通过**

运行同一 Playwright 命令，确认桌面首页的舞台和图片断言通过。

- [x] **Step 5: 提交**

运行 `git add app/assets/css/main.css tests/e2e/home.spec.ts && git commit -m "feat: style immersive home poster stage"`。

### Task 3: 完成移动端回退和响应式回归

**Files:**
- Modify: `app/assets/css/main.css`
- Test: `tests/e2e/page-banners.spec.ts`

- [x] **Step 1: 写失败移动端断言**

增加 390px 视口断言：`scrollWidth === innerWidth`，前景图片完整可见，舞台不产生横向溢出。

- [x] **Step 2: 运行测试确认失败**

运行页面封面端到端测试，预期新移动端选择器或尺寸断言失败。

- [x] **Step 3: 写最小响应式 CSS**

在现有移动断点中取消桌面越界偏移，压低背景层强度，设置前景海报宽度为 `min(82%, 360px)`、高度自适应并保持完整显示。

- [x] **Step 4: 运行全部相关测试**

运行 `corepack pnpm --config.engine-strict=false exec playwright test tests/e2e/home.spec.ts tests/e2e/page-banners.spec.ts`，确认桌面和移动端通过。

- [x] **Step 5: 提交**

运行 `git add app/assets/css/main.css tests/e2e/page-banners.spec.ts && git commit -m "test: cover responsive home poster stage"`。

### Task 4: 最终验证

**Files:**
- Verify: `app/pages/index.vue`, `app/assets/css/main.css`, `tests/unit/portal-visual.test.ts`, `tests/e2e/home.spec.ts`, `tests/e2e/page-banners.spec.ts`

- [x] **Step 1:** 运行 `corepack pnpm --config.engine-strict=false run test:unit`，预期全部单元测试通过。
- [x] **Step 2:** 运行 `corepack pnpm --config.engine-strict=false run typecheck`，预期类型检查通过。
- [x] **Step 3:** 运行 `corepack pnpm --config.engine-strict=false run build`，预期生产构建退出码为 0。
- [x] **Step 4:** 运行桌面和移动端 Playwright 回归，预期首页主视觉、各页面封面加载且无横向溢出。
- [x] **Step 5:** 运行 `git diff --check HEAD~3..HEAD` 和 `git status --short`，确认无空白错误、无未提交源码改动。
