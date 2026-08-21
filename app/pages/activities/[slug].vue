<script setup lang="ts">
import { useActivitiesStore } from "~/stores/activities";
import { useSessionStore } from "~/stores/session";
import { resolveLoginAwareTarget } from "~/utils/login-continuation";
import { useContentGateway } from "~/composables/useContentGateway";

const route = useRoute();
const session = useSessionStore();
const activitiesStore = useActivitiesStore();
const gateway = useContentGateway();
if (gateway) activitiesStore.activateApiMode();
const slug = String(route.params.slug);
if (import.meta.client && !gateway) activitiesStore.hydrate();
onMounted(async () => { if (gateway) { await activitiesStore.refreshPublicDetailFromApi(gateway, slug); if (session.isAuthenticated && activity.value) await activitiesStore.refreshMyRegistrationFromApi(gateway, activity.value); } });
const activity = computed(() => activitiesStore.getPublicBySlug(slug));
const registration = computed(() => gateway ? activitiesStore.getMyRegistrationForSlug(slug) : (activity.value ? activitiesStore.getCurrentRegistration(activity.value.id) : undefined));
const actionNotice = ref("");
const signupTarget = computed(() => resolveLoginAwareTarget(`${route.path}?signup=1`, session.isAuthenticated));
const signupLabel = computed(() => !session.isAuthenticated ? "登录后报名" : registration.value?.status === "cancelled" ? "重新报名" : registration.value ? "取消报名" : "立即报名");
const signupSubmitLabel = computed(() => !session.isAuthenticated ? "登录后提交报名" : registration.value?.status === "cancelled" ? "重新报名" : registration.value ? "取消我的报名" : "立即报名");
const registrationStatusLabel = computed(() => ({
  registered: "待审核",
  accepted: "已录取",
  rejected: "未录取",
  cancelled: "已取消",
} as Record<string, string>)[registration.value?.status ?? ""] ?? (activity.value?.registrationOpen ? "报名开放" : "报名关闭"));

async function submitRegistration() {
  if (!activity.value) return;
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
      if (gateway) await activitiesStore.registerFromApi(gateway, activity.value);
      else activitiesStore.registerCurrentUser(activity.value.id);
      actionNotice.value = "报名已提交，等待管理端审核。";
    }
  } catch (caught) {
    actionNotice.value = caught instanceof Error ? `操作失败：${caught.message}` : "操作失败。";
  }
}

function handleSignupClick(event: MouseEvent) {
  if (!session.isAuthenticated) return;
  event.preventDefault();
  void submitRegistration();
}
useHead(() => ({ title: `${activity.value?.title}｜活动中心` }));
</script>

<template>
  <div v-if="activity">
    <p v-if="activitiesStore.apiError" role="alert">{{ activitiesStore.apiError.message }}（{{ activitiesStore.apiError.code }}）</p>
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
        <NuxtLink class="button button--light" :to="signupTarget" :aria-disabled="!activity.registrationOpen && !registration ? 'true' : undefined" @click="handleSignupClick">{{ signupLabel }}</NuxtLink>
      </template>
    </PageBanner>
    <section class="section section--cool">
      <div class="shell detail-layout">
        <article class="detail-main">
          <p class="eyebrow">Activity Brief</p>
          <h2>活动介绍</h2>
          <h3>活动内容</h3>
          <p>{{ activity.content }}</p>
          <h3>活动流程</h3>
          <ol class="agenda-list">
            <li v-for="(item, index) in activity.agenda" :key="item"><span>0{{ index + 1 }}</span>{{ item }}</li>
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
          <NuxtLink class="button" :to="signupTarget" :aria-disabled="!activity.registrationOpen && !registration ? 'true' : undefined" @click="handleSignupClick">{{ signupSubmitLabel }}</NuxtLink>
          <p v-if="actionNotice" role="status">{{ actionNotice }}</p>
          <p>浏览活动详情无需登录，提交报名后由管理端进行录取或不录取审核。</p>
        </aside>
      </div>
    </section>
  </div>

  <section v-else class="section section--cool">
    <div class="shell">
      <p v-if="activitiesStore.apiLoading" role="status">正在加载活动…</p>
      <p v-else-if="activitiesStore.apiError && activitiesStore.apiError.status !== 404" role="alert">{{ activitiesStore.apiError.message }}（{{ activitiesStore.apiError.code }}）</p>
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
