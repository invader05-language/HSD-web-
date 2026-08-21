<script setup lang="ts">
import type { AdminMember } from "~/data/admin-members";
import { useMemberRepository } from "~/composables/useMemberRepository";
import { useMemberAdministrationStore } from "~/stores/member-administration";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { organizationMemberLabel } from "~/utils/organization-member-display";

definePageMeta({ layout: "admin" });
useHead({ title: "核心人员配置｜HSD 管理台" });

const memberAdministration = useMemberAdministrationStore();
const organizationGateway = useOrganizationGateway();
if (organizationGateway) memberAdministration.activateApiMode();
const memberRepository = useMemberRepository();
const showAddDialog = ref(false);
const selectedMemberId = ref("");
const candidateQuery = ref("");
const addStatus = ref<"idle" | "storage-error" | "api-error">("idle");

onMounted(async () => {
  if (organizationGateway) await memberAdministration.refreshFromApi(organizationGateway);
});

function isDerivedCore(member: AdminMember) {
  return member.isCore ?? member.memberDuty === "核心人员";
}

const coreMembers = computed(() => memberRepository.adminMembers.value
  .filter((member) => member.identity === "正式成员" && isDerivedCore(member))
  .sort((left, right) => memberRepository.adminMembers.value.indexOf(left)
    - memberRepository.adminMembers.value.indexOf(right)));

const candidates = computed(() => {
  const query = candidateQuery.value.trim().toLocaleLowerCase();
  return memberRepository.adminMembers.value.filter((member) => {
    if (member.identity !== "正式成员" || isDerivedCore(member)) return false;
    return !query || [member.name, member.studentId, member.center, member.memberDuty]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });
});

const selectedMember = computed(() => candidates.value.find((member) => member.id === selectedMemberId.value));

function coreLabel(member: AdminMember) {
  return organizationMemberLabel(member);
}

function openAddDialog() {
  selectedMemberId.value = "";
  candidateQuery.value = "";
  addStatus.value = "idle";
  showAddDialog.value = true;
}

function closeAddDialog() {
  showAddDialog.value = false;
  selectedMemberId.value = "";
  candidateQuery.value = "";
  addStatus.value = "idle";
}

async function confirmAdd() {
  if (!selectedMember.value) return;
  const result = organizationGateway
    ? await memberAdministration.promoteFormalMemberToCoreFromApi(selectedMember.value.id, organizationGateway)
    : memberAdministration.promoteFormalMemberToCore(selectedMember.value.id);
  if (result.status === "storage_unavailable") {
    addStatus.value = "storage-error";
    return;
  }
  if (result.status === "api_error") {
    addStatus.value = "api-error";
    return;
  }
  if (result.status === "success" || result.status === "already_core") closeAddDialog();
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Core People"
      title="核心人员配置"
      description="核心成员由成员等级单独维护；可从其他正式成员中添加，不改变其帐号、组织职务或管理员资格。"
    >
      <template #actions><button class="button" type="button" @click="openAddDialog">添加核心人员</button></template>
    </AdminPageHeading>

    <p v-if="memberAdministration.apiLoading" class="admin-empty-row" role="status">正在同步核心人员…</p>
    <p v-else-if="memberAdministration.apiError" class="member-profile-error" role="alert">{{ memberAdministration.apiError.message }}</p>

    <section class="admin-list-card">
      <header><div><span>Core Members</span><h2>核心人员名单</h2></div><p>共 {{ coreMembers.length }} 人</p></header>
      <div class="admin-owner-list admin-core-member-list" role="list" aria-label="核心人员名单">
        <article v-for="person in coreMembers" :key="person.id" role="listitem">
          <div><strong>{{ person.name }}</strong><small>{{ person.center }}</small></div>
          <AdminStatusPill :status="coreLabel(person)" />
        </article>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showAddDialog" class="admin-drawer-backdrop admin-modal-center" @click.self="closeAddDialog" @keydown.esc="closeAddDialog">
        <section class="admin-system-confirm admin-qualification-dialog admin-core-member-dialog" role="dialog" aria-modal="true" aria-label="添加核心人员">
          <span>CORE MEMBERSHIP</span>
          <h2>添加核心人员</h2>
          <p>从尚未成为核心人员的正式成员中选择。确认后只更新成员职责，不创建帐号，也不修改管理员资格。</p>
          <label class="admin-dialog-field">搜索正式成员<input v-model="candidateQuery" type="search" placeholder="姓名、学号或所属中心"></label>
          <div class="admin-candidate-list" role="listbox" aria-label="可添加的正式成员">
            <button
              v-for="candidate in candidates"
              :key="candidate.id"
              type="button"
              :aria-label="`选择 ${candidate.name}`"
              :aria-selected="selectedMemberId === candidate.id"
              :class="{ 'is-selected': selectedMemberId === candidate.id }"
              @click="selectedMemberId = candidate.id"
            >
              <span class="admin-candidate-name">{{ candidate.name }}</span>
              <span class="admin-candidate-affiliation">{{ candidate.center }}</span>
              <span class="admin-candidate-identity">{{ candidate.memberDuty }}</span>
            </button>
            <p v-if="candidates.length === 0" class="admin-empty-row">没有可添加的正式成员</p>
          </div>
          <p v-if="addStatus === 'storage-error'" class="member-profile-error" role="alert">浏览器存储暂不可用，未添加核心人员。</p>
          <p v-else-if="addStatus === 'api-error'" class="member-profile-error" role="alert">{{ memberAdministration.apiError?.message ?? "核心人员更新失败，请刷新后重试。" }}</p>
          <footer>
            <button type="button" class="button button--ghost" @click="closeAddDialog">取消</button>
            <button type="button" class="button" :disabled="!selectedMember || memberAdministration.apiLoading" @click="confirmAdd">确认添加</button>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>
