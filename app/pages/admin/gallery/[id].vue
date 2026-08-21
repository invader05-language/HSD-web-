<script setup lang="ts">
import { useGalleryStore } from "~/stores/gallery";
import { useContentGateway } from "~/composables/useContentGateway";
import GalleryEditor from "~/components/admin/GalleryEditor.vue";

definePageMeta({ layout: "admin" });

const route = useRoute();
const galleryStore = useGalleryStore();
const gateway = useContentGateway();
const albumId = computed(() => decodeURIComponent(String(route.params.id)));
if (gateway) galleryStore.activateApiMode();
if (import.meta.client && !gateway) galleryStore.hydrate();
onMounted(() => { if (gateway) void galleryStore.refreshFromApi(gateway); });

const sourceAlbum = computed(() => galleryStore.getById(albumId.value));
const canEdit = computed(() => Boolean(sourceAlbum.value && galleryStore.canManageAlbum(albumId.value)));
const album = computed(() => canEdit.value ? sourceAlbum.value : undefined);
const savedNotice = computed(() => route.query.saved === "1" ? "画廊草稿已保存，发布前的编辑不会影响用户端。" : undefined);

watchEffect(() => {
  if (import.meta.client && sourceAlbum.value && !canEdit.value) {
    void navigateTo(`/admin/forbidden?from=${encodeURIComponent(route.fullPath)}`, { replace: true });
  }
});

useHead(() => ({ title: `${album.value?.title || "编辑画廊专题"}｜HSD 管理台` }));

function onPublished() {
  void navigateTo("/admin/gallery");
}

function onOffline() {
  void navigateTo("/admin/gallery");
}

function onCancelled() {
  void navigateTo("/admin/gallery");
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <p v-if="galleryStore.apiError" role="alert">{{ galleryStore.apiError.message }}（{{ galleryStore.apiError.code }}）</p>
    <p v-if="galleryStore.apiLoading" role="status">正在加载画廊…</p>
    <AdminPageHeading
      eyebrow="Gallery Stories"
      :title="album?.title || (sourceAlbum ? '编辑画廊专题' : '画廊专题不存在')"
      :description="album ? '编辑工作版本不会提前覆盖当前公开专题。' : '该专题不存在，或当前管理员无权访问。'"
    >
      <template #actions>
        <NuxtLink v-if="album?.publishedSnapshot" class="button button--ghost" :to="`/gallery/${encodeURIComponent(album.slug)}`" target="_blank">预览用户端</NuxtLink>
        <NuxtLink class="button button--ghost" to="/admin/gallery">返回画廊专题</NuxtLink>
      </template>
    </AdminPageHeading>

    <GalleryEditor v-if="album" mode="edit" :album="album" :initial-notice="savedNotice" @published="onPublished" @offline="onOffline" @cancelled="onCancelled" />
    <section v-else class="admin-list-card admin-empty" aria-live="polite">
      <strong>找不到画廊专题</strong>
      <p>请返回画廊专题列表重新选择，或确认当前账号具有对应中心的管理权限。</p>
      <NuxtLink class="button" to="/admin/gallery">返回画廊专题</NuxtLink>
    </section>
  </div>
</template>
