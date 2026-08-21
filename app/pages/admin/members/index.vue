<script setup lang="ts">
import {
  filterAdminMembers,
  type AdminMemberFilters
} from "~/data/admin-members";
import { useMemberRepository } from "~/composables/useMemberRepository";
import { useMemberAdministrationStore } from "~/stores/member-administration";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { hasOrganizationPosition, organizationMemberLabel } from "~/utils/organization-member-display";
import {
  BAIZE_DIRECTIONS,
  DEFAULT_FORMAL_MEMBER_PASSWORD,
  MEMBER_DUTIES,
  RECRUITMENT_CENTERS,
  type CreateFormalMemberErrors,
  type CreateFormalMemberInput
} from "~/utils/member-account-form";

definePageMeta({ layout: "admin" });
useHead({ title: "全体成员｜HSD 管理台" });

const filters = reactive<AdminMemberFilters>({
  query: "",
  center: "全部中心",
  identity: "全部身份"
});
const memberAdministration = useMemberAdministrationStore();
const organizationGateway = useOrganizationGateway();
if (organizationGateway) memberAdministration.activateApiMode();
const memberRepository = useMemberRepository();
const route = useRoute();
const adminMembers = memberRepository.adminMembers;
const visible = computed(() => filterAdminMembers(adminMembers.value, filters));
const formalCount = computed(() => adminMembers.value.filter((member) => member.identity === "正式成员").length);
const coreCount = computed(() => adminMembers.value.filter((member) => (
  member.identity === "正式成员"
  && (member.isCore ?? member.memberDuty === "核心人员")
)).length);
const centerLeadCount = computed(() => adminMembers.value.filter((member) => (
  hasOrganizationPosition(member, "CENTER_MINISTER")
)).length);
const showCreateMember = ref(false);
const createErrors = reactive<CreateFormalMemberErrors>({});
const createStatus = ref<"idle" | "duplicate" | "storage-error" | "api-error">("idle");

function createEmptyMember(): CreateFormalMemberInput {
  return {
    name: "",
    studentId: "",
    grade: "",
    className: "",
    center: "白泽开发中心",
    memberDuty: "普通成员",
    baizeDirection: undefined,
    bio: "",
    avatarUrl: undefined
  };
}

const createMember = reactive<CreateFormalMemberInput>(createEmptyMember());

function resetCreateMember() {
  Object.assign(createMember, createEmptyMember());
  for (const key of Object.keys(createErrors) as (keyof CreateFormalMemberErrors)[]) {
    delete createErrors[key];
  }
  createStatus.value = "idle";
}

function openCreateMember() {
  resetCreateMember();
  showCreateMember.value = true;
}

function closeCreateMember() {
  showCreateMember.value = false;
  resetCreateMember();
}

async function submitCreateMember() {
  for (const key of Object.keys(createErrors) as (keyof CreateFormalMemberErrors)[]) {
    delete createErrors[key];
  }
  createStatus.value = "idle";
  const result = organizationGateway
    ? await memberAdministration.createFormalMemberFromApi(createMember, organizationGateway)
    : memberAdministration.createFormalMember(createMember);
  if (result.status === "invalid_input") {
    Object.assign(createErrors, result.errors);
    return;
  }
  if (result.status === "duplicate_student_id") {
    createStatus.value = "duplicate";
    return;
  }
  if (result.status === "storage_unavailable") {
    createStatus.value = "storage-error";
    return;
  }
  if (result.status === "api_error") {
    createStatus.value = "api-error";
    return;
  }
  closeCreateMember();
}

watch(showCreateMember, (open) => {
  if (typeof document !== "undefined") {
    document.body.classList.toggle("is-admin-drawer-open", open);
  }
});

watch(() => createMember.center, (center) => {
  if (center !== "白泽开发中心") createMember.baizeDirection = undefined;
});

onMounted(async () => {
  if (organizationGateway) await memberAdministration.refreshFromApi(organizationGateway);
  if (route.query.create === "member") openCreateMember();
});

onBeforeUnmount(() => {
  if (typeof document !== "undefined") document.body.classList.remove("is-admin-drawer-open");
});
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Member Directory"
      title="全体成员"
      description="集中维护成员身份与中心归属。正式成员的基础展示资料默认公开，学号、班级、联系方式、报名和考核信息始终保持内部可见。"
    >
      <template #actions><button type="button" class="button" @click="openCreateMember">添加成员</button></template>
    </AdminPageHeading>

    <section class="admin-summary-strip" aria-label="成员概览">
      <div><span>全部成员</span><strong>{{ adminMembers.length }}</strong><small>{{ organizationGateway ? "API 实时名单" : "Mock 演示名单" }}</small></div>
      <div><span>正式成员</span><strong>{{ formalCount }}</strong><small>默认进入公开名录</small></div>
      <div><span>核心人员</span><strong>{{ coreCount }}</strong><small>由成员等级决定</small></div>
      <div><span>部长</span><strong>{{ centerLeadCount }}</strong><small>由组织职务决定</small></div>
    </section>

    <p v-if="memberAdministration.apiLoading" class="admin-empty-row" role="status">正在同步成员组织数据…</p>
    <p v-else-if="memberAdministration.apiError" class="member-profile-error" role="alert">{{ memberAdministration.apiError.message }}</p>

    <section class="admin-list-card">
      <header><div><span>Member Management</span><h2>成员管理名单</h2></div><p>共 {{ visible.length }} 人</p></header>
      <div class="admin-filters">
        <label>搜索成员<input v-model="filters.query" type="search" placeholder="姓名或学号"></label>
        <label>所属中心<select v-model="filters.center"><option>全部中心</option><option>白泽开发中心</option><option>新媒体中心</option><option>拓维策划中心</option><option>人才发展中心</option></select></label>
        <label>当前身份<select v-model="filters.identity"><option>全部身份</option><option>正式成员</option><option>预备成员</option></select></label>
      </div>
      <div class="admin-table-scroll">
        <table aria-label="成员管理名单">
          <thead><tr><th>成员</th><th>身份</th><th>中心</th><th>成员职责</th><th>实践方向</th><th>年级</th><th>更新时间</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>
            <tr v-for="member in visible" :key="member.id">
              <td><strong>{{ member.name }}</strong><small>{{ member.studentId }}</small></td>
              <td><AdminStatusPill :status="member.identity" /></td>
              <td>{{ member.center }}</td>
              <td>{{ organizationMemberLabel(member) }}</td>
              <td>{{ member.center === "白泽开发中心" ? (member.baizeDirection || "—") : "—" }}</td>
              <td>{{ member.grade }}</td>
              <td>{{ member.updatedAt }}</td>
              <td><NuxtLink :to="`/admin/members/${member.id}`" :aria-label="`查看成员 ${member.name}`">查看详情</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="showCreateMember"
        class="admin-drawer-backdrop"
        @click.self="closeCreateMember"
        @keydown.esc="closeCreateMember"
      >
        <aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="添加正式成员">
          <header class="admin-drawer__header">
            <div><span>MEMBER ACCOUNT</span><h2>添加成员</h2><p>创建新的正式成员帐号与公开成员资料</p></div>
            <button type="button" aria-label="关闭添加成员面板" @click="closeCreateMember">×</button>
          </header>
          <form class="admin-drawer__body" novalidate @submit.prevent="submitCreateMember">
            <section>
              <header><span>01</span><h3>帐号与身份</h3></header>
              <p class="admin-inline-note">身份固定为“正式成员”。登录帐号使用学号，初始密码为 {{ DEFAULT_FORMAL_MEMBER_PASSWORD }}，首次登录必须修改密码。</p>
              <div class="admin-form-grid">
                <label>姓名<input v-model="createMember.name" type="text" autocomplete="off" :aria-invalid="Boolean(createErrors.name)"><small v-if="createErrors.name" class="member-profile-error">{{ createErrors.name }}</small></label>
                <label>学号 / 登录帐号<input v-model="createMember.studentId" type="text" inputmode="numeric" autocomplete="off" :aria-invalid="Boolean(createErrors.studentId)"><small v-if="createErrors.studentId" class="member-profile-error">{{ createErrors.studentId }}</small></label>
                <label>年级<input v-model="createMember.grade" type="text" placeholder="例如：2026 级" :aria-invalid="Boolean(createErrors.grade)"><small v-if="createErrors.grade" class="member-profile-error">{{ createErrors.grade }}</small></label>
                <label>班级<input v-model="createMember.className" type="text" placeholder="例如：软件工程 1 班" :aria-invalid="Boolean(createErrors.className)"><small v-if="createErrors.className" class="member-profile-error">{{ createErrors.className }}</small></label>
              </div>
            </section>
            <section>
              <header><span>02</span><h3>组织资料</h3></header>
              <div class="admin-form-grid">
                <label>所属中心<select v-model="createMember.center" :aria-invalid="Boolean(createErrors.center)"><option v-for="center in RECRUITMENT_CENTERS" :key="center" :value="center">{{ center }}</option></select><small v-if="createErrors.center" class="member-profile-error">{{ createErrors.center }}</small></label>
                <label>成员职责<select v-model="createMember.memberDuty" :aria-invalid="Boolean(createErrors.memberDuty)"><option v-for="duty in MEMBER_DUTIES" :key="duty" :value="duty">{{ duty }}</option></select><small v-if="createErrors.memberDuty" class="member-profile-error">{{ createErrors.memberDuty }}</small></label>
                <label v-if="createMember.center === '白泽开发中心'" class="is-wide">实践方向<select v-model="createMember.baizeDirection" :aria-invalid="Boolean(createErrors.baizeDirection)"><option :value="undefined" disabled>请选择实践方向</option><option v-for="direction in BAIZE_DIRECTIONS" :key="direction" :value="direction">{{ direction }}</option></select><small v-if="createErrors.baizeDirection" class="member-profile-error">{{ createErrors.baizeDirection }}</small></label>
              </div>
            </section>
            <section>
              <header><span>03</span><h3>公开资料（选填）</h3></header>
              <div class="admin-form-grid">
                <label class="is-wide">头像地址<input v-model="createMember.avatarUrl" type="url" placeholder="可留空，使用默认头像"></label>
                <label class="is-wide">个人简介<textarea v-model="createMember.bio" rows="4" placeholder="可留空，成员后续可自行完善"></textarea></label>
              </div>
              <p v-if="createStatus === 'duplicate'" class="member-profile-error" role="alert">该学号已存在，不能重复创建帐号。</p>
              <p v-else-if="createStatus === 'storage-error'" class="member-profile-error" role="alert">浏览器存储暂不可用，未创建任何帐号或成员资料。</p>
              <p v-else-if="createStatus === 'api-error'" class="member-profile-error" role="alert">{{ memberAdministration.apiError?.message ?? "成员创建失败，请刷新后重试。" }}</p>
            </section>
          </form>
          <footer class="admin-drawer__footer">
            <span>保存后帐号和正式成员资料会同时生效</span>
            <button type="button" class="button button--ghost" @click="closeCreateMember">取消</button>
            <button type="button" class="button" :disabled="memberAdministration.apiLoading" @click="submitCreateMember">确认添加</button>
          </footer>
        </aside>
      </div>
    </Teleport>
  </div>
</template>
