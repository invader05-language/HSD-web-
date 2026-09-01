<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useActivitiesStore } from "~/stores/activities";
import { useSessionStore } from "~/stores/session";
import { resolveLoginAwareTarget } from "~/utils/login-continuation";
import { useContentGateway } from "~/composables/useContentGateway";
import { isActivityRegistrationOpen } from "~/utils/activity-registration";
import { localizeActivityError } from "~/utils/activity-errors";
import type { ActivityRegistrationAnswers, ActivityRegistrationForm } from "~/types/activity-registration";

const route = useRoute();
const session = useSessionStore();
const activitiesStore = useActivitiesStore();
const gateway = useContentGateway();
if (gateway) activitiesStore.activateApiMode();
const slug = String(route.params.slug);
if (import.meta.client && !gateway) activitiesStore.hydrate();
onMounted(async () => {
  if (!gateway) return;
  await activitiesStore.refreshPublicDetailFromApi(gateway, slug);
  if (session.isAuthenticated && activity.value?.registrationOpen) await activitiesStore.refreshRegistrationFormFromApi(gateway, activity.value);
  if (session.isAuthenticated && activity.value) await activitiesStore.refreshMyRegistrationFromApi(gateway, activity.value);
  if (session.isAuthenticated && route.query.signup === "1" && registrationAvailable.value && !registration.value) await openRegistration();
});
const activity = computed(() => activitiesStore.getPublicBySlug(slug));
const registration = computed(() => gateway ? activitiesStore.getMyRegistrationForSlug(slug) : (activity.value ? activitiesStore.getCurrentRegistration(activity.value.id) : undefined));
const registrationForm = computed<ActivityRegistrationForm | undefined>(() => activitiesStore.apiRegistrationFormsBySlug[slug]);
const answers = ref<ActivityRegistrationAnswers>({});
const formErrors = ref<Record<string, string>>({});
const formOpen = ref(false);
const registrationFormError = ref("");
const registrationSection = ref<HTMLElement | null>(null);
const formSubmitting = ref(false);
const actionNotice = ref("");
const now = ref(new Date());
let clock: ReturnType<typeof setInterval> | undefined;
onMounted(() => { clock = setInterval(() => { now.value = new Date(); }, 30_000); });
onUnmounted(() => { if (clock) clearInterval(clock); });
const signupTarget = computed(() => resolveLoginAwareTarget(`${route.path}?signup=1`, session.isAuthenticated));
const registrationAvailable = computed(() => activity.value ? isActivityRegistrationOpen(activity.value, now.value) : false);
const signupDisabled = computed(() => !registrationAvailable.value && (!registration.value || registration.value.status === "cancelled"));
const signupLabel = computed(() => !session.isAuthenticated ? "登录后报名" : registration.value?.status === "cancelled" ? "重新报名" : registration.value ? "取消报名" : "立即报名");
const signupSubmitLabel = computed(() => !session.isAuthenticated ? "登录后提交报名" : registration.value?.status === "cancelled" ? "重新报名" : registration.value ? "取消我的报名" : "立即报名");
const registrationStatusLabel = computed(() => ({
  registered: "待审核",
  accepted: "已录取",
  rejected: "未录取",
  cancelled: "已取消",
} as Record<string, string>)[registration.value?.status ?? ""] ?? (activity.value?.registrationOpen ? "报名开放" : "报名关闭"));

async function openRegistration() {
  if (!gateway || !activity.value) return;
  registrationFormError.value = "";
  const form = registrationForm.value ?? await activitiesStore.refreshRegistrationFormFromApi(gateway, activity.value);
  if (!form) {
    registrationFormError.value = localizeActivityError(activitiesStore.apiError);
    return;
  }
  if (!form.fields.length) {
    await activitiesStore.registerFromApi(gateway, activity.value, {}, form.revisionId);
    actionNotice.value = "报名已提交，等待管理端审核。";
    return;
  }
  formOpen.value = true;
  await nextTick();
  registrationSection.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  registrationSection.value?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
}

async function submitRegistration() {
  if (!activity.value) return;
  if (signupDisabled.value) {
    actionNotice.value = "报名已截止。";
    return;
  }
  if (!session.isAuthenticated) {
    await navigateTo(signupTarget.value);
    return;
  }
  try {
    if (registration.value && registration.value.status !== "cancelled") {
      if (gateway) await activitiesStore.cancelRegistrationFromApi(gateway, registration.value.id);
      else activitiesStore.cancelRegistration(registration.value.id);
      actionNotice.value = "已取消本次活动报名。";
    } else {
      if (gateway) {
        await openRegistration();
        return;
      }
      activitiesStore.registerCurrentUser(activity.value.id);
      actionNotice.value = "报名已提交，等待管理端审核。";
    }
  } catch (caught) {
    actionNotice.value = `操作失败：${localizeActivityError(caught)}`;
  }
}

async function confirmDynamicRegistration() {
  if (!gateway || !activity.value || !registrationForm.value) return;
  formSubmitting.value = true; formErrors.value = {};
  try { await activitiesStore.registerFromApi(gateway, activity.value, answers.value, registrationForm.value.revisionId); formOpen.value = false; actionNotice.value = "报名已提交，等待管理端审核。"; }
  catch (caught) { const error = caught as { fieldErrors?: Record<string, string> }; formErrors.value = error.fieldErrors ?? {}; actionNotice.value = `操作失败：${localizeActivityError(caught)}`; }
  finally { formSubmitting.value = false; }
}

useHead(() => ({ title: `${activity.value?.title}｜活动中心` }));
</script>

<template>
  <div v-if="activity">
    <p v-if="activitiesStore.apiError" role="alert">{{ localizeActivityError(activitiesStore.apiError) }}</p>
    <p v-if="activitiesStore.apiLoading" role="status">正在加载活动…</p>
    <PageBanner
      :eyebrow="`${activity.type} · ${activity.date}`"
      :title="activity.title"
      :description="activity.summary"
      tone="red"
      media-label="活动现场或主题视觉素材位"
      :media="activity.cover ?? undefined"
    >
      <template #actions>
        <button v-if="signupDisabled" class="button button--light" type="button" disabled>报名已截止</button>
        <NuxtLink v-else-if="!session.isAuthenticated" class="button button--light" :to="signupTarget">{{ signupLabel }}</NuxtLink>
        <button v-else class="button button--light" type="button" @click="submitRegistration">{{ signupLabel }}</button>
      </template>
    </PageBanner>
    <section class="section section--cool">
      <div class="shell detail-layout">
        <article class="detail-main">
          <p class="eyebrow">活动简介</p>
          <h2>活动介绍</h2>
          <h3>活动内容</h3>
          <p class="activity-detail-copy">{{ activity.content }}</p>
          <h3>活动流程</h3>
          <ol class="agenda-list">
            <li v-for="(item, index) in activity.agenda" :key="item"><span>0{{ index + 1 }}</span><strong class="agenda-list__text">{{ item }}</strong></li>
          </ol>
          <div v-if="activity.details.length" class="activity-detail-media" aria-label="活动详情素材">
            <ContentMediaView v-for="item in activity.details" :key="item.id" :item="item" fit="contain" preview="full" controls />
          </div>
        </article>
        <aside class="detail-aside detail-aside--sticky">
          <h2>报名信息</h2>
          <dl>
            <div><dt>日期</dt><dd>{{ activity.date }}</dd></div>
            <div><dt>时间</dt><dd>{{ activity.time }}</dd></div>
            <div><dt>地点</dt><dd>{{ activity.location }}</dd></div>
            <div><dt>名额</dt><dd>不限人数</dd></div>
            <div><dt>状态</dt><dd>{{ registrationStatusLabel }}</dd></div>
          </dl>
          <button v-if="signupDisabled" class="button" type="button" disabled>报名已截止</button>
          <NuxtLink v-else-if="!session.isAuthenticated" class="button" :to="signupTarget">{{ signupSubmitLabel }}</NuxtLink>
          <button v-else class="button" type="button" @click="submitRegistration">{{ signupSubmitLabel }}</button>
          <p v-if="actionNotice" role="status">{{ actionNotice }}</p>
          <p>活动详情、报名状态与审核结果会在这里集中展示。</p>
        </aside>
      </div>
    </section>
    <p v-if="registrationFormError" class="registration-form-error" role="alert">{{ registrationFormError }}</p>
    <section v-if="formOpen && registrationForm" ref="registrationSection" class="section section--cool activity-registration-section" tabindex="-1">
      <div class="shell">
        <div class="detail-main">
          <p class="eyebrow">活动报名</p>
          <h2>填写报名信息</h2>
          <p>姓名和学号来自当前登录账号，不能修改。</p>
          <ActivityRegistrationForm
            :form="registrationForm"
            v-model="answers"
            :identity="{ name: session.currentAccount?.name ?? '', studentId: session.apiSession?.person.studentId ?? '', account: session.currentAccount?.account }"
            :submitting="formSubmitting"
            :server-errors="formErrors"
            @submit="confirmDynamicRegistration"
          />
        </div>
      </div>
    </section>
  </div>

  <section v-else class="section section--cool">
    <div class="shell">
      <p v-if="activitiesStore.apiLoading" role="status">正在加载活动…</p>
      <p v-else-if="activitiesStore.apiError && activitiesStore.apiError.status !== 404" role="alert">{{ localizeActivityError(activitiesStore.apiError) }}</p>
      <EmptyState
        v-else
        title="活动不存在"
        description="该活动可能尚未发布，或已被下线。"
      >
        <template #action>
          <NuxtLink class="button" to="/activities">返回动态与活动</NuxtLink>
        </template>
      </EmptyState>
    </div>
  </section>
</template>
