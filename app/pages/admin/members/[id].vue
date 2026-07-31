<script setup lang="ts">
import {
  getPublicProfilePreview
} from "~/data/admin-members";
import { useMemberRepository } from "~/composables/useMemberRepository";

definePageMeta({ layout: "admin" });
const route = useRoute();
const memberRepository = useMemberRepository();
const member = computed(() => memberRepository.findAdminMember(String(route.params.id)));
if (!member.value) {
  throw createError({ statusCode: 404, statusMessage: "成员不存在" });
}
const preview = computed(() => getPublicProfilePreview(member.value!));
const publicPreviewId = computed(() =>
  member.value?.id === memberRepository.currentProfile.value.id
    ? memberRepository.currentProfile.value.publicId
    : member.value?.id.replace("member-", "person-")
);
const activeTab = ref("internal");
const showIdentityConfirm = ref(false);
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
        <NuxtLink class="button button--ghost" :to="`/people/${publicPreviewId}`" target="_blank">预览公开页面</NuxtLink>
        <button type="button" class="button" @click="showIdentityConfirm = true">调整身份</button>
      </template>
    </AdminPageHeading>

    <div class="admin-member-detail-layout">
      <aside class="admin-member-profile-card">
        <div class="admin-member-avatar"><span>&lt; HSD &gt;</span><small>{{ preview.usesDefaultAvatar ? "默认公开头像" : "成员公开头像" }}</small></div>
        <h2>{{ member.name }}</h2>
        <p>{{ member.role }}</p>
        <dl>
          <div><dt>当前身份</dt><dd>{{ member.identity }}</dd></div>
          <div><dt>所属中心</dt><dd>{{ member.center }}</dd></div>
          <div><dt>实践方向</dt><dd>{{ member.direction }}</dd></div>
          <div><dt>公开状态</dt><dd>{{ member.publicState }}</dd></div>
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
            <label>学号<input :value="member.studentId"></label>
            <label>年级<input :value="member.grade"></label>
            <label>当前身份<select :value="member.identity"><option>正式成员</option><option>预备成员</option><option>核心成员</option></select></label>
            <label>所属中心<select :value="member.center"><option>白泽开发中心</option><option>新媒体中心</option><option>拓维策划中心</option><option>人才发展中心</option></select></label>
            <label>手机号<input value="138 **** 8899"></label>
            <label>账号状态<select><option>正常</option><option>停用</option></select></label>
          </div>
        </div>

        <div v-else-if="activeTab === 'public'" class="admin-detail-form">
          <header><span>Public Profile</span><h2>公开页面展示内容</h2><p>头像不公开时只输出白底 HSD 默认头像。</p></header>
          <div class="admin-form-grid">
            <label>公开名称<input :value="member.name"></label>
            <label>公开职责<input :value="member.role"></label>
            <label class="is-wide">个人介绍<textarea rows="5" :value="member.profileSummary"></textarea></label>
            <label>头像公开<select :value="member.avatarVisible ? '公开' : '使用默认头像'"><option>公开</option><option>使用默认头像</option></select></label>
            <label>资料状态<select :value="member.publicState"><option>已公开</option><option>未公开</option><option>资料待审核</option></select></label>
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

        <footer><span>最后更新：{{ member.updatedAt }} · Mock 会话</span><button type="button" class="button">保存资料</button></footer>
      </section>
    </div>

    <div v-if="showIdentityConfirm" class="admin-modal-backdrop">
      <section role="alertdialog" aria-modal="true" aria-labelledby="identity-title">
        <span>Identity Change</span>
        <h2 id="identity-title">确认修改成员身份？</h2>
        <p>该操作会影响成员空间、中心归属、公开成员数据来源和管理权限范围。</p>
        <div><button class="button button--ghost" @click="showIdentityConfirm = false">返回检查</button><button class="button" @click="showIdentityConfirm = false">确认修改</button></div>
      </section>
    </div>
  </div>
</template>
