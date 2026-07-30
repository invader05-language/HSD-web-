# Compact Footer Disclaimer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在全站 Footer 底栏加入固定的学生社团非商业用途声明，并将 Footer 垂直高度压缩至现有设计的约四分之三。

**Architecture:** 继续使用全站共用的 `SiteFooter.vue`，不新增业务状态或数据模块。桌面底栏改为三列网格，平板允许声明独占一行，手机按版权、声明、帮助入口纵向排列；Playwright 直接验证固定文案、精确间距、排列方向和无横向溢出。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、现有全局 CSS、Playwright

## Global Constraints

- 产品名称固定为“白云 HSD 开发者部落”。
- 主要验收视口为 `1440 × 1000` 桌面 Web。
- 固定声明为“本平台由学生社团自主建设，仅用于社团管理与校园交流，站内内容及图片不作任何商业用途。”
- Footer 主体上下间距由 `72px 52px` 调整为 `54px 39px`。
- Footer 底栏最小高度由 `68px` 调整为 `52px`。
- 不缩小现有正文内容，不移除快速入口、联系说明、版权或帮助中心。
- 帮助中心链接在手机端仍保留不小于 `44px` 的可操作高度。
- 不新增后端、数据库、CMS、素材或外部依赖。
- 页面变更同步更新设计规格、PRD、README、`init/AGENTS.md` 和桌面截图。

---

## File Map

- `app/components/SiteFooter.vue`：渲染底栏版权、固定声明和帮助入口。
- `app/assets/css/main.css`：负责桌面三列、平板换行、手机纵向排列及压缩间距。
- `tests/e2e/footer.spec.ts`：验证固定文案、桌面密度、桌面三列、手机纵向排列、点击区域和横向溢出。
- `docs/superpowers/specs/2026-07-30-footer-disclaimer-density-design.md`：把设计状态更新为已实现。
- `HSD需求文档.md`：记录 Footer 非商业声明和密度变更。
- `README.md`：记录全站 Footer 当前行为。
- `init/AGENTS.md`：固化 Footer 文案、间距和响应式约束。
- `.gstack/design-reports/hsd-2026-07-30/screenshots/footer-compact-1440.png`：桌面视觉证据。

---

### Task 1: 实现并验证紧凑 Footer 与非商业声明

**Files:**
- Modify: `app/components/SiteFooter.vue`
- Modify: `app/assets/css/main.css`
- Create: `tests/e2e/footer.spec.ts`
- Modify: `docs/superpowers/specs/2026-07-30-footer-disclaimer-density-design.md`
- Modify: `HSD需求文档.md`
- Modify: `README.md`
- Modify: `init/AGENTS.md`
- Create: `.gstack/design-reports/hsd-2026-07-30/screenshots/footer-compact-1440.png`

**Interfaces:**
- Consumes: 现有 `SITE_CONFIG`、`.shell` 宽度系统和 `SiteFooter` 全站布局挂载。
- Produces: `.site-footer__copyright`、`.site-footer__notice`、`.site-footer__help` 三个稳定选择器和固定声明文案。

- [ ] **Step 1: 写 Footer 行为与布局的失败测试**

创建 `tests/e2e/footer.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

const notice =
  "本平台由学生社团自主建设，仅用于社团管理与校园交流，站内内容及图片不作任何商业用途。";

test("desktop footer publishes the non-commercial notice in a compact three-part bottom bar", async ({ page }) => {
  await page.goto("/");

  const footer = page.locator(".site-footer");
  const footerGrid = footer.locator(".site-footer__grid");
  const footerBottom = footer.locator(".site-footer__bottom");

  await expect(footer.getByText(notice, { exact: true })).toBeVisible();
  await expect(footer.getByText("© 2026 白云 HSD 开发者部落", { exact: true })).toBeVisible();
  await expect(footer.getByRole("link", { name: "帮助中心" })).toBeVisible();

  const spacing = await footerGrid.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom
    };
  });
  expect(spacing).toEqual({ paddingTop: "54px", paddingBottom: "39px" });
  await expect(footerBottom).toHaveCSS("min-height", "52px");

  const boxes = await Promise.all([
    footer.locator(".site-footer__copyright").boundingBox(),
    footer.locator(".site-footer__notice").boundingBox(),
    footer.locator(".site-footer__help").boundingBox()
  ]);
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[0]!.x).toBeLessThan(boxes[1]!.x);
  expect(boxes[1]!.x).toBeLessThan(boxes[2]!.x);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});

test("mobile footer stacks copyright notice and help without shrinking the help target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const footer = page.locator(".site-footer");
  const copyright = footer.locator(".site-footer__copyright");
  const disclaimer = footer.locator(".site-footer__notice");
  const help = footer.locator(".site-footer__help");

  const boxes = await Promise.all([
    copyright.boundingBox(),
    disclaimer.boundingBox(),
    help.boundingBox()
  ]);
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y);
  expect(boxes[1]!.y).toBeLessThan(boxes[2]!.y);
  expect(boxes[2]!.height).toBeGreaterThanOrEqual(44);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});
```

- [ ] **Step 2: 运行聚焦测试并确认 RED**

Run:

```powershell
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/footer.spec.ts --reporter=line
```

Expected: 两条测试因 `.site-footer__notice`、`.site-footer__copyright`、`.site-footer__help` 尚不存在而失败；桌面间距仍为 `72px 52px`。

- [ ] **Step 3: 更新 Footer 语义结构**

将 `app/components/SiteFooter.vue` 的底栏替换为：

```vue
<div class="site-footer__bottom shell">
  <span class="site-footer__copyright">© 2026 白云 HSD 开发者部落</span>
  <p class="site-footer__notice">
    本平台由学生社团自主建设，仅用于社团管理与校园交流，站内内容及图片不作任何商业用途。
  </p>
  <NuxtLink class="site-footer__help" to="/help">帮助中心</NuxtLink>
</div>
```

上部品牌、快速入口和联系说明保持不变。

- [ ] **Step 4: 实现桌面、平板和手机密度规则**

在 `app/assets/css/main.css` 中把 Footer 主体和底栏基础样式调整为：

```css
.site-footer__grid {
  display: grid;
  grid-template-columns: 1.6fr 0.8fr 1fr;
  gap: 72px;
  padding-block: 54px 39px;
}

.site-footer__bottom {
  display: grid;
  min-height: 52px;
  grid-template-columns: minmax(0, 1fr) minmax(480px, 2fr) minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  border-top: 1px solid #494542;
  color: #a8a29d;
}

.site-footer__notice {
  max-width: none;
  margin: 0;
  color: #a8a29d;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
}

.site-footer__help {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-self: end;
}
```

在 `@media (max-width: 900px)` 中增加：

```css
.site-footer__bottom {
  grid-template-columns: 1fr 1fr;
  padding-block: 10px;
}

.site-footer__notice {
  grid-column: 1 / -1;
  grid-row: 2;
  text-align: left;
}
```

在 `@media (max-width: 640px)` 中把现有底栏纵向规则替换为：

```css
.site-footer__bottom {
  grid-template-columns: 1fr;
  align-items: start;
  gap: 4px;
  padding-block: 12px;
}

.site-footer__notice {
  grid-column: auto;
  grid-row: auto;
}

.site-footer__help {
  justify-self: start;
}
```

- [ ] **Step 5: 运行聚焦测试并确认 GREEN**

Run:

```powershell
$env:NUXT_IGNORE_LOCK='1'; pnpm playwright test tests/e2e/footer.spec.ts --reporter=line
```

Expected: `2 passed`，桌面间距、三列顺序、手机纵向顺序、44px 帮助入口和无横向溢出全部通过。

- [ ] **Step 6: 同步设计与产品文档**

更新以下内容：

- `docs/superpowers/specs/2026-07-30-footer-disclaimer-density-design.md`：状态改为“已实现”，补充实现日期和验收结果。
- `HSD需求文档.md`：在 2026-07-30 变更记录中写明固定声明、桌面三列底栏和约四分之三高度。
- `README.md`：在当前功能说明中加入 Footer 非商业声明和响应式规则。
- `init/AGENTS.md`：固化声明原文、`54px 39px` 主体间距、`52px` 底栏高度以及手机纵向顺序。

- [ ] **Step 7: 运行完整验证**

Run:

```powershell
pnpm test
pnpm build
$env:NUXT_IGNORE_LOCK='1'; pnpm test:e2e
git diff --check
```

Expected:

- Vitest 全部通过。
- Nuxt production build exit `0`。
- Playwright 包含新增 Footer 测试并全部通过。
- `git diff --check` 无输出。

- [ ] **Step 8: 生成桌面视觉证据**

在 `1440 × 1000` 下将首页滚动至 Footer，生成：

```text
.gstack/design-reports/hsd-2026-07-30/screenshots/footer-compact-1440.png
```

检查：

- Footer 相比旧截图明显更紧凑。
- 底栏版权、声明、帮助中心形成左、中、右三段。
- 声明不换成难以阅读的过小字号。
- 三段内容不重叠且页面无横向滚动。

- [ ] **Step 9: 提交**

```powershell
git add app/components/SiteFooter.vue app/assets/css/main.css tests/e2e/footer.spec.ts docs/superpowers/specs/2026-07-30-footer-disclaimer-density-design.md HSD需求文档.md README.md init/AGENTS.md
git commit -m "feat: add compact footer disclaimer"
```
