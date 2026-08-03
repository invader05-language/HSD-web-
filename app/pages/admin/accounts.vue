<script setup lang="ts">
import {
  ADMIN_CENTER_LEAD_LABELS,
  getAdminCandidateDisplay,
  getAdminQualificationLabel,
  type AdminCenterRole,
  type MockAccount
} from "~/data/admin-system";
import {
  type AdminQualificationActor,
  type AdminQualificationChange,
  useAdminAccessStore
} from "~/stores/admin-access";
import { useSessionStore } from "~/stores/session";

definePageMeta({ layout: "admin" });
useHead({ title: "管理员资格配置｜HSD 管理台" });

type QualificationDialog = "admin" | "owner" | null;
type PendingChange = {
  account: string;
  name: string;
  change: AdminQualificationChange | "demote-owner";
};

const access = useAdminAccessStore();
const session = useSessionStore();
const qualificationDialog = ref<QualificationDialog>(null);
const selectedCandidate = ref("");
const candidateQuery = ref("");
const selectedRole = ref<AdminCenterRole>(ADMIN_CENTER_LEAD_LABELS[0]);
const pendingChange = ref<PendingChange | null>(null);
const confirmButton = ref<HTMLButtonElement | null>(null);

const actor = computed<AdminQualificationActor | null>(() => session.currentAccount
  ? {
      account: session.currentAccount.account,
      name: session.currentAccount.name,
      level: session.adminLevel
    }
  : null);
const accounts = computed(() => access.accounts.map((account) => ({
  ...account,
  qualification: access.getQualification(account.account)
})));
const owners = computed(() => accounts.value.filter((account) => account.adminLevel === "owner"));
const administrators = computed(() => accounts.value.filter((account) => account.adminLevel === "admin"));
const ownerLimitReached = computed(() => owners.value.length >= 2);
const candidates = computed(() => accounts.value.filter((account) => {
  // Owners are already protected assignments; every other platform account can
  // be selected for owner promotion or center-role assignment.
  if (account.adminLevel === "owner") return false;
  const query = candidateQuery.value.trim().toLocaleLowerCase();
  if (!query) return true;
  return [account.name, account.account, account.memberId]
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}));
const selectedCandidateAccount = computed(() => accounts.value.find(
  (account) => account.account === selectedCandidate.value
));

const actionLabels: Record<AdminQualificationChange | "demote-owner", string> = {
  grant: "授予中心负责人资格",
  revoke: "撤销管理员资格",
  enable: "启用管理员资格",
  disable: "停用管理员资格",
  "demote-owner": "撤销联盟总负责人资格"
};

function accessStatus(account: MockAccount) {
  if (account.adminLevel === "member") return "未配置";
  return account.adminAccessEnabled ? "已启用" : "已停用";
}

function availableAction(account: MockAccount): AdminQualificationChange | undefined {
  if (account.adminLevel === "member" || account.adminLevel === "owner") return undefined;
  return account.adminAccessEnabled ? "disable" : "enable";
}

function openAddDialog(kind: Exclude<QualificationDialog, null>) {
  qualificationDialog.value = kind;
  selectedCandidate.value = "";
  candidateQuery.value = "";
  selectedRole.value = ADMIN_CENTER_LEAD_LABELS[0];
}

function closeAddDialog() {
  qualificationDialog.value = null;
  selectedCandidate.value = "";
  candidateQuery.value = "";
}

function confirmAdd() {
  if (!actor.value || !selectedCandidateAccount.value) return;
  if (qualificationDialog.value === "owner") {
    access.promoteToOwner(selectedCandidateAccount.value.account, actor.value);
  } else if (qualificationDialog.value === "admin") {
    access.assignAdminCenterRole(selectedCandidateAccount.value.account, selectedRole.value, actor.value);
  }
  closeAddDialog();
}

function openConfirmation(account: MockAccount, requestedChange?: AdminQualificationChange | "demote-owner") {
  const change = requestedChange ?? availableAction(account);
  if (!change || account.adminLevel === "member") return;
  if (account.adminLevel === "owner" && account.account === session.currentAccount?.account) return;
  pendingChange.value = { account: account.account, name: account.name, change };
  nextTick(() => confirmButton.value?.focus());
}

function closeConfirmation() {
  pendingChange.value = null;
}

function confirmChange() {
  if (!pendingChange.value || !actor.value) return;
  if (pendingChange.value.change === "demote-owner") {
    access.demoteOwner(pendingChange.value.account, actor.value);
  } else {
    access.changeAdminQualification(pendingChange.value.account, pendingChange.value.change, actor.value);
  }
  closeConfirmation();
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page admin-qualification-page">
    <AdminPageHeading
      eyebrow="Administrator Access"
      title="管理员资格配置"
      description="联盟总负责人管理平台管理员资格。管理员可处理平台事务，但不能修改管理员资格配置。"
    />

    <section class="admin-list-card admin-owner-card">
      <header>
        <div><span>Protected Owners</span><h2>联盟总负责人</h2></div>
        <div class="admin-qualification-header-actions">
          <p>{{ owners.length }}/2 个负责人席位</p>
          <button
            class="button"
            type="button"
            :disabled="ownerLimitReached"
            @click="openAddDialog('owner')"
          >增设联盟总负责人</button>
        </div>
      </header>
      <div class="admin-owner-list">
        <article v-for="owner in owners" :key="owner.account">
          <div><strong>{{ owner.name }}</strong><small>{{ owner.account }}</small></div>
          <span class="admin-owner-lock">受保护 · 全平台事务与资格配置</span>
          <button
            v-if="owners.length > 1 && owner.account !== session.currentAccount?.account"
            type="button"
            class="admin-text-danger"
            @click="openConfirmation(owner, 'demote-owner')"
          >撤销负责人</button>
          <span v-else class="admin-owner-current">当前负责人</span>
        </article>
      </div>
    </section>

    <section class="admin-list-card">
      <header>
        <div><span>Center Administrators</span><h2>中心负责人管理员</h2></div>
        <div class="admin-qualification-header-actions">
          <p>{{ administrators.length }} 个管理员账号</p>
          <button class="button" type="button" @click="openAddDialog('admin')">添加管理员</button>
        </div>
      </header>
      <div class="admin-table-scroll">
        <table aria-label="管理员资格配置列表">
          <thead><tr><th>成员账号</th><th>管理级别</th><th>资格状态</th><th>配置人 / 时间</th><th>最近登录</th><th aria-label="资格操作"></th></tr></thead>
          <tbody>
            <tr v-for="account in administrators" :key="account.account">
              <td><strong>{{ account.name }}</strong><small>{{ account.account }}</small></td>
              <td>{{ getAdminQualificationLabel(account) }}</td>
              <td><AdminStatusPill :status="accessStatus(account)" /></td>
              <td><strong>{{ account.qualification?.configuredBy ?? "-" }}</strong><small>{{ account.qualification?.configuredAt ?? "-" }}</small></td>
              <td>{{ account.qualification?.lastLoginAt ?? "尚未登录" }}</td>
              <td class="admin-qualification-actions">
                <button type="button" @click="openConfirmation(account)">{{ actionLabels[availableAction(account)!] }}</button>
                <button type="button" class="admin-text-danger" @click="openConfirmation(account, 'revoke')">撤销资格</button>
              </td>
            </tr>
            <tr v-if="administrators.length === 0"><td colspan="6" class="admin-empty-row">当前没有中心负责人管理员</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="qualificationDialog" class="admin-drawer-backdrop admin-modal-center" @click.self="closeAddDialog" @keydown.esc="closeAddDialog">
        <section class="admin-system-confirm admin-qualification-dialog" :class="{ 'is-owner': qualificationDialog === 'owner' }" role="dialog" aria-modal="true" :aria-label="qualificationDialog === 'owner' ? '增设联盟总负责人' : '添加管理员'">
          <span>ADMINISTRATION ACCESS</span>
          <h2>{{ qualificationDialog === "owner" ? "增设联盟总负责人" : "添加管理员" }}</h2>
          <p>{{ qualificationDialog === "owner" ? "从平台全部用户中选择第二位联盟总负责人。负责人席位最多两人。" : "从平台全部用户中选择账号，并绑定一个中心负责人管理级别。" }}</p>
          <label class="admin-dialog-field">搜索平台用户<input v-model="candidateQuery" aria-label="搜索平台用户" type="search" placeholder="姓名、成员账号或成员编号" /></label>
          <div class="admin-candidate-list" role="listbox" aria-label="平台用户候选列表">
            <button
              v-for="candidate in candidates"
              :key="candidate.account"
              type="button"
              :aria-label="`选择 ${candidate.account}`"
              :class="{ 'is-selected': selectedCandidate === candidate.account }"
              :aria-selected="selectedCandidate === candidate.account"
              @click="selectedCandidate = candidate.account"
            ><span class="admin-candidate-name">{{ getAdminCandidateDisplay(candidate).name }}</span><span class="admin-candidate-affiliation">{{ getAdminCandidateDisplay(candidate).affiliation }}</span><span class="admin-candidate-identity">{{ getAdminCandidateDisplay(candidate).identity }}</span></button>
            <p v-if="candidates.length === 0" class="admin-empty-row">没有匹配的可选平台用户</p>
          </div>
          <label v-if="qualificationDialog === 'admin'" class="admin-dialog-field">管理级别<select v-model="selectedRole" aria-label="管理级别"><option v-for="role in ADMIN_CENTER_LEAD_LABELS" :key="role" :value="role">{{ role }}</option></select></label>
          <dl v-if="selectedCandidateAccount"><div><dt>已选账号</dt><dd>{{ selectedCandidateAccount.name }}（{{ selectedCandidateAccount.account }}）</dd></div><div v-if="qualificationDialog === 'admin'"><dt>当前归属</dt><dd>{{ selectedCandidateAccount.memberId }}</dd></div></dl>
          <footer><button type="button" class="button button--ghost" @click="closeAddDialog">取消</button><button type="button" class="button" :disabled="!selectedCandidateAccount" @click="confirmAdd">确认添加</button></footer>
        </section>
      </div>

      <div v-if="pendingChange" class="admin-drawer-backdrop admin-modal-center" @click.self="closeConfirmation" @keydown.esc="closeConfirmation">
        <section class="admin-system-confirm" role="alertdialog" aria-modal="true" aria-labelledby="qualification-confirm-title" aria-describedby="qualification-confirm-description">
          <span>ADMINISTRATION ACCESS</span>
          <h2 id="qualification-confirm-title">确认{{ actionLabels[pendingChange.change] }}？</h2>
          <p id="qualification-confirm-description">你将对 {{ pendingChange.name }} 的管理资格执行此操作。变更会立即影响其后续登录、导航和路由访问。</p>
          <dl><div><dt>操作</dt><dd>{{ actionLabels[pendingChange.change] }}</dd></div><div><dt>执行人</dt><dd>{{ session.currentAccount?.name ?? "-" }}</dd></div></dl>
          <footer><button type="button" class="button button--ghost" @click="closeConfirmation">取消</button><button ref="confirmButton" type="button" class="button" @click="confirmChange">确认变更</button></footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>
