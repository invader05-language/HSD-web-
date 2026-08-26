<script setup lang="ts">
import MemberSpaceNav from "~/components/member/MemberSpaceNav.vue";
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import { useMemberRepository } from "~/composables/useMemberRepository";
import { useRecruitmentApplicationStore } from "~/stores/recruitment-application";
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { createProductionMemberProfileController } from "~/composables/useProductionMemberProfile";

useHead({ title: "成员空间｜白云 HSD 开发者部落" });
const session = useSessionStore();
const sessionGateway = useSessionGateway();
const apiRuntime = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
const isMockApi = apiRuntime.public.useMockApi;
const memberRepository = isMockApi ? useMemberRepository() : undefined;
const applicationStore = isMockApi ? useRecruitmentApplicationStore() : undefined;
const recruitmentGateway = useRecruitmentGateway();
const productionProfile = recruitmentGateway
  ? createProductionMemberProfileController({ gateway: recruitmentGateway, apiBase: apiRuntime.public.apiBase })
  : undefined;
const profile = computed(() => isMockApi ? memberRepository?.currentProfile.value : productionProfile?.profile.value);
const profileAvatarSource = computed(() => isMockApi ? profile.value?.avatarUrl : productionProfile?.avatarSource.value);
const memberStatus = computed(() => applicationStore?.memberStatus);
const profileLoading = computed(() => productionProfile?.status.value === "loading");
const profileError = computed(() => productionProfile?.error.value ?? "");

onMounted(() => {
  if (!isMockApi) void productionProfile?.load();
});

async function signOut() {
  if (await session.signOutForRuntime(apiRuntime.public, sessionGateway)) {
    await navigateTo("/");
  }
}
</script>

<template>
  <div v-if="profile" class="member-space">
    <MemberSpaceNav :profile="profile" :avatar-src="profileAvatarSource" active="overview" :signing-out="session.isSigningOut" :sign-out-error="session.signOutError" @sign-out="signOut" />
    <main id="overview">
      <p class="eyebrow">成员中心</p><h1>你好，{{ profile.name }}</h1><p>这里集中展示与你个人相关的信息；公开内容仍可从官网导航直接访问。</p>
      <div class="member-dashboard">
        <section id="application"><span>申请进度</span><h2>2026 招新申请</h2><NuxtLink class="text-link" to="/member/applications">查看申请进度 →</NuxtLink><template v-if="isMockApi"><strong>{{ applicationStore?.isSubmitted ? "已提交" : "未报名" }}</strong><p>{{ applicationStore?.isSubmitted ? "当前为预备成员，所属中心和组织职务将在后续结果中确定。" : "完成成员注册与招新报名后，可在这里查看申请状态。" }}</p><dl v-if="memberStatus" class="member-application-status"><div><dt>成员身份</dt><dd>{{ memberStatus.identityLabel }}</dd></div><div><dt>所属中心</dt><dd>待确定</dd></div><div><dt>组织职务</dt><dd>暂无组织职务</dd></div></dl></template><template v-else><strong>申请进度</strong><p>进入申请进度页面查看当前审核状态。</p></template></section>
        <section id="assessment"><span>结果中心</span><h2>招新录取与阶段考核</h2><NuxtLink class="text-link" to="/member/results">查看当前结果 →</NuxtLink><p>结果仅本人登录后可见。</p></section>
        <section id="activities"><span>活动与比赛</span><h2>{{ isMockApi ? "2 个待参加事项" : "我的活动" }}</h2><NuxtLink class="text-link" to="/member/activities">查看我的活动 →</NuxtLink><p>{{ isMockApi ? "可在这里查看和取消个人报名。" : "查看已报名活动、比赛安排和报名状态。" }}</p></section>
      </div>
      <section class="profile-panel"><div><h2>个人资料与头像</h2><p v-if="!isMockApi">资料会保存到你的成员档案，修改后可在这里继续维护。</p><p v-else-if="profile.identity === '预备成员'">资料保存后只同步个人中心与招新记录；录取转正前不会进入官网正式成员目录。</p><p v-else>资料保存后会同步到当前前端会话中的成员展示页面；上传头像后自动公开，没有头像时使用白底 HSD 默认图。</p></div><NuxtLink class="button" to="/member/profile">编辑个人资料</NuxtLink></section>
    </main>
  </div>
  <section v-else class="section section--cool"><div class="shell"><p v-if="profileLoading" role="status">正在读取个人资料…</p><p v-else role="alert">{{ profileError || "个人资料暂不可用。" }} <button v-if="!isMockApi" type="button" class="text-link" @click="productionProfile?.load()">重新加载</button></p></div></section>
</template>
