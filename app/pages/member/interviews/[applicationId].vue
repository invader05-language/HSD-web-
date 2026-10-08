<script setup lang="ts">
import MemberSpaceNav from "~/components/member/MemberSpaceNav.vue";
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import { useRecruitmentGateway } from "~/composables/useRecruitmentGateway";
import { useRecruitmentRefresh } from "~/composables/useRecruitmentRefresh";
import { createProductionMemberProfileController } from "~/composables/useProductionMemberProfile";
import { formatInterviewSlotRange, getInterviewSlotAvailability, interviewSlotCapacityLabel } from "~/utils/recruitment-interview-slots";
import type { MyInterviewContextDto } from "../../../../packages/api-client/src";
import type { RecruitmentInterviewSlot } from "~/types/recruitment-interview";

definePageMeta({ middleware: "member" });
useHead({ title: "重新选择面试时间｜成员空间" });

const route = useRoute();
const runtime = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
const session = useSessionStore();
const sessionGateway = useSessionGateway();
const recruitmentGateway = useRecruitmentGateway();
const profileController = recruitmentGateway ? createProductionMemberProfileController({ gateway: recruitmentGateway, apiBase: runtime.public.apiBase }) : undefined;
const profile = computed(() => profileController?.profile.value);
const applicationId = computed(() => String(route.params.applicationId));
const batchId = computed(() => typeof route.query.batchId === "string" ? route.query.batchId : "");
const context = ref<MyInterviewContextDto>();
const selectedSlotId = ref("");
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const success = ref("");

const slots = computed<RecruitmentInterviewSlot[]>(() => context.value?.batch.interviewSlots.map((slot) => ({
  ...slot,
  status: "ACTIVE",
  confirmedCount: slot.capacity === null ? 0 : Math.max(0, slot.capacity - (slot.remainingCapacity ?? 0)),
  version: 1,
})) ?? []);
const isReselection = computed(() => context.value?.application.interviewSelection?.status === "RESELECTION_REQUIRED");

async function loadContext() {
  if (!recruitmentGateway || !batchId.value) throw new Error("缺少招新批次信息，请从申请进度页重新进入。");
  loading.value = !context.value;
  error.value = "";
  try {
    const [loaded, loadedProfile] = await Promise.all([
      recruitmentGateway.getMyInterviewContext(batchId.value),
      profile.value ? Promise.resolve(profile.value) : profileController?.load(),
    ]);
    if (!loadedProfile) throw new Error("成员资料暂不可用，请重新登录后再试。");
    if (loaded.application.id !== applicationId.value) throw new Error("该面试安排与当前报名不匹配。");
    context.value = loaded;
    if (loaded.application.interviewSelection?.status !== "RESELECTION_REQUIRED" && !selectedSlotId.value) {
      selectedSlotId.value = loaded.application.interviewSelection?.id ?? "";
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "面试安排读取失败，请重试。";
    throw cause;
  } finally {
    loading.value = false;
  }
}

const refreshState = useRecruitmentRefresh(loadContext);

async function submitSelection() {
  if (!context.value || !recruitmentGateway || !selectedSlotId.value || !context.value.canChangeInterview || saving.value) return;
  saving.value = true;
  error.value = "";
  success.value = "";
  try {
    const updated = await recruitmentGateway.changeInterviewSlot(batchId.value, applicationId.value, {
      expectedApplicationVersion: context.value.application.version,
      interviewSlotId: selectedSlotId.value,
    });
    const canContinueChanging = context.value.batch.effectiveStatus === "open";
    context.value = {
      ...context.value,
      application: updated,
      canChangeInterview: canContinueChanging,
      changeBlockedReason: canContinueChanging ? null : "BATCH_NOT_OPEN",
    };
    success.value = updated.interviewSelection ? `面试时间已确认：${formatInterviewSlotRange(updated.interviewSelection)}` : "面试安排已保存。";
    await refreshState.refresh();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "面试时间更新失败，请重新读取后再试。";
    await refreshState.refresh();
  } finally {
    saving.value = false;
  }
}

async function signOut() {
  if (await session.signOutForRuntime(runtime.public, sessionGateway)) await navigateTo("/");
}
</script>

<template>
  <div class="member-space member-space--subpage">
    <MemberSpaceNav v-if="profile" :profile="profile" :avatar-src="profile.avatarUrl" active="applications" :signing-out="session.isSigningOut" :sign-out-error="session.signOutError" @sign-out="signOut" />
    <main class="section member-space__content"><div class="shell">
      <p class="eyebrow">成员空间</p>
      <h1>{{ isReselection ? "重新选择面试时间" : "更改面试时间" }}</h1>
      <p v-if="context">{{ context.batch.name }} · 面试时间均为中国标准时间（UTC+8）</p>
      <p v-if="loading" role="status">正在读取面试安排…</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="success" role="status">{{ success }}</p>
      <section v-if="context && !loading" class="member-progress-card">
        <h2>当前安排</h2>
        <p>{{ context.application.interviewSelection ? formatInterviewSlotRange(context.application.interviewSelection) : "尚未选择面试时间" }}</p>
        <p v-if="!context.canChangeInterview" role="status">
          {{ context.changeBlockedReason === "BATCH_NOT_OPEN" ? "该批次已关闭，当前安排不能主动修改。" : context.changeBlockedReason === "INTERVIEW_STARTED" ? "原面试时段已经开始，不能更改。" : context.changeBlockedReason === "NO_AVAILABLE_SLOT" ? "当前没有可选时段，请联系招新负责人。" : context.changeBlockedReason === "BATCH_ARCHIVED" ? "该批次已归档，面试安排只读。" : "当前报名状态不允许更改面试时间。" }}
        </p>
        <fieldset v-else>
          <legend>选择新面试时间</legend>
          <p v-if="!slots.length">当前没有可选时段，请联系招新负责人。</p>
          <label v-for="slot in slots" :key="slot.id" class="registration-interview-slot">
            <input v-model="selectedSlotId" type="radio" name="interview-slot" :value="slot.id" :disabled="!getInterviewSlotAvailability(slot).selectable">
            <span><strong>{{ formatInterviewSlotRange(slot) }}</strong><small>{{ interviewSlotCapacityLabel(slot) }}<template v-if="!getInterviewSlotAvailability(slot).selectable"> · 当前不可选</template></small></span>
          </label>
          <button type="button" class="button" :disabled="saving || !selectedSlotId || !slots.some((slot) => slot.id === selectedSlotId && getInterviewSlotAvailability(slot).selectable)" @click="submitSelection">{{ saving ? "正在保存…" : "确认面试时间" }}</button>
        </fieldset>
      </section>
      <p>最近更新：{{ refreshState.lastUpdatedAt.value?.toLocaleTimeString("zh-CN", { hour12: false }) ?? "尚未更新" }} <button type="button" class="button button--ghost" :disabled="refreshState.refreshing.value" @click="refreshState.refresh">刷新</button></p>
      <NuxtLink class="text-link" to="/member/applications">返回申请进度</NuxtLink>
    </div></main>
  </div>
</template>
