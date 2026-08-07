<script setup lang="ts">
import GalleryEditor from "~/components/admin/GalleryEditor.vue";

definePageMeta({ layout: "admin" });
useHead({ title: "新建画廊专题｜HSD 管理台" });

function onSaved(id: string) {
  void navigateTo(`/admin/gallery/${encodeURIComponent(id)}?saved=1`);
}

function onPublished() {
  void navigateTo("/admin/gallery");
}

function onCancelled() {
  void navigateTo("/admin/gallery");
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Gallery Stories" title="新建画廊专题" description="保存草稿后可以继续审阅素材，确认字段和素材完整后再发布到用户端。">
      <template #actions><NuxtLink class="button button--ghost" to="/admin/gallery">返回画廊专题</NuxtLink></template>
    </AdminPageHeading>
    <GalleryEditor mode="create" @saved="onSaved" @published="onPublished" @cancelled="onCancelled" />
  </div>
</template>
