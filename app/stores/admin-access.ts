import { defineStore } from "pinia";
import {
  ADMIN_ACCESS_STORAGE_KEY,
  ADMIN_ACCESS_STORAGE_VERSION,
  ADMIN_AUDIT_RECORDS,
  ADMIN_CENTER_LEAD_LABELS,
  findMockAccount,
  getAdminQualificationLabel,
  getAdminLevelLabel,
  MOCK_ACCOUNTS,
  resolveMockLogin,
  type AdminCenterRole,
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

export interface AdminQualificationActor {
  account: string;
  name: string;
  level: AdminLevel;
}

export type AdminQualificationChange = "grant" | "revoke" | "enable" | "disable";

interface AdminAccessState {
  accounts: MockAccount[];
  qualificationDetails: Record<string, AdminQualificationDetails>;
  auditRecords: AdminAuditRecord[];
}

interface PersistedAdminAccessState extends AdminAccessState {
  version: typeof ADMIN_ACCESS_STORAGE_VERSION;
}

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
    configuredBy: "张同学",
    configuredAt: "2026-07-18 14:20:00",
    lastLoginAt: "2026-07-30 09:36:04"
  },
  "admin-alliance": {
    configuredBy: "系统初始化",
    configuredAt: "2026-07-01 09:00:00",
    lastLoginAt: "2026-07-30 10:42:18"
  },
  "disabled-admin": {
    configuredBy: "张同学",
    configuredAt: "2026-07-19 16:10:00",
    lastLoginAt: "2026-07-27 15:08:41"
  },
  "member-lin": {
    configuredBy: "成员账号",
    configuredAt: "2026-07-30 15:20:00",
    lastLoginAt: "尚未登录"
  },
  "member-gao": {
    configuredBy: "成员账号",
    configuredAt: "2026-07-30 14:42:00",
    lastLoginAt: "尚未登录"
  },
  "member-wang": {
    configuredBy: "成员账号",
    configuredAt: "2026-07-30 12:16:00",
    lastLoginAt: "尚未登录"
  },
  "member-chen": {
    configuredBy: "成员账号",
    configuredAt: "2026-07-29 22:08:00",
    lastLoginAt: "尚未登录"
  },
  "member-wu": {
    configuredBy: "成员账号",
    configuredAt: "2026-07-29 17:20:00",
    lastLoginAt: "尚未登录"
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

function createInitialState(): AdminAccessState {
  return {
    accounts: cloneAccounts(),
    qualificationDetails: cloneQualificationDetails(),
    auditRecords: cloneAuditRecords()
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAdminLevel(value: unknown): value is AdminLevel {
  return value === "member" || value === "admin" || value === "owner";
}

function isAdminCenterRole(value: unknown): value is AdminCenterRole {
  return typeof value === "string" && ADMIN_CENTER_LEAD_LABELS.includes(value as AdminCenterRole);
}

function isQualificationDetails(value: unknown): value is AdminQualificationDetails {
  return isRecord(value)
    && typeof value.configuredBy === "string"
    && typeof value.configuredAt === "string"
    && typeof value.lastLoginAt === "string";
}

function isAuditRecord(value: unknown): value is AdminAuditRecord {
  if (!isRecord(value)) return false;
  return ["id", "actor", "role", "module", "action", "target", "before", "after", "time", "ip", "device"]
    .every((key) => typeof value[key] === "string")
    && (value.result === "成功" || value.result === "失败");
}

function isValidPersistedAccounts(value: unknown): value is MockAccount[] {
  if (!Array.isArray(value) || value.length < MOCK_ACCOUNTS.length) return false;

  const seenAccounts = new Set<string>();
  for (const account of value) {
    if (!isRecord(account) || "password" in account) return false;
    if (typeof account.account !== "string"
      || !account.account.trim()
      || seenAccounts.has(account.account)
      || typeof account.memberId !== "string"
      || !account.memberId.trim()
      || typeof account.name !== "string"
      || !account.name.trim()
      || !isAdminLevel(account.adminLevel)
      || typeof account.adminAccessEnabled !== "boolean"
      || typeof account.mustChangePassword !== "boolean") {
      return false;
    }
    const initial = MOCK_ACCOUNTS.find((item) => item.account === account.account);
    if (initial && (account.memberId !== initial.memberId || account.name !== initial.name)) return false;
    if (account.adminLevel === "admin") {
      if (!isAdminCenterRole(account.adminCenterRole)) return false;
    } else if (account.adminCenterRole !== undefined) {
      return false;
    }
    if (account.adminLevel === "owner" && !account.adminAccessEnabled) return false;
    seenAccounts.add(account.account);
  }

  if (!MOCK_ACCOUNTS.every((account) => seenAccounts.has(account.account))) return false;

  const ownerCount = value.filter((account) => account.adminLevel === "owner").length;
  return ownerCount >= 1 && ownerCount <= 2;
}

function parsePersistedState(serialized: string | null): AdminAccessState | undefined {
  if (!serialized) return undefined;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!isRecord(parsed)
      || parsed.version !== ADMIN_ACCESS_STORAGE_VERSION
      || !isValidPersistedAccounts(parsed.accounts)
      || !isRecord(parsed.qualificationDetails)
      || !Array.isArray(parsed.auditRecords)) {
      return undefined;
    }

    const qualificationDetails = parsed.qualificationDetails;
    const auditRecords = parsed.auditRecords;
    const expectedAccounts = new Set(
      parsed.accounts.map((account) => account.account)
    );
    const detailKeys = Object.keys(qualificationDetails);
    if (detailKeys.length !== expectedAccounts.size
      || !detailKeys.every((account) => expectedAccounts.has(account))
      || !detailKeys.every((account) => isQualificationDetails(qualificationDetails[account]))
      || !auditRecords.every(isAuditRecord)) {
      return undefined;
    }

    const restoredDetails: Record<string, AdminQualificationDetails> = {};
    for (const account of detailKeys) {
      const details = qualificationDetails[account];
      if (!isQualificationDetails(details)) return undefined;
      restoredDetails[account] = { ...details };
    }

    return {
      accounts: parsed.accounts.map((account) => ({
        account: account.account,
        memberId: account.memberId,
        name: account.name,
        adminLevel: account.adminLevel,
        adminAccessEnabled: account.adminAccessEnabled,
        mustChangePassword: account.mustChangePassword,
        ...(account.adminCenterRole ? { adminCenterRole: account.adminCenterRole } : {})
      })),
      qualificationDetails: restoredDetails,
      auditRecords: auditRecords.map((record) => ({ ...record }))
    };
  } catch {
    return undefined;
  }
}

function getStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function restoreInitialOrPersistedState(): AdminAccessState {
  let serialized: string | null = null;
  try {
    serialized = getStorage()?.getItem(ADMIN_ACCESS_STORAGE_KEY) ?? null;
  } catch {
    serialized = null;
  }
  const persisted = parsePersistedState(serialized);
  return persisted ?? createInitialState();
}

function createPersistedState(state: AdminAccessState): PersistedAdminAccessState {
  return {
    version: ADMIN_ACCESS_STORAGE_VERSION,
    accounts: state.accounts.map((account) => ({
      account: account.account,
      memberId: account.memberId,
      name: account.name,
      adminLevel: account.adminLevel,
      adminAccessEnabled: account.adminAccessEnabled,
      mustChangePassword: account.mustChangePassword,
      ...(account.adminCenterRole ? { adminCenterRole: account.adminCenterRole } : {})
    })),
    qualificationDetails: Object.fromEntries(
      Object.entries(state.qualificationDetails).map(([account, details]) => [account, { ...details }])
    ) as Record<string, AdminQualificationDetails>,
    auditRecords: state.auditRecords.map((record) => ({ ...record }))
  };
}

function isCurrentActor(target: MockAccount, actor: AdminQualificationActor): boolean {
  return target.account === actor.account;
}

export const useAdminAccessStore = defineStore("admin-access", {
  state: restoreInitialOrPersistedState,
  getters: {
    getAccount: (state) => (account: string) => findMockAccount(state.accounts, account),
    getQualification: (state) => (account: string) => state.qualificationDetails[account]
  },
  actions: {
    resolveOwnerActor(actor: AdminQualificationActor): AdminQualificationActor | undefined {
      const account = this.getAccount(actor.account);
      if (!account || account.adminLevel !== "owner" || !account.adminAccessEnabled) return undefined;
      return { account: account.account, name: account.name, level: "owner" };
    },
    persistQualificationState() {
      try {
        this.persistAccessState();
      } catch {
        // Storage is optional for this frontend mock; memory state remains usable.
      }
    },
    persistAccessState() {
      const storage = getStorage();
      if (!storage) throw new Error("管理员帐号存储不可用");
      storage.setItem(
        ADMIN_ACCESS_STORAGE_KEY,
        JSON.stringify(createPersistedState(this))
      );
    },
    registerFormalMemberAccount(account: MockAccount): boolean {
      if (this.getAccount(account.account)) return false;
      this.accounts.push({ ...account });
      this.qualificationDetails[account.account] = {
        configuredBy: "系统创建",
        configuredAt: formatAuditTime(),
        lastLoginAt: "尚未登录"
      };
      return true;
    },
    resolveLogin(account: string, options: { requireAdmin?: boolean } = {}) {
      return resolveMockLogin(this.accounts, account, options.requireAdmin ?? false);
    },
    grantAdmin(
      account: string,
      actor: AdminQualificationActor,
      centerRole: AdminCenterRole = ADMIN_CENTER_LEAD_LABELS[0]
    ): boolean {
      return this.assignAdminCenterRole(account, centerRole, actor);
    },
    revokeAdmin(account: string, actor: AdminQualificationActor): boolean {
      return this.changeAdminQualification(account, "revoke", actor);
    },
    setAdminAccessEnabled(account: string, enabled: boolean, actor: AdminQualificationActor): boolean {
      return this.changeAdminQualification(account, enabled ? "enable" : "disable", actor);
    },
    setAdminLevel(account: string, level: AdminLevel, actor: AdminQualificationActor): boolean {
      if (level === "owner") return false;
      if (level === "admin") return this.assignAdminCenterRole(account, ADMIN_CENTER_LEAD_LABELS[0], actor);
      return this.changeAdminQualification(account, "revoke", actor);
    },
    appendQualificationAudit(
      actor: AdminQualificationActor,
      action: string,
      target: MockAccount,
      before: MockAccount,
      configuredAt: string
    ) {
      this.auditRecords.unshift({
        id: `qualification-${target.account}-${Date.now()}`,
        actor: actor.name,
        role: getAdminQualificationLabel(this.getAccount(actor.account) ?? target),
        module: "系统管理",
        action,
        target: `${target.name}（${target.account}）`,
        before: `${getAdminQualificationLabel(before)} · ${before.adminAccessEnabled ? "已启用" : "已停用"}`,
        after: `${getAdminQualificationLabel(target)} · ${target.adminAccessEnabled ? "已启用" : "已停用"}`,
        result: "成功",
        time: configuredAt,
        ip: "127.0.0.1",
        device: "当前浏览器 · Mock 会话"
      });
    },
    updateQualificationDetails(target: MockAccount, actor: AdminQualificationActor, configuredAt: string) {
      this.qualificationDetails[target.account] = {
        configuredBy: actor.name,
        configuredAt,
        lastLoginAt: this.getQualification(target.account)?.lastLoginAt ?? "尚未登录"
      };
    },
    assignAdminCenterRole(
      account: string,
      centerRole: AdminCenterRole,
      actor: AdminQualificationActor
    ): boolean {
      const target = this.getAccount(account);
      const authorizedActor = this.resolveOwnerActor(actor);
      if (!target || !authorizedActor || target.adminLevel === "owner") return false;

      const before = { ...target };
      target.adminLevel = "admin";
      target.adminCenterRole = centerRole;
      target.adminAccessEnabled = true;
      const configuredAt = formatAuditTime();
      this.updateQualificationDetails(target, authorizedActor, configuredAt);
      this.appendQualificationAudit(authorizedActor, "分配中心负责人资格", target, before, configuredAt);
      this.persistQualificationState();
      return true;
    },
    promoteToOwner(account: string, actor: AdminQualificationActor): boolean {
      const target = this.getAccount(account);
      const authorizedActor = this.resolveOwnerActor(actor);
      const ownerCount = this.accounts.filter((item) => item.adminLevel === "owner").length;
      if (!target || !authorizedActor || target.adminLevel === "owner" || ownerCount >= 2) {
        return false;
      }

      const before = { ...target };
      target.adminLevel = "owner";
      delete target.adminCenterRole;
      target.adminAccessEnabled = true;
      const configuredAt = formatAuditTime();
      this.updateQualificationDetails(target, authorizedActor, configuredAt);
      this.appendQualificationAudit(authorizedActor, "提升为联盟总负责人", target, before, configuredAt);
      this.persistQualificationState();
      return true;
    },
    demoteOwner(
      account: string,
      actor: AdminQualificationActor,
      centerRole: AdminCenterRole = ADMIN_CENTER_LEAD_LABELS[0]
    ): boolean {
      const target = this.getAccount(account);
      const authorizedActor = this.resolveOwnerActor(actor);
      const ownerCount = this.accounts.filter((item) => item.adminLevel === "owner").length;
      if (!target
        || !authorizedActor
        || target.adminLevel !== "owner"
        || ownerCount <= 1
        || isCurrentActor(target, authorizedActor)) {
        return false;
      }

      const before = { ...target };
      target.adminLevel = "admin";
      target.adminCenterRole = centerRole;
      target.adminAccessEnabled = true;
      const configuredAt = formatAuditTime();
      this.updateQualificationDetails(target, authorizedActor, configuredAt);
      this.appendQualificationAudit(authorizedActor, "撤销联盟总负责人资格", target, before, configuredAt);
      this.persistQualificationState();
      return true;
    },
    changeAdminQualification(
      account: string,
      change: AdminQualificationChange,
      actor: AdminQualificationActor
    ): boolean {
      const target = this.getAccount(account);
      const authorizedActor = this.resolveOwnerActor(actor);
      if (!target || !authorizedActor || target.adminLevel === "owner" || isCurrentActor(target, authorizedActor)) {
        return false;
      }

      const before = { ...target };
      if (change === "grant" && target.adminLevel === "member") {
        target.adminLevel = "admin";
        target.adminCenterRole = ADMIN_CENTER_LEAD_LABELS[0];
        target.adminAccessEnabled = true;
      } else if (change === "revoke" && target.adminLevel === "admin") {
        target.adminLevel = "member";
        delete target.adminCenterRole;
        target.adminAccessEnabled = true;
      } else if (change === "enable" && target.adminLevel === "admin" && !target.adminAccessEnabled) {
        target.adminAccessEnabled = true;
      } else if (change === "disable" && target.adminLevel === "admin" && target.adminAccessEnabled) {
        target.adminAccessEnabled = false;
      } else {
        return false;
      }

      const configuredAt = formatAuditTime();
      this.updateQualificationDetails(target, authorizedActor, configuredAt);
      const actionLabels: Record<AdminQualificationChange, string> = {
        grant: "授予中心负责人资格",
        revoke: "撤销管理员资格",
        enable: "启用管理员资格",
        disable: "停用管理员资格"
      };
      this.appendQualificationAudit(authorizedActor, actionLabels[change], target, before, configuredAt);
      this.persistQualificationState();
      return true;
    }
  }
});
