# 成员与管理员登录访问 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在共享登录页实现成员/管理员模式切换，并以两级管理员资格闭环管理端访问。

**Architecture:** 会话保存当前账号和成员身份；账号授权数据提供 `member`、`admin`、`owner` 三个级别。路由守卫、管理导航、账号配置页和权限不足页都从同一资格来源派生行为。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、Pinia、VeeValidate、Zod、Vitest、Playwright。

## Global Constraints

- 仅实现前端 Mock，不接入后端、数据库、真实密码校验或新依赖。
- 使用项目内 Node 22.19.0 与 pnpm 10.33.0；不得修改全局开发环境。
- 保留既有 `/login?redirect=` 兼容性，拒绝开放重定向。
- 权限只有 `member`、`admin`、`owner` 三个等级；不得保留角色权限矩阵。
- 所有实现遵循 TDD：先观察目标测试失败，再写生产代码。

### Task 1: 账号资格与会话接口

**Files:** `app/data/admin-system.ts`、`app/stores/session.ts`、新增或更新账号资格测试。

- [ ] 建立单一账号资格类型与 Mock 账号映射，覆盖普通成员、平台管理员、联盟总负责人和停用管理员。
- [ ] 让会话保存当前账号，并提供 `adminLevel`、`canAccessAdmin`、`canManageAdminAccounts` 等派生能力。
- [ ] 登录结果必须能区分未知账号、管理员资格缺失、资格停用和成功。
- [ ] 写入并执行单元测试，确认负责人不可降级或停用。

### Task 2: 登录模式、续接与路由守卫

**Files:** `app/utils/login-continuation.ts`、`app/pages/login.vue`、`app/middleware/auth.global.ts`、`app/middleware/member.ts`、相关单元测试。

- [ ] 扩展安全续接工具，解析 `member/admin` 模式并兼容旧管理 redirect。
- [ ] 在测试失败后，实现成员/管理员登录模式、模式专属目标和明确错误状态。
- [ ] 管理路由守卫要求有效管理员资格；管理员账号页额外要求 `owner`；旧角色路由按等级跳转或拒绝。
- [ ] 更新页面复制、表单标签和键盘可访问性。

### Task 3: 管理端导航、身份与资格配置页

**Files:** `app/data/admin-platform.ts`、`app/layouts/admin.vue`、`app/pages/admin/accounts.vue`、`app/pages/admin/roles.vue`、`app/pages/admin/forbidden.vue`、`app/assets/css/main.css`。

- [ ] 移除角色权限入口和矩阵，系统导航改为“系统管理”。
- [ ] 使用会话资格过滤“管理员账号”导航，并在顶部与侧栏显示真实账号身份。
- [ ] 将管理员账号页改成 owner 专用的资格配置界面，带确认交互与 Mock 审计记录。
- [ ] 将旧角色页改成无 UI 的兼容跳转。
- [ ] 实现动态权限不足内容，说明当前账号与缺少的管理资格。

### Task 4: 回归、端到端与视觉验收

**Files:** `tests/unit/login-continuation.test.ts`、`tests/unit/admin-system.test.ts`、新增访问控制测试、`tests/e2e/admin-platform.spec.ts`、`tests/e2e/home.spec.ts`。

- [ ] 覆盖成员、管理员、负责人、撤销资格、旧地址和越权直接访问。
- [ ] 覆盖管理员账号配置即时影响导航与路由。
- [ ] 在 1440px 与 390px 视口检查登录模式、账号配置页和权限不足页。
- [ ] 运行 typecheck、完整单元测试、生产构建和 E2E；若 E2E 被本机监听限制阻止，保留证据并使用生产构建完成关键视觉检查。
