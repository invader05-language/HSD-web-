<script setup lang="ts">
import { useActivitiesStore } from "~/stores/activities";
import ActivityEditor from "~/components/admin/ActivityEditor.vue";

definePageMeta({ layout: "admin" });

const route = useRoute();
const activitiesStore = useActivitiesStore();
const activityId = computed(() => decodeURIComponent(String(route.params.id)));
if (import.meta.client) activitiesStore.hydrate();

const sourceActivity = computed(() => activitiesStore.getById(activityId.value));
const canEdit = computed(() => Boolean(sourceActivity.value && activitiesStore.canManageActivity(activityId.value)));
const activity = computed(() => canEdit.value ? sourceActivity.value : undefined);
const savedNotice = computed(() => route.query.saved === "1" ? "草稿已保存。发布前的编辑不会影响用户端。" : undefined);

watchEffect(() => {
  if (import.meta.client && sourceActivity.value && !canEdit.value) {
    void navigateTo(`/admin/forbidden?from=${encodeURIComponent(route.fullPath)}`, { replace: true });
  }
});

useHead(() => ({ title: `${activity.value?.title || "编辑活动"}｜HSD 管理台` }));

function onSaved() {
  // Keep the editor open so the administrator can continue editing the draft.
}

function onPublished() {
  void navigateTo("/admin/activities");
}

function onCancelled() {
  void navigateTo("/admin/activities");
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Activities"
      :title="activity?.title || (sourceActivity ? '编辑活动' : '活动不存在')"
      :description="activity ? '编辑工作版本不会提前覆盖当前公开版本。' : '该活动不存在，或当前管理员无权访问。'"
    >
      <template #actions>
        <NuxtLink v-if="activity?.publishedSnapshot" class="button button--ghost" :to="`/activities/${encodeURIComponent(activity.slug)}`" target="_blank">预览用户端</NuxtLink>
        <NuxtLink class="button button--ghost" to="/admin/activities">返回活动管理</NuxtLink>
      </template>
    </AdminPageHeading>

    <ActivityEditor v-if="activity" mode="edit" :activity="activity" :initial-notice="savedNotice" @saved="onSaved" @published="onPublished" @cancelled="onCancelled" />
    <section v-else class="admin-list-card admin-empty" aria-live="polite">
      <strong>找不到活动</strong>
      <p>请返回活动列表重新选择，或确认当前账号具有对应中心的管理权限。</p>
      <NuxtLink class="button" to="/admin/activities">返回活动管理</NuxtLink>
    </section>
  </div>
</template>
