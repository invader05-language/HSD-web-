# Activity Admin Editor Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** 将活动管理改造成“列表页 + 独立新建/编辑页”的完整工作流，修复入口间距、编辑跳转、表单可用性和保存/发布校验问题。

**Architecture:** /admin/activities 只负责活动列表、状态概览和导航；/admin/activities/new 负责新建草稿；/admin/activities/:id 负责编辑已有活动。新建和编辑共用 ActivityEditor 组件，所有保存与发布仍通过 useActivitiesStore，用户端只读取已发布快照。管理表单使用结构化选项和统一校验。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、Pinia、现有 main.css 管理端设计令牌、Vitest、Playwright。

## Global Constraints

- 本轮先不执行 E2E；全部代码完成后再统一执行单元测试、类型检查、生产构建和 E2E。
- 活动不保留候补、不设置人数上限；中心管理员只能管理所属中心，联盟总负责人可管理全部活动并直接发布。
- 表单删除 Slug 可见字段；Slug 继续由 Store 根据标题生成，已发布活动的内部 Slug 不允许被编辑。
- “适合人群”字段改为“活动内容”，并同步领域类型、种子数据、公开详情文案和持久化迁移。
- “时间”只能从预设时间段下拉选择，不能使用自由文本输入。
- 保存成功提示必须在 Store 持久化成功后显示；发布按钮不能绕过完整性校验。
- 不新增并行 Store；活动唯一事实来源仍是 useActivitiesStore。

---

### Task 1: 收敛活动领域字段、选项和持久化迁移

**Files:**
- Modify: app/types/activity.ts
- Modify: app/data/activities.ts
- Modify: app/stores/activities.ts
- Test: tests/unit/activity-workflow.test.ts

**Interfaces:**
- ActivityDraftInput、PublishedActivity 使用 content: string 替换 audience: string。
- ACTIVITY_TYPE_OPTIONS 提供可选分类，不包含“全部”筛选项。
- ACTIVITY_TIME_OPTIONS 提供管理端允许的时间段，并包含现有种子活动的时间值。
- Store 将 ACTIVITIES_STORAGE_VERSION 升为 2，并把版本 1 的 audience 映射到 content。
- Store 提供 assertCompleteActivity(activity)，publish 必须调用。

- [ ] **Step 1: 先补充失败测试**

在 tests/unit/activity-workflow.test.ts 增加以下行为：

~~~ts
it("uses activity content and generated slug in a new draft", () => {
  const store = useActivitiesStore();
  useSessionStore().signIn("admin-alliance", { requireAdmin: true });
  const draft = store.createDraft({
    title: "new activity",
    type: "技术沙龙",
    date: "2026-09-20",
    time: "19:00–21:00",
    location: "线上会议室",
    summary: "活动摘要",
    content: "活动内容",
    agenda: ["环节一"],
    ownerCenterId: "baize-development",
    registrationEndAt: "2026-09-19T23:59:00.000Z",
  });

  expect(draft.slug).toBe("new-activity");
  expect(draft.content).toBe("活动内容");
});

it("rejects publishing when any required activity field is empty", () => {
  const store = useActivitiesStore();
  useSessionStore().signIn("admin-alliance", { requireAdmin: true });
  const draft = store.createDraft({
    title: "未完成活动",
    type: "技术沙龙",
    date: "",
    time: "",
    location: "",
    summary: "",
    content: "",
    agenda: [],
    ownerCenterId: "baize-development",
    registrationEndAt: "",
  });

  expect(() => store.publish(draft.id)).toThrow("ACTIVITY_INCOMPLETE");
});
~~~

另加一个版本 1 持久化样本，断言 hydrate 后旧活动的 audience 已迁移为 content，报名记录不丢失。

- [ ] **Step 2: 运行新增单测，确认当前实现失败**

Run: sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/activity-workflow.test.ts

Expected: FAIL because current domain model still requires audience, accepts free-form time values, and does not reject incomplete publish data.

- [ ] **Step 3: 更新领域类型和种子选项**

在 app/types/activity.ts 将 audience 改为 content；在 app/data/activities.ts 将三条种子活动的 audience 改为 content，并新增：

~~~ts
export const ACTIVITY_TYPE_OPTIONS = ["技术沙龙", "项目实训", "媒体创作", "赛事活动"] as const;

export const ACTIVITY_TIME_OPTIONS = [
  "08:30–10:00",
  "10:00–11:30",
  "14:00–16:00",
  "14:30–18:00",
  "19:00–21:00",
  "19:30–21:00",
] as const;
~~~

- [ ] **Step 4: 增加 Store 版本迁移和发布校验**

在 app/stores/activities.ts：

1. 将持久化版本升为 2；读取版本 1 时把活动及 publishedSnapshot 中的 audience 复制为 content，再以版本 2 写回。
2. createDraft 根据标题生成 Slug，不再要求调用方提供 Slug；新草稿仍生成稳定的内部 id。
3. updateDraft 允许编辑标题、分类、日期、时间、地点、报名截止、归属中心、摘要、活动内容和活动流程，但不允许改变已有公开活动的 Slug。
4. assertCompleteActivity 检查 title、type、date、time、location、registrationEndAt、ownerCenterId、summary、content 去除空白后均有值，并且 agenda 至少包含一项非空环节；失败统一抛出 ACTIVITY_INCOMPLETE。
5. publish 在权限检查后调用 assertCompleteActivity，确保绕过页面按钮也不能发布空字段活动。

- [ ] **Step 5: 运行领域单测，确认迁移和校验通过**

Run: sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/activity-workflow.test.ts

Expected: activity workflow tests pass, including generated Slug, content 字段、版本迁移和 incomplete publish rejection。

---

### Task 2: 抽取可复用活动编辑器并实现独立新建页

**Files:**
- Create: app/components/admin/ActivityEditor.vue
- Create: app/pages/admin/activities/new.vue
- Modify: app/pages/admin/activities.vue
- Test: tests/unit/activity-workflow.test.ts

**Interfaces:**
- ActivityEditor props: activity?: ManagedActivity; mode: "create" | "edit"。
- ActivityEditor emits: saved(id: string)、published(id: string)、cancelled()。
- 表单状态包含 title、type、date、time、location、registrationEndAt、ownerCenterId、summary、content、agenda；不包含 slug。

- [ ] **Step 1: 建立表单校验状态**

ActivityEditor 使用 formError、fieldErrors、isSaving、isPublishing 和 isComplete。发布前的 validateForm 返回缺失字段的中文标签，例如 标题、活动内容、活动流程，并显示在表单顶部；草稿保存不要求字段完整，但不能只依赖浏览器原生 required 提示。

- [ ] **Step 2: 实现表单初始化和字段映射**

编辑模式从 activity 复制数据；新建模式使用空字符串和当前管理员可用的默认 ownerCenterId。agenda 在 textarea 中按换行显示，提交时转换为去空白后的字符串数组。分类使用 ACTIVITY_TYPE_OPTIONS，时间使用 ACTIVITY_TIME_OPTIONS，归属中心使用固定中心选项；中心管理员的归属中心选择框禁用。

- [ ] **Step 3: 实现真实保存草稿**

saveDraft 的流程必须是：将表单转换为 ActivityDraftInput；编辑模式调用 updateDraft，新建模式调用 createDraft；只有 Store persist 成功后才 emit saved(id) 并显示“草稿已保存”。捕获持久化错误时保留表单内容并显示“保存失败”。草稿可以暂时缺少必填字段，不能因此阻止保存。

- [ ] **Step 4: 实现直接发布前置条件和发布流程**

发布按钮 disabled 条件至少包含 !isComplete、isSaving、isPublishing。publish handler 再次 validateForm；表单完整时先保存当前草稿，再调用 activitiesStore.publish(savedId)，成功后 emit published(id)。这样新建页可直接发布，但绝不允许空字段发布。

- [ ] **Step 5: 实现新建页**

app/pages/admin/activities/new.vue 使用 admin layout，标题为“新建活动”，右上角提供“返回活动管理”链接，主体只渲染 ActivityEditor mode=create。收到 saved(id) 后跳转 /admin/activities/:id；收到 published(id) 后跳转 /admin/activities。

- [ ] **Step 6: 清理列表页内嵌编辑器**

app/pages/admin/activities.vue 删除 form、selectedId、selectedActivity、saveDraft、publishSelected、clearForm、editActivity 以及底部编辑器卡片。保留统计区、活动表格和报名状态操作。

右上角动作改为两个 NuxtLink：

~~~vue
<template #actions>
  <NuxtLink class="button button--ghost" to="/admin/activities/registrations">报名名单</NuxtLink>
  <NuxtLink class="button" to="/admin/activities/new">新建活动</NuxtLink>
</template>
~~~

列表每行的“编辑”改为指向 /admin/activities/:id 的 NuxtLink，继续保留关闭报名 / 开放报名按钮。

---

### Task 3: 实现已有活动编辑页和权限/空状态

**Files:**
- Create: app/pages/admin/activities/[id].vue
- Modify: app/stores/activities.ts
- Modify: app/pages/admin/activities.vue
- Test: tests/unit/activity-workflow.test.ts

**Interfaces:**
- Store 提供 canManageActivity(activityId: string): boolean，复用现有中心范围规则。
- 编辑页从 route.params.id 读取活动，客户端调用 hydrate 后再读取持久化状态。

- [ ] **Step 1: 补充编辑行为测试**

断言编辑已有活动后 draft 字段发生变化，但 getPublicBySlug 返回的 publishedSnapshot 仍保持旧内容；再次 publish 后公开内容才更新。

- [ ] **Step 2: 实现编辑页读取和权限判断**

找到且有权限时显示 AdminPageHeading title=“编辑活动”与 ActivityEditor mode=edit；找不到时显示“活动不存在”和返回列表；找到但越权时跳转 /admin/forbidden?from=...。活动已发布时提供用户端预览链接 /activities/:slug。

- [ ] **Step 3: 接通保存、发布和返回行为**

收到 saved 后留在当前编辑页并显示“草稿已保存”；收到 published 后返回列表；收到 cancelled 后返回列表。编辑已发布活动时保存只更新草稿，必须再次点击直接发布才替换用户端快照。

- [ ] **Step 4: 运行编辑页相关单测**

Run: sh scripts/with-hsd-node.sh corepack pnpm exec vitest run tests/unit/activity-workflow.test.ts

Expected: existing snapshot isolation and new edit behavior tests pass.

---

### Task 4: 调整管理端操作间距和编辑器视觉层级

**Files:**
- Modify: app/assets/css/main.css
- Modify: app/components/admin/ActivityEditor.vue
- Modify: app/pages/admin/activities.vue
- Modify: app/pages/admin/activities/new.vue
- Modify: app/pages/admin/activities/[id].vue

- [ ] **Step 1: 统一管理端操作区按钮间距**

给 .admin-page-heading__actions 增加 display:flex、align-items:center、justify-content:flex-end、gap:12px、flex-wrap:wrap。同步统一批次工作区、报名审核、门户配置、确认弹窗、表格行操作等管理端操作组的按钮间距为 12px；移动端允许换行。这样截图中的所有管理端操作按钮保持一致的视觉节奏。

- [ ] **Step 2: 为编辑器增加白底内边距和字段间距**

ActivityEditor 使用专用 admin-activity-editor class，避免改变其它管理页面。核心样式为：

~~~css
.admin-activity-editor {
  margin-top: 20px;
}

.admin-activity-editor__body {
  padding: 26px 30px 30px;
}

.admin-activity-editor .admin-editor-grid {
  column-gap: 18px;
  row-gap: 20px;
}

.admin-activity-editor .admin-editor-grid > label {
  display: grid;
  gap: 8px;
  color: #353a40;
  font-size: 12px;
  font-weight: 700;
}

.admin-activity-editor input,
.admin-activity-editor select,
.admin-activity-editor textarea {
  width: 100%;
  border: 1px solid #d9dde1;
  border-radius: 4px;
  padding: 11px;
  background: #fff;
  color: #34383e;
  font: inherit;
  font-size: 12px;
}

.admin-activity-editor textarea {
  min-height: 112px;
  line-height: 1.6;
  resize: vertical;
}
~~~

表单 footer 保留现有按钮样式并增加 30px 左右内边距；移动端 body 缩至 18px，字段单列排列。

- [ ] **Step 3: 浏览器视觉检查清单**

确认列表页不再显示表单；标题栏两按钮间至少 10px；新建页白色编辑底板与边缘有内边距；输入框、下拉框和 textarea 之间有清晰间距；时间为下拉框；页面不再出现 Slug 和“适合人群”。

---

### Task 5: 完成全量验证和文档同步

**Files:**
- Modify: README.md（如管理端路由表需要新增 /admin/activities/new、/admin/activities/:id）
- Modify: docs/superpowers/specs/2026-08-06-activity-gallery-domain-linkage-design.md
- Test: tests/unit/activity-workflow.test.ts
- Test: tests/e2e/activity-gallery-workflows.spec.ts
- Test: tests/e2e/admin-platform.spec.ts

- [ ] **Step 1: 补充单元覆盖**

必须覆盖：标题生成 Slug；表单不暴露 Slug；时间选项来自 ACTIVITY_TIME_OPTIONS；活动内容保存、编辑和公开展示；保存草稿后 hydrate 仍存在；任一字段为空时 publish 抛出 ACTIVITY_INCOMPLETE；编辑草稿不改变 publishedSnapshot；中心管理员不能越权编辑。

- [ ] **Step 2: 统一执行测试**

本步骤才执行本轮暂缓的浏览器测试：

~~~bash
sh scripts/with-hsd-node.sh corepack pnpm run test:unit
sh scripts/with-hsd-node.sh corepack pnpm run typecheck
sh scripts/with-hsd-node.sh corepack pnpm run build
CI=1 HSD_E2E_PORT=49880 HSD_E2E_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' sh scripts/with-hsd-node.sh corepack pnpm exec playwright test
~~~

Expected: unit tests、typecheck、build 和全量 Playwright 均通过；git diff --check 无输出。

- [ ] **Step 3: 验收关键路径**

1. /admin/activities 只显示活动列表，点击“新建活动”进入 /admin/activities/new。
2. 新建页填写完整字段后保存草稿，刷新仍能在编辑页读到草稿。
3. 缺任一字段时直接发布不可用，Store 层仍拒绝绕过页面的发布调用。
4. 点击任意活动的编辑进入对应 /admin/activities/:id，保存草稿不影响用户端，发布后用户端显示新快照。
5. /admin/activities/registrations 的报名名单和审核功能不回归。

---

## Self-Review

- 覆盖标题栏间距、独立新建页、编辑器间距与控件、列表编辑跳转四项问题。
- 覆盖删除 Slug、适合人群改活动内容、时间改预设下拉选项。
- 覆盖保存真实持久化、发布前置条件、页面层与 Store 层双重校验。
- 覆盖 audience 到 content 的历史 localStorage 版本迁移，避免已有草稿丢失。
- 明确本轮不提前执行 E2E，统一测试放在 Task 5。
