<script setup lang="ts">
import {
  getPublicProfilePreview
} from "~/data/admin-members";
import { useMemberRepository } from "~/composables/useMemberRepository";
import { useMemberAdministrationStore } from "~/stores/member-administration";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { BAIZE_DIRECTION_LABELS, type BaizeDirectionCode } from "~/utils/baize-direction-label";
import { useSessionStore } from "~/stores/session";
import { getOrganizationPositionLabel } from "~/utils/organization-positions";
import { organizationMemberLabel } from "~/utils/organization-member-display";
import type { ProjectActionOption, OrganizationPositionAction } from "~/components/admin/OrganizationPositionActionDialog.vue";
import { buildAdminForbiddenTarget } from "~/utils/route-access";

definePageMeta({ layout: "admin" });
const route = useRoute();
const session = useSessionStore();
const memberAdministration = useMemberAdministrationStore();
const runtimeOrganizationGateway = useOrganizationGateway();
const canManageMemberDetails = computed(() => session.canManageAdminAccounts);
const organizationGateway = session.canManageAdminAccounts ? runtimeOrganizationGateway : undefined;
if (!session.canManageAdminAccounts) {
  void navigateTo(buildAdminForbiddenTarget(route.path), { replace: true });
}
if (organizationGateway) memberAdministration.activateApiMode();
const memberRepository = useMemberRepository();
const member = computed(() => memberRepository.findAdminMember(String(route.params.id)));
if (session.canManageAdminAccounts && !organizationGateway && !member.value) {
  throw createError({ statusCode: 404, statusMessage: "成员不存在" });
}
const preview = computed(() => getPublicProfilePreview(member.value!));
const publicPerson = computed(() => memberRepository.allPublicPeople.value.find((person) => (
  person.name === member.value?.name && person.centerName === member.value?.center
)));
const publicPreviewId = computed(() => publicPerson.value?.id);
const displayDuty = computed(() => member.value ? organizationMemberLabel(member.value) : "");
const activeTab = ref("internal");
const identityDraft = ref<NonNullable<typeof member.value>["identity"]>(member.value?.identity ?? "预备成员");
const showPromotionConfirm = ref(false);
const saveStatus = ref<"idle" | "saved" | "storage-error" | "not-eligible" | "api-error">("idle");
const identityChanged = computed(() => identityDraft.value !== member.value?.identity);
const promotionCenterId = ref("");
const promotionDuty = ref<"REGULAR" | "CORE">("REGULAR");
const promotionBaizeDirection = ref<BaizeDirectionCode | "">("");
const selectedPromotionCenter = computed(() => memberAdministration.apiCenters.find((center) => center.id === promotionCenterId.value));
const positions = computed(() => member.value ? memberAdministration.positionsForPerson(member.value.id) : []);
const canManagePositions = computed(() => Boolean(organizationGateway && session.canManageAdminAccounts && member.value?.identity === "正式成员"));
const projectOptions = ref<ProjectActionOption[]>([]);
const projectOptionsLoading = ref(false);
const projectOptionsError = ref("");
const positionAction = ref<OrganizationPositionAction | null>(null);
const handoverTargetId = ref("");
const handoverCandidates = computed(() => member.value ? memberAdministration.apiManagedMembers.filter((candidate) => (
  candidate.id !== member.value!.id
  && candidate.status === "FORMAL_MEMBER"
  && candidate.membership?.center.id === memberAdministration.apiManagedMembers.find((item) => item.id === member.value!.id)?.membership?.center.id
)) : []);

function openPositionAction(action: OrganizationPositionAction) {
  positionAction.value = action;
}
function closePositionAction() {
  if (!memberAdministration.apiLoading) positionAction.value = null;
}
async function loadProjectOptions() {
  if (!organizationGateway) return;
  projectOptionsLoading.value = true;
  projectOptionsError.value = "";
  try {
    const projects = await organizationGateway.listAdminProjects();
    projectOptions.value = projects.items.map((project) => ({
      id: project.id,
      title: project.title,
      status: project.status,
      lead: project.lead,
    }));
  } catch (cause) {
    projectOptions.value = [];
    projectOptionsError.value = cause instanceof Error && cause.message
      ? `项目目录加载失败：${cause.message}`
      : "项目目录加载失败，请刷新重试";
  } finally {
    projectOptionsLoading.value = false;
  }
}
async function confirmPositionAction(input: { projectId?: string }) {
  if (!member.value || !organizationGateway || !positionAction.value) return;
  const action = positionAction.value;
  const succeeded = action === "ALLIANCE_OWNER"
    ? await memberAdministration.appointAllianceOwnerFromApi(member.value.id, organizationGateway)
    : action === "CENTER_MINISTER"
      ? await memberAdministration.appointCenterMinisterFromApi(member.value.id, organizationGateway)
      : input.projectId
        ? await memberAdministration.grantProjectLeadFromApi(member.value.id, input.projectId, organizationGateway)
        : false;
  if (succeeded) {
    await loadProjectOptions();
    positionAction.value = null;
  }
}
async function revokeMinister(version: number) {
  if (!member.value || !organizationGateway) return;
  await memberAdministration.revokeCenterMinisterFromApi(member.value.id, version, organizationGateway);
}
async function handoverMinister(version: number) {
  if (!member.value || !organizationGateway || !handoverTargetId.value) return;
  await memberAdministration.handoverCenterMinisterFromApi(member.value.id, handoverTargetId.value, version, organizationGateway);
  handoverTargetId.value = "";
}
async function revokeAllianceOwner(version: number) {
  if (!member.value || !organizationGateway) return;
  await memberAdministration.revokeAllianceOwnerFromApi(member.value.id, version, organizationGateway);
}
async function revokeProjectLead(projectId: string | null, version: number) {
  if (!member.value || !organizationGateway || !projectId) return;
  await memberAdministration.revokeProjectLeadFromApi(member.value.id, projectId, version, organizationGateway);
}
async function toggleCoreMembership() {
  if (!member.value || !organizationGateway) return;
  await memberAdministration.setCoreMembershipFromApi(
    member.value.id,
    !(member.value.isCore ?? member.value.memberDuty === "核心人员"),
    organizationGateway,
  );
}

watch(() => member.value?.identity, (identity) => {
  if (identity) identityDraft.value = identity;
});

function requestSave() {
  saveStatus.value = "idle";
  if (!session.canManageAdminAccounts || !member.value || !identityChanged.value) {
    return;
  }

  if (member.value.identity === "预备成员" && identityDraft.value === "正式成员") {
    showPromotionConfirm.value = true;
    return;
  }

  identityDraft.value = member.value.identity;
  saveStatus.value = "not-eligible";
}

async function confirmPromotion() {
  if (!session.canManageAdminAccounts || !member.value) return;
  if (organizationGateway) {
    const result = await memberAdministration.promoteMemberToFormalFromApi(member.value.id, {
      centerId: promotionCenterId.value,
      duty: promotionDuty.value,
      ...(selectedPromotionCenter.value?.slug === "baize-development" && promotionBaizeDirection.value
        ? { baizeDirection: promotionBaizeDirection.value }
        : {}),
    }, organizationGateway);
    showPromotionConfirm.value = false;
    if (result.status === "success" || result.status === "already_formal") {
      identityDraft.value = "正式成员";
      saveStatus.value = "saved";
      return;
    }
    saveStatus.value = result.status === "api_error" ? "api-error" : "not-eligible";
    return;
  }
  const result = memberAdministration.promoteMemberToFormal(member.value.id);
  if (result.status === "success" || result.status === "already_formal") {
    showPromotionConfirm.value = false;
    identityDraft.value = "正式成员";
    saveStatus.value = "saved";
    return;
  }

  showPromotionConfirm.value = false;
  saveStatus.value = result.status === "storage_unavailable" ? "storage-error" : "not-eligible";
}
onMounted(async () => {
  if (organizationGateway) {
    await memberAdministration.refreshFromApi(organizationGateway);
    promotionCenterId.value ||= memberAdministration.apiCenters[0]?.id ?? "";
    await loadProjectOptions();
  }
});
useHead(() => ({ title: member.value ? `${member.value.name}｜成员管理｜HSD 管理台` : "成员管理｜HSD 管理台" }));
</script>

<template>
  <div v-if="canManageMemberDetails && member" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Member Record"
      :title="member.name"
      :description="`${member.studentId} · ${member.identity} · ${member.center}`"
    >
      <template #actions>
        <NuxtLink v-if="publicPreviewId" class="button button--ghost" :to="`/people/${publicPreviewId}`" target="_blank">预览公开页面</NuxtLink>
      </template>
    </AdminPageHeading>

    <div class="admin-member-detail-layout">
      <aside class="admin-member-profile-card">
        <div class="admin-member-avatar"><span>&lt; HSD &gt;</span><small>{{ preview.usesDefaultAvatar ? "默认公开头像" : "成员公开头像" }}</small></div>
        <h2>{{ member.name }}</h2>
        <p>{{ displayDuty }}</p>
        <dl>
          <div><dt>当前身份</dt><dd>{{ member.identity }}</dd></div>
          <div><dt>所属中心</dt><dd>{{ member.center }}</dd></div>
          <div><dt>成员职责</dt><dd>{{ displayDuty }}</dd></div>
          <div v-if="member.center === '白泽开发中心'"><dt>实践方向</dt><dd>{{ member.baizeDirection || "—" }}</dd></div>
        </dl>
      </aside>

      <section class="admin-member-detail-card">
        <div role="tablist" aria-label="成员资料分类" class="admin-detail-tabs">
          <button role="tab" :aria-selected="activeTab === 'internal'" @click="activeTab = 'internal'">内部资料</button>
          <button role="tab" :aria-selected="activeTab === 'public'" @click="activeTab = 'public'">公开资料</button>
          <button role="tab" :aria-selected="activeTab === 'growth'" @click="activeTab = 'growth'">成长与荣誉</button>
        </div>

        <div v-if="activeTab === 'internal'" class="admin-detail-form">
          <header><span>Internal Profile</span><h2>仅授权管理员可见</h2><p>联系方式、身份和中心归属不会进入公开页面。</p></header>
          <div class="admin-form-grid">
            <label>学号<input :value="member.studentId" readonly></label>
            <label>年级<input :value="member.grade" readonly></label>
            <label>当前身份<select v-model="identityDraft" :disabled="member.identity === '正式成员'"><option value="正式成员">正式成员</option><option value="预备成员">预备成员</option></select></label>
            <label>所属中心<select v-if="organizationGateway && member.identity === '预备成员'" v-model="promotionCenterId"><option value="">请选择中心</option><option v-for="center in memberAdministration.apiCenters" :key="center.id" :value="center.id">{{ center.name }}</option></select><input v-else :value="member.center" readonly></label>
            <label>成员职责<select v-if="organizationGateway && member.identity === '预备成员'" v-model="promotionDuty"><option value="REGULAR">普通成员</option><option value="CORE">核心人员</option></select><input v-else :value="member.memberDuty" readonly></label>
            <label v-if="organizationGateway && member.identity === '预备成员' && selectedPromotionCenter?.slug === 'baize-development'">实践方向<select v-model="promotionBaizeDirection"><option value="">请选择实践方向</option><option v-for="(label, code) in BAIZE_DIRECTION_LABELS" :key="code" :value="code">{{ label }}</option></select></label>
            <label>手机号<input value="138 **** 8899" readonly></label>
            <label>账号状态<select value="正常" disabled><option>正常</option><option>停用</option></select></label>
          </div>
        </div>

        <div v-else-if="activeTab === 'public'" class="admin-detail-form">
          <header><span>Public Profile</span><h2>公开页面展示内容</h2><p>正式成员的姓名、头像、中心、职责、白泽实践方向和个人简介默认公开；未上传头像时输出白底 HSD 默认头像。</p></header>
          <div class="admin-form-grid">
            <label>公开名称<input :value="member.name" readonly></label>
            <label>公开职责<input :value="displayDuty" readonly></label>
            <label v-if="member.center === '白泽开发中心'">实践方向<input :value="member.baizeDirection || '—'" readonly></label>
            <label class="is-wide">个人介绍<textarea rows="5" :value="member.profileSummary" readonly></textarea></label>
            <label>头像展示<input :value="preview.usesDefaultAvatar ? '未上传，使用默认 HSD 头像' : '已上传，自动公开'" readonly></label>
          </div>
        </div>

        <div v-else class="admin-detail-form">
          <header><span>Growth & Honors</span><h2>项目、活动与公开荣誉</h2><p>公开荣誉必须审核通过且由成员选择公开。</p></header>
          <div class="admin-timeline-list">
            <article><span>项目实践</span><strong>智巡先锋 · HarmonyOS 应用联调</strong><small>2026.07 · 已确认</small></article>
            <article><span>技术活动</span><strong>HarmonyOS 原生开发训练营</strong><small>2026.06 · 已参加</small></article>
            <article><span>个人荣誉</span><strong>HarmonyOS 创新赛校级一等奖</strong><small>待审核 · 成员选择公开</small></article>
          </div>
        </div>

        <section v-if="organizationGateway" class="admin-detail-form">
          <header><span>Organization Positions</span><h2>组织职务</h2><p>正式成员所属中心只读；冲突后会刷新权威数据。</p></header>
          <p v-if="positions.length">{{ positions.map((position) => getOrganizationPositionLabel(position.type)).join("、") }}</p>
          <p v-else>暂无组织职务</p>
          <p v-if="projectOptionsLoading" class="admin-inline-note" role="status">正在加载项目目录…</p>
          <div v-else-if="projectOptionsError" class="admin-position-dialog__empty" role="alert">
            <span>{{ projectOptionsError }}</span>
            <button type="button" class="button button--ghost" :disabled="memberAdministration.apiLoading" @click="loadProjectOptions">重新加载项目目录</button>
          </div>
          <div v-if="canManagePositions" class="admin-position-actions">
            <button type="button" class="button button--ghost" :disabled="memberAdministration.apiLoading" @click="toggleCoreMembership">{{ (member.isCore ?? member.memberDuty === '核心人员') ? '降为普通成员' : '设为核心成员' }}</button>
            <button v-if="!positions.some((item) => item.type === 'ALLIANCE_OWNER')" type="button" class="button" :disabled="memberAdministration.apiLoading" @click="openPositionAction('ALLIANCE_OWNER')">任命联盟负责人</button>
            <button v-for="position in positions.filter((item) => item.type === 'ALLIANCE_OWNER')" :key="position.id" type="button" class="button button--ghost" :disabled="memberAdministration.apiLoading" @click="revokeAllianceOwner(position.version)">撤销联盟负责人</button>
            <button v-if="!positions.some((item) => item.type === 'CENTER_MINISTER')" type="button" class="button" :disabled="memberAdministration.apiLoading" @click="openPositionAction('CENTER_MINISTER')">任命为部长</button>
            <button v-for="position in positions.filter((item) => item.type === 'CENTER_MINISTER')" :key="position.id" type="button" class="button button--ghost" :disabled="memberAdministration.apiLoading" @click="revokeMinister(position.version)">撤销部长</button>
            <label v-if="positions.some((item) => item.type === 'CENTER_MINISTER')">部长交接<select v-model="handoverTargetId"><option value="">选择同中心正式成员</option><option v-for="candidate in handoverCandidates" :key="candidate.id" :value="candidate.id">{{ candidate.name }}</option></select></label>
            <button v-if="handoverTargetId && positions.some((item) => item.type === 'CENTER_MINISTER')" type="button" class="button button--ghost" :disabled="memberAdministration.apiLoading" @click="handoverMinister(positions.find((item) => item.type === 'CENTER_MINISTER')!.version)">确认交接</button>
            <button type="button" class="button" :disabled="memberAdministration.apiLoading" @click="openPositionAction('PROJECT_LEAD')">授予项目负责人</button>
            <button v-for="position in positions.filter((item) => item.type === 'PROJECT_LEAD')" :key="position.id" type="button" class="button button--ghost" :disabled="memberAdministration.apiLoading || !position.projectId" @click="revokeProjectLead(position.projectId, position.version)">撤销项目负责人{{ projectOptions.find((project) => project.id === position.projectId)?.title ? `（${projectOptions.find((project) => project.id === position.projectId)?.title}）` : '' }}</button>
          </div>
          <p v-if="memberAdministration.apiError" class="member-profile-error" role="alert">{{ memberAdministration.apiError.message }}</p>
        </section>

        <footer>
          <span v-if="saveStatus === 'saved'" class="admin-member-save-status" role="status">资料已保存并同步成员目录</span>
          <span v-else-if="saveStatus === 'storage-error'" class="admin-member-save-status is-error" role="alert">浏览器存储暂不可用，未保存身份变更</span>
          <span v-else-if="saveStatus === 'not-eligible'" class="admin-member-save-status is-error" role="alert">仅支持预备成员转为正式成员</span>
          <span v-else-if="saveStatus === 'api-error'" class="admin-member-save-status is-error" role="alert">{{ memberAdministration.apiError?.message || "正式成员身份转换失败，请刷新后重试" }}</span>
          <span v-else>最后更新：{{ member.updatedAt }} · {{ organizationGateway ? "API 实时数据" : "Mock 会话" }}</span>
          <button type="button" class="button" @click="requestSave">保存资料</button>
        </footer>
      </section>
    </div>

    <div v-if="showPromotionConfirm" class="admin-modal-backdrop" @click.self="showPromotionConfirm = false">
      <section role="alertdialog" aria-modal="true" aria-labelledby="identity-title">
        <span>Identity Change</span>
        <h2 id="identity-title">确认转为正式成员？</h2>
        <p>保存后将复用现有成员帐号，写入正式成员档案，并同步成员空间、中心关系和公开成员目录；不会创建新帐号、重置密码或修改管理员资格。</p>
        <div><button type="button" class="button button--ghost" @click="showPromotionConfirm = false">返回检查</button><button type="button" class="button" :disabled="memberAdministration.apiLoading" @click="confirmPromotion">确认保存</button></div>
      </section>
    </div>

    <AdminOrganizationPositionActionDialog
      :open="Boolean(positionAction)"
      :action="positionAction || 'PROJECT_LEAD'"
      :member-name="member.name"
      :projects="projectOptions"
      :busy="memberAdministration.apiLoading"
      :error="memberAdministration.apiError?.message || ''"
      :projects-error="positionAction === 'PROJECT_LEAD' ? projectOptionsError : ''"
      @close="closePositionAction"
      @retry-projects="loadProjectOptions"
      @confirm="confirmPositionAction"
    />
  </div>
  <p v-else-if="canManageMemberDetails && memberAdministration.apiLoading" class="admin-empty-row" role="status">正在同步成员资料…</p>
  <p v-else-if="canManageMemberDetails && memberAdministration.apiError" class="member-profile-error" role="alert">{{ memberAdministration.apiError.message }}</p>
  <p v-else-if="canManageMemberDetails && organizationGateway" class="member-profile-error" role="alert">成员不存在或当前帐号无权查看。</p>
</template>
