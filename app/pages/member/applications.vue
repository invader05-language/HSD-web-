<script setup lang="ts">
import MemberSpaceNav from "~/components/member/MemberSpaceNav.vue";
import { useCurrentMember } from "~/composables/useCurrentMember";
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import { useRecruitmentApplicationStore } from "~/stores/recruitment-application";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { createProductionMemberProfileController } from "~/composables/useProductionMemberProfile";
import { mapPublicRecruitmentBatch, mapRecruitmentApplicationResponse } from "~/services/recruitment/recruitment-view-models";
import type { SubmittedRecruitmentApplication } from "~/data/recruitment-application";

if (typeof definePageMeta === "function") definePageMeta({ middleware: "member" });
useHead({ title: "申请进度｜成员空间" });
const runtime = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
const isMockApi = runtime.public.useMockApi;
const session = useSessionStore();
const sessionGateway = useSessionGateway();
const currentMember = isMockApi ? useCurrentMember() : undefined;
const applicationStore = isMockApi ? useRecruitmentApplicationStore() : undefined;
const batchStore = isMockApi ? useRecruitmentBatchStore() : undefined;
const recruitmentGateway = useRecruitmentGateway();
const productionProfile = recruitmentGateway ? createProductionMemberProfileController({ gateway: recruitmentGateway, apiBase: runtime.public.apiBase }) : undefined;
const application = ref<SubmittedRecruitmentApplication>();
const batchName = ref("当前招新批次");
const loading = ref(!isMockApi);
const error = ref("");
const profile = computed(() => isMockApi ? currentMember?.profile.value : productionProfile?.profile.value);

function statusLabel(value?: SubmittedRecruitmentApplication["status"]) {
  return value === "completed" ? "已完成" : value === "processing" ? "考核处理中" : value === "withdrawn" ? "已撤回" : value ? "已提交" : "未报名";
}

async function load() {
  if (isMockApi) {
    const current = batchStore?.currentOpenBatchAt(new Date());
    application.value = current && currentMember ? applicationStore?.getApplication(current.id, currentMember.profile.value.id) : undefined;
    batchName.value = current?.name ?? "暂无开放批次";
    return;
  }
  if (!recruitmentGateway) return;
  loading.value = true;
  error.value = "";
  try {
    const [current, loadedProfile] = await Promise.all([recruitmentGateway.getCurrentBatch(), productionProfile?.load()]);
    if (!current.batch || !loadedProfile) { batchName.value = "暂无开放批次"; return; }
    const mappedBatch = mapPublicRecruitmentBatch(current.batch);
    batchName.value = mappedBatch.name;
    const response = await recruitmentGateway.getMyApplication(mappedBatch.id);
    if (response.application) application.value = mapRecruitmentApplicationResponse(response.application, loadedProfile, mappedBatch);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "申请进度暂时不可用。";
  } finally { loading.value = false; }
}

async function signOut() { if (await session.signOutForRuntime(runtime.public, sessionGateway)) await navigateTo("/"); }
onMounted(() => void load());
</script>

<template>
  <div v-if="profile" class="member-space member-space--subpage">
    <MemberSpaceNav :profile="profile" :avatar-src="profile.avatarUrl" active="applications" :signing-out="session.isSigningOut" :sign-out-error="session.signOutError" @sign-out="signOut" />
    <main class="section member-space__content">
      <div class="shell">
        <p class="eyebrow">成员空间</p><h1>申请进度</h1><p>查看当前招新申请的处理阶段和允许公开的状态。</p>
        <p v-if="loading" role="status">正在读取申请进度…</p><p v-else-if="error" role="alert">{{ error }}</p>
        <article v-else class="member-progress-card">
          <header><span>招新批次</span><strong>{{ batchName }}</strong></header>
          <template v-if="application">
            <dl><div><dt>申请状态</dt><dd>{{ statusLabel(application.status) }}</dd></div><div><dt>提交时间</dt><dd>{{ application.submittedAt }}</dd></div><div><dt>第一志愿</dt><dd>{{ application.firstChoice }}</dd></div><div><dt>第二志愿</dt><dd>{{ application.secondChoice || "未填写" }}</dd></div></dl>
            <p>当前申请已进入平台处理流程，后续状态以管理台发布的信息为准。</p>
          </template>
          <template v-else><h2>尚未提交本期申请</h2><p>开放招新后，可从“加入我们”填写报名表。</p><NuxtLink class="button" to="/join">前往报名</NuxtLink></template>
        </article>
      </div>
    </main>
  </div>
</template>
