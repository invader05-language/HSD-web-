<script setup lang="ts">
import type { AdminLevel } from "~/data/admin-system";
import {
  type AdminQualificationChange,
  useAdminAccessStore
} from "~/stores/admin-access";
import { useSessionStore } from "~/stores/session";

definePageMeta({ layout: "admin" });
useHead({ title: "管理员资格配置｜HSD 管理台" });

const access = useAdminAccessStore();
const session = useSessionStore();
const pendingChange = ref<{
  account: string;
  name: string;
  change: AdminQualificationChange;
} | null>(null);
const confirmButton = ref<HTMLButtonElement | null>(null);

const accounts = computed(() =>
  access.accounts.map((account) => ({
    ...account,
    qualification: access.getQualification(account.account)
  }))
);
const actionLabels: Record<AdminQualificationChange, string> = {
  grant: "授予管理员资格",
  revoke: "撤销管理员资格",
  enable: "启用管理员资格",
  disable: "停用管理员资格"
};

function levelLabel(level: AdminLevel) {
  if (level === "owner") return "联盟总负责人";
  if (level === "admin") return "平台管理员";
  return "普通成员";
}

function accessStatus(account: { adminLevel: AdminLevel; adminAccessEnabled: boolean }) {
  if (account.adminLevel === "member") return "未配置";
  return account.adminAccessEnabled ? "已启用" : "已停用";
}

function availableAction(account: { adminLevel: AdminLevel; adminAccessEnabled: boolean }) {
  if (account.adminLevel === "owner") return undefined;
  if (account.adminLevel === "member") return "grant";
  return account.adminAccessEnabled ? "disable" : "enable";
}

function openConfirmation(
  account: { account: string; name: string; adminLevel: AdminLevel; adminAccessEnabled: boolean },
  requestedChange?: AdminQualificationChange
) {
  const change = requestedChange ?? availableAction(account);
  if (!change || account.adminLevel === "owner") return;
  pendingChange.value = { account: account.account, name: account.name, change };
  nextTick(() => confirmButton.value?.focus());
}

function closeConfirmation() {
  pendingChange.value = null;
}

function confirmChange() {
  if (!pendingChange.value || !session.currentAccount) return;
  access.changeAdminQualification(pendingChange.value.account, pendingChange.value.change, {
    name: session.currentAccount.name,
    level: session.adminLevel
  });
  closeConfirmation();
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page admin-qualification-page">
    <AdminPageHeading eyebrow="Administrator Access" title="管理员资格配置" description="仅联盟总负责人可授予、撤销、启用或停用下属管理员资格。每次实际变更都会写入当前会话的 Mock 审计日志。" />

    <section class="admin-list-card">
      <header>
        <div><span>Access Qualifications</span><h2>成员账号与管理员资格</h2></div>
        <p>共 {{ accounts.length }} 个 Mock 账号</p>
      </header>
      <div class="admin-table-scroll">
        <table aria-label="管理员资格配置列表">
          <thead><tr><th>成员账号</th><th>管理级别</th><th>资格状态</th><th>配置人 / 时间</th><th>最近登录</th><th><span class="sr-only">资格操作</span></th></tr></thead>
          <tbody>
            <tr v-for="account in accounts" :key="account.account">
              <td><strong>{{ account.name }}</strong><small>{{ account.account }}</small></td>
              <td>{{ levelLabel(account.adminLevel) }}</td>
              <td><AdminStatusPill :status="accessStatus(account)" /></td>
              <td><strong>{{ account.qualification?.configuredBy ?? "-" }}</strong><small>{{ account.qualification?.configuredAt ?? "-" }}</small></td>
              <td>{{ account.qualification?.lastLoginAt ?? "尚未登录" }}</td>
              <td class="admin-qualification-actions">
                <span v-if="account.adminLevel === 'owner'" class="admin-owner-lock">负责人资格受保护</span>
                <template v-else>
                  <button type="button" @click="openConfirmation(account)">{{ actionLabels[availableAction(account)!] }}</button>
                  <button v-if="account.adminLevel === 'admin'" type="button" class="admin-text-danger" @click="openConfirmation(account, 'revoke')">撤销资格</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="pendingChange" class="admin-drawer-backdrop admin-modal-center" @click.self="closeConfirmation" @keydown.esc="closeConfirmation">
        <section class="admin-system-confirm" role="alertdialog" aria-modal="true" aria-labelledby="qualification-confirm-title" aria-describedby="qualification-confirm-description">
          <span>ADMINISTRATION ACCESS</span>
          <h2 id="qualification-confirm-title">确认{{ actionLabels[pendingChange.change] }}？</h2>
          <p id="qualification-confirm-description">你将对 {{ pendingChange.name }} 的管理资格执行此操作。变更会立即影响其后续登录、导航和路由访问，并写入操作日志。</p>
          <dl><div><dt>操作</dt><dd>{{ actionLabels[pendingChange.change] }}</dd></div><div><dt>执行人</dt><dd>{{ session.currentAccount?.name ?? "-" }}</dd></div></dl>
          <footer><button type="button" class="button button--ghost" @click="closeConfirmation">取消</button><button ref="confirmButton" type="button" class="button" @click="confirmChange">确认变更</button></footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>
