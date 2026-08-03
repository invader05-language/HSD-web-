import { defineStore } from "pinia";
import {
  ADMIN_AUDIT_RECORDS,
  findMockAccount,
  getAdminLevelLabel,
  MOCK_ACCOUNTS,
  resolveMockLogin,
  type AdminLevel,
  type AdminAuditRecord,
  type MockAccount
} from "../data/admin-system";

function cloneAccounts(): MockAccount[] {
  return MOCK_ACCOUNTS.map((account) => ({ ...account }));
}

export interface AdminQualificationDetails {
  configuredBy: string;
  configuredAt: string;
  lastLoginAt: string;
}

export type AdminQualificationChange = "grant" | "revoke" | "enable" | "disable";

const INITIAL_QUALIFICATION_DETAILS: Record<string, AdminQualificationDetails> = {
  "demo-member": {
    configuredBy: "成员账号",
    configuredAt: "2026-07-22 09:00:00",
    lastLoginAt: "2026-07-30 09:12:04"
  },
  "demo-applicant": {
    configuredBy: "成员账号",
    configuredAt: "2026-07-24 13:28:00",
    lastLoginAt: "2026-07-29 18:45:22"
  },
  "media-admin": {
    configuredBy: "联盟管理员",
    configuredAt: "2026-07-18 14:20:00",
    lastLoginAt: "2026-07-30 09:36:04"
  },
  "admin-alliance": {
    configuredBy: "系统初始化",
    configuredAt: "2026-07-01 09:00:00",
    lastLoginAt: "2026-07-30 10:42:18"
  },
  "disabled-admin": {
    configuredBy: "联盟管理员",
    configuredAt: "2026-07-19 16:10:00",
    lastLoginAt: "2026-07-27 15:08:41"
  }
};

function cloneQualificationDetails() {
  return Object.fromEntries(
    Object.entries(INITIAL_QUALIFICATION_DETAILS).map(([account, details]) => [
      account,
      { ...details }
    ])
  ) as Record<string, AdminQualificationDetails>;
}

function cloneAuditRecords(): AdminAuditRecord[] {
  return ADMIN_AUDIT_RECORDS.map((record) => ({ ...record }));
}

function formatAuditTime(date = new Date()) {
  const parts = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  return `${parts} ${time}`;
}

export const useAdminAccessStore = defineStore("admin-access", {
  state: () => ({
    accounts: cloneAccounts(),
    qualificationDetails: cloneQualificationDetails(),
    auditRecords: cloneAuditRecords()
  }),
  getters: {
    getAccount: (state) => (account: string) => findMockAccount(state.accounts, account),
    getQualification: (state) => (account: string) => state.qualificationDetails[account]
  },
  actions: {
    resolveLogin(account: string, options: { requireAdmin?: boolean } = {}) {
      return resolveMockLogin(this.accounts, account, options.requireAdmin ?? false);
    },
    grantAdmin(account: string): boolean {
      const target = this.getAccount(account);
      if (!target) return false;
      if (target.adminLevel === "owner") return true;

      target.adminLevel = "admin";
      target.adminAccessEnabled = true;
      return true;
    },
    revokeAdmin(account: string): boolean {
      const target = this.getAccount(account);
      if (!target || target.adminLevel === "owner") return false;

      target.adminLevel = "member";
      target.adminAccessEnabled = true;
      return true;
    },
    setAdminAccessEnabled(account: string, enabled: boolean): boolean {
      const target = this.getAccount(account);
      if (!target || target.adminLevel === "member" || target.adminLevel === "owner") {
        return false;
      }

      target.adminAccessEnabled = enabled;
      return true;
    },
    setAdminLevel(account: string, level: AdminLevel): boolean {
      const target = this.getAccount(account);
      if (!target || (target.adminLevel === "owner" && level !== "owner")) return false;

      target.adminLevel = level;
      if (level === "admin" || level === "owner") target.adminAccessEnabled = true;
      if (level === "member") target.adminAccessEnabled = true;
      return true;
    },
    changeAdminQualification(
      account: string,
      change: AdminQualificationChange,
      actor: { name: string; level: AdminLevel }
    ): boolean {
      const target = this.getAccount(account);
      if (!target || actor.level !== "owner" || target.adminLevel === "owner") return false;

      const before = { ...target };
      if (change === "grant" && target.adminLevel === "member") {
        target.adminLevel = "admin";
        target.adminAccessEnabled = true;
      } else if (change === "revoke" && target.adminLevel === "admin") {
        target.adminLevel = "member";
        target.adminAccessEnabled = true;
      } else if (change === "enable" && target.adminLevel === "admin" && !target.adminAccessEnabled) {
        target.adminAccessEnabled = true;
      } else if (change === "disable" && target.adminLevel === "admin" && target.adminAccessEnabled) {
        target.adminAccessEnabled = false;
      } else {
        return false;
      }

      const configuredAt = formatAuditTime();
      this.qualificationDetails[target.account] = {
        configuredBy: actor.name,
        configuredAt,
        lastLoginAt: this.getQualification(target.account)?.lastLoginAt ?? "尚未登录"
      };

      const actionLabels: Record<AdminQualificationChange, string> = {
        grant: "授予管理员资格",
        revoke: "撤销管理员资格",
        enable: "启用管理员资格",
        disable: "停用管理员资格"
      };
      this.auditRecords.unshift({
        id: `qualification-${target.account}-${Date.now()}`,
        actor: actor.name,
        role: getAdminLevelLabel(actor.level),
        module: "系统管理",
        action: actionLabels[change],
        target: `${target.name}（${target.account}）`,
        before: `${getAdminLevelLabel(before.adminLevel)} · ${before.adminAccessEnabled ? "已启用" : "已停用"}`,
        after: `${getAdminLevelLabel(target.adminLevel)} · ${target.adminAccessEnabled ? "已启用" : "已停用"}`,
        result: "成功",
        time: configuredAt,
        ip: "127.0.0.1",
        device: "当前浏览器 · Mock 会话"
      });
      return true;
    }
  }
});
