import {
  DEMO_APPLICANT_PROFILE,
  DEMO_MEMBER_PROFILE
} from "./member-profile";
import { ADMIN_MEMBERS } from "./admin-members";

export const ADMIN_LEVELS = ["member", "admin", "owner"] as const;
export type AdminLevel = (typeof ADMIN_LEVELS)[number];

export const ADMIN_CENTER_LEAD_LABELS = [
  "白泽开发中心负责人",
  "新媒体中心负责人",
  "拓维策划中心负责人",
  "人才发展中心负责人"
] as const;
export type AdminCenterRole = (typeof ADMIN_CENTER_LEAD_LABELS)[number];

export const ADMIN_ACCESS_STORAGE_KEY = "baiyun-hsd-admin-access";
export const ADMIN_ACCESS_STORAGE_VERSION = 1;

export function getAdminLevelLabel(level: AdminLevel): string {
  if (level === "owner") return "联盟总负责人";
  if (level === "admin") return "中心负责人";
  return "普通成员";
}

export const DEMO_MEMBER_ACCOUNT = "demo-member";
export const DEMO_APPLICANT_ACCOUNT = "demo-applicant";

export interface MockAccount {
  account: string;
  memberId: string;
  name: string;
  adminLevel: AdminLevel;
  adminAccessEnabled: boolean;
  adminCenterRole?: AdminCenterRole;
}

export function getAdminQualificationLabel(account: MockAccount): string {
  if (account.adminLevel === "admin") return account.adminCenterRole ?? "中心负责人";
  return getAdminLevelLabel(account.adminLevel);
}

export interface AdminCandidateDisplay {
  name: string;
  affiliation: string;
  identity: string;
}

export function getAdminCandidateDisplay(account: MockAccount): AdminCandidateDisplay {
  const member = ADMIN_MEMBERS.find((item) => item.id === account.memberId);
  return {
    name: account.name,
    affiliation: member?.center ?? "待确定",
    identity: account.adminLevel === "member"
      ? "普通成员"
      : getAdminQualificationLabel(account)
  };
}

export type MockLoginResult =
  | { status: "success"; account: MockAccount }
  | { status: "unknown-account"; account: string }
  | { status: "admin-access-missing"; account: MockAccount }
  | { status: "admin-access-disabled"; account: MockAccount };

function getPlatformMember(memberId: string) {
  const member = ADMIN_MEMBERS.find((item) => item.id === memberId);
  if (!member) throw new Error(`管理员账号成员不存在：${memberId}`);
  return member;
}

function createPlatformMemberAccount(
  account: string,
  memberId: string,
  options: Pick<MockAccount, "adminLevel" | "adminAccessEnabled" | "adminCenterRole">
): MockAccount {
  const member = getPlatformMember(memberId);
  return { account, memberId: member.id, name: member.name, ...options };
}

// Account authorization remains centralized here. Platform-member-backed accounts reuse
// the established administrator member fixtures instead of defining parallel user records.
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
  createPlatformMemberAccount("media-admin", "member-li", {
    adminLevel: "admin",
    adminAccessEnabled: true,
    adminCenterRole: "新媒体中心负责人"
  }),
  createPlatformMemberAccount("admin-alliance", "member-zhang", {
    adminLevel: "owner",
    adminAccessEnabled: true
  }),
  createPlatformMemberAccount("disabled-admin", "member-zhao", {
    adminLevel: "admin",
    adminAccessEnabled: false,
    adminCenterRole: "人才发展中心负责人"
  }),
  createPlatformMemberAccount("member-lin", "member-lin", {
    adminLevel: "member",
    adminAccessEnabled: true
  }),
  createPlatformMemberAccount("member-gao", "member-gao", {
    adminLevel: "member",
    adminAccessEnabled: true
  }),
  createPlatformMemberAccount("member-wang", "member-wang", {
    adminLevel: "member",
    adminAccessEnabled: true
  }),
  createPlatformMemberAccount("member-chen", "member-chen", {
    adminLevel: "member",
    adminAccessEnabled: true
  }),
  createPlatformMemberAccount("member-wu", "member-wu", {
    adminLevel: "member",
    adminAccessEnabled: true
  })
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

export const ADMIN_AUDIT_RECORDS: AdminAuditRecord[] = [
  {
    id: "log-001",
    actor: "张同学",
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
    actor: "李同学",
    role: "新媒体中心负责人",
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
    role: "拓维策划中心负责人",
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
    actor: "李同学",
    role: "新媒体中心负责人",
    module: "系统管理",
    action: "尝试访问管理员资格配置",
    target: "管理员资格配置",
    before: "缺少联盟总负责人资格",
    after: "请求被拒绝",
    result: "失败",
    time: "2026-07-29 23:18:05",
    ip: "172.18.0.81",
    device: "Chrome 138 · Windows"
  }
];

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
