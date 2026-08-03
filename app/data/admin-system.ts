import {
  DEMO_APPLICANT_PROFILE,
  DEMO_MEMBER_PROFILE
} from "./member-profile";

export const ADMIN_LEVELS = ["member", "admin", "owner"] as const;
export type AdminLevel = (typeof ADMIN_LEVELS)[number];

export const DEMO_MEMBER_ACCOUNT = "demo-member";
export const DEMO_APPLICANT_ACCOUNT = "demo-applicant";

export interface MockAccount {
  account: string;
  memberId: string;
  name: string;
  adminLevel: AdminLevel;
  adminAccessEnabled: boolean;
}

export type MockLoginResult =
  | { status: "success"; account: MockAccount }
  | { status: "unknown-account"; account: string }
  | { status: "admin-access-missing"; account: MockAccount }
  | { status: "admin-access-disabled"; account: MockAccount };

// This is the sole mock account and authorization source. Profile fixtures remain separate.
export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    account: DEMO_MEMBER_ACCOUNT,
    memberId: DEMO_MEMBER_PROFILE.id,
    name: DEMO_MEMBER_PROFILE.name,
    adminLevel: "member",
    adminAccessEnabled: true
  },
  {
    account: DEMO_APPLICANT_ACCOUNT,
    memberId: DEMO_APPLICANT_PROFILE.id,
    name: DEMO_APPLICANT_PROFILE.name,
    adminLevel: "member",
    adminAccessEnabled: true
  },
  {
    account: "media-admin",
    memberId: DEMO_MEMBER_PROFILE.id,
    name: "周同学",
    adminLevel: "admin",
    adminAccessEnabled: true
  },
  {
    account: "admin-alliance",
    memberId: DEMO_MEMBER_PROFILE.id,
    name: "联盟管理员",
    adminLevel: "owner",
    adminAccessEnabled: true
  },
  {
    account: "disabled-admin",
    memberId: DEMO_MEMBER_PROFILE.id,
    name: "已停用管理员",
    adminLevel: "admin",
    adminAccessEnabled: false
  }
];

export function findMockAccount(
  accounts: MockAccount[],
  account: string
): MockAccount | undefined {
  return accounts.find((item) => item.account === account.trim());
}

export function resolveMockLogin(
  accounts: MockAccount[],
  account: string,
  requireAdmin = false
): MockLoginResult {
  const matchedAccount = findMockAccount(accounts, account);
  if (!matchedAccount) return { status: "unknown-account", account: account.trim() };

  if (requireAdmin && matchedAccount.adminLevel === "member") {
    return { status: "admin-access-missing", account: matchedAccount };
  }

  if (requireAdmin && !matchedAccount.adminAccessEnabled) {
    return { status: "admin-access-disabled", account: matchedAccount };
  }

  return { status: "success", account: matchedAccount };
}

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "review"
  | "publish"
  | "export";

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  users: number;
  scope: string;
  permissions: Record<string, PermissionAction[]>;
}

export interface AdminAuditRecord {
  id: string;
  actor: string;
  role: string;
  module: string;
  action: string;
  target: string;
  before: string;
  after: string;
  result: "成功" | "失败";
  time: string;
  ip: string;
  device: string;
}

const ALL_ACTIONS: PermissionAction[] = [
  "view",
  "create",
  "edit",
  "review",
  "publish",
  "export"
];

export const PERMISSION_MODULES = [
  { id: "recruitment", label: "招新与考核" },
  { id: "members", label: "组织与成员" },
  { id: "projects", label: "项目与活动" },
  { id: "content", label: "内容与门户" },
  { id: "media", label: "媒体与资源" },
  { id: "system", label: "系统与权限" }
] as const;

export const ADMIN_ROLES: AdminRole[] = [
  {
    id: "alliance-lead",
    name: "联盟总负责人",
    description: "可查看并管理全部业务域，承担结果发布与权限审批。",
    users: 2,
    scope: "全联盟",
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((module) => [module.id, [...ALL_ACTIONS]])
    )
  },
  {
    id: "center-lead",
    name: "中心负责人",
    description: "管理本中心成员、第一志愿人员、项目和活动。",
    users: 6,
    scope: "所属中心",
    permissions: {
      recruitment: ["view", "edit", "review", "export"],
      members: ["view", "edit", "review"],
      projects: ["view", "create", "edit", "review", "publish"],
      content: ["view", "create", "edit"],
      media: ["view"],
      system: []
    }
  },
  {
    id: "media-admin",
    name: "媒体管理员",
    description: "维护媒体素材、画廊专题及门户内容。",
    users: 4,
    scope: "媒体与门户",
    permissions: {
      recruitment: ["view"],
      members: ["view"],
      projects: ["view"],
      content: ["view", "create", "edit", "review", "publish"],
      media: ["view", "create", "edit", "review", "publish", "export"],
      system: []
    }
  },
  {
    id: "content-editor",
    name: "内容编辑",
    description: "创建和编辑内容，发布动作由内容负责人完成。",
    users: 8,
    scope: "内容草稿",
    permissions: {
      recruitment: [],
      members: ["view"],
      projects: ["view"],
      content: ["view", "create", "edit"],
      media: ["view"],
      system: []
    }
  }
];

export const ADMIN_AUDIT_RECORDS: AdminAuditRecord[] = [
  {
    id: "log-001",
    actor: "联盟管理员",
    role: "联盟总负责人",
    module: "招新与考核",
    action: "发布 2026 秋季招新录取结果",
    target: "2026 秋季招新批次",
    before: "内部结果 · 87 人",
    after: "已发布 · 87 人",
    result: "成功",
    time: "2026-07-30 10:42:18",
    ip: "172.18.0.24",
    device: "Chrome 138 · Windows"
  },
  {
    id: "log-002",
    actor: "周同学",
    role: "媒体管理员",
    module: "媒体与资源",
    action: "审核通过首页主视觉",
    target: "2026 招新首页主视觉",
    before: "待审核",
    after: "可使用",
    result: "成功",
    time: "2026-07-30 09:36:04",
    ip: "172.18.0.53",
    device: "Edge 138 · Windows"
  },
  {
    id: "log-003",
    actor: "陈同学",
    role: "中心负责人",
    module: "组织与成员",
    action: "更新成员中心归属",
    target: "成员 2026012042",
    before: "预备成员",
    after: "白泽开发中心 · 正式成员",
    result: "成功",
    time: "2026-07-30 08:58:31",
    ip: "172.18.0.66",
    device: "Chrome 138 · macOS"
  },
  {
    id: "log-004",
    actor: "内容编辑 03",
    role: "内容编辑",
    module: "系统与权限",
    action: "尝试修改角色权限",
    target: "媒体管理员",
    before: "无修改权限",
    after: "请求被拒绝",
    result: "失败",
    time: "2026-07-29 23:18:05",
    ip: "172.18.0.81",
    device: "Chrome 138 · Windows"
  }
];

export function getRolePermission(
  roleId: string,
  moduleId: string,
  action: PermissionAction
) {
  const role = ADMIN_ROLES.find((item) => item.id === roleId);
  return role?.permissions[moduleId]?.includes(action) ?? false;
}

export function filterAuditRecords(
  records: AdminAuditRecord[],
  filters: { query: string; module: string; result: string }
) {
  const query = filters.query.trim().toLocaleLowerCase();
  return records.filter((record) => {
    const matchesQuery =
      !query ||
      [record.actor, record.action, record.target]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    const matchesModule =
      filters.module.startsWith("全部") || record.module === filters.module;
    const matchesResult =
      filters.result.startsWith("全部") || record.result === filters.result;
    return matchesQuery && matchesModule && matchesResult;
  });
}
