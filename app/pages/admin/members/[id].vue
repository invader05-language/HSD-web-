<script setup lang="ts">
import {
  getPublicProfilePreview
} from "~/data/admin-members";
import { useMemberRepository } from "~/composables/useMemberRepository";
import { useMemberAdministrationStore } from "~/stores/member-administration";

definePageMeta({ layout: "admin" });
const route = useRoute();
const memberRepository = useMemberRepository();
const memberAdministration = useMemberAdministrationStore();
const member = computed(() => memberRepository.findAdminMember(String(route.params.id)));
if (!member.value) {
  throw createError({ statusCode: 404, statusMessage: "成员不存在" });
}
const preview = computed(() => getPublicProfilePreview(member.value!));
const publicPerson = computed(() => memberRepository.allPublicPeople.value.find((person) => (
  person.name === member.value?.name && person.centerName === member.value?.center
)));
const publicPreviewId = computed(() => publicPerson.value?.id);
const displayDuty = computed(() => member.value?.centerLeadership
  ? "核心人员 · 中心负责人"
  : member.value?.memberDuty);
const activeTab = ref("internal");
const identityDraft = ref<NonNullable<typeof member.value>["identity"]>(member.value.identity);
const showPromotionConfirm = ref(false);
const saveStatus = ref<"idle" | "saved" | "storage-error" | "not-eligible">("idle");
const identityChanged = computed(() => identityDraft.value !== member.value?.identity);

watch(() => member.value?.identity, (identity) => {
  if (identity) identityDraft.value = identity;
});

function requestSave() {
  saveStatus.value = "idle";
  if (!member.value || !identityChanged.value) {
    return;
  }

  if (member.value.identity === "预备成员" && identityDraft.value === "正式成员") {
    showPromotionConfirm.value = true;
    return;
  }

  identityDraft.value = member.value.identity;
  saveStatus.value = "not-eligible";
}

function confirmPromotion() {
  if (!member.value) return;
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
useHead({ title: `${member.value.name}｜成员管理｜HSD 管理台` });
</script>

<template>
  <div v-if="member" class="admin-recruitment-page admin-section-page">
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
            <label>所属中心<select :value="member.center" disabled><option>白泽开发中心</option><option>新媒体中心</option><option>拓维策划中心</option><option>人才发展中心</option></select></label>
            <label>成员职责<select :value="member.memberDuty" disabled><option>普通成员</option><option>核心人员</option></select></label>
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

        <footer>
          <span v-if="saveStatus === 'saved'" class="admin-member-save-status" role="status">资料已保存并同步成员目录</span>
          <span v-else-if="saveStatus === 'storage-error'" class="admin-member-save-status is-error" role="alert">浏览器存储暂不可用，未保存身份变更</span>
          <span v-else-if="saveStatus === 'not-eligible'" class="admin-member-save-status is-error" role="alert">仅支持预备成员转为正式成员</span>
          <span v-else>最后更新：{{ member.updatedAt }} · Mock 会话</span>
          <button type="button" class="button" @click="requestSave">保存资料</button>
        </footer>
      </section>
    </div>

    <div v-if="showPromotionConfirm" class="admin-modal-backdrop" @click.self="showPromotionConfirm = false">
      <section role="alertdialog" aria-modal="true" aria-labelledby="identity-title">
        <span>Identity Change</span>
        <h2 id="identity-title">确认转为正式成员？</h2>
        <p>保存后将复用现有成员帐号，写入正式成员档案，并同步成员空间、中心关系和公开成员目录；不会创建新帐号、重置密码或修改管理员资格。</p>
        <div><button type="button" class="button button--ghost" @click="showPromotionConfirm = false">返回检查</button><button type="button" class="button" @click="confirmPromotion">确认保存</button></div>
      </section>
    </div>
  </div>
</template>
