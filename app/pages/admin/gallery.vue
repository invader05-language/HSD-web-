<script setup lang="ts">
import { useGalleryStore } from "~/stores/gallery";
import { useContentGateway } from "~/composables/useContentGateway";
import { useSessionStore } from "~/stores/session";
import type { ContentMediaAttachment } from "~/types/content-media";

definePageMeta({ layout: "admin" });
useHead({ title: "画廊专题｜HSD 管理台" });

const galleryStore = useGalleryStore();
const gateway = useContentGateway();
const session = useSessionStore();
const route = useRoute();
if (gateway) galleryStore.activateApiMode();
if (import.meta.client && !gateway) galleryStore.hydrate();
onMounted(() => { if (gateway) void galleryStore.refreshFromApi(gateway); });

const scopedAlbums = computed(() => session.adminLevel === "owner"
  ? galleryStore.albums
  : galleryStore.albums.filter((album) => album.ownerCenterId === session.currentAccount?.adminCenterId));

function albumStatus(album: typeof galleryStore.albums[number]) {
  if (album.publishedState === "published") return "已发布";
  if (album.status === "unpublished") return "已下架";
  return "草稿";
}

function coverMedia(album: typeof galleryStore.albums[number]): ContentMediaAttachment | undefined {
  const cover = album.cover;
  if (!cover) return undefined;
  return {
    id: cover.id,
    role: "cover",
    kind: cover.kind === "video" ? "video" : "image",
    title: cover.title ?? "",
    caption: cover.caption ?? "",
    aspect: cover.aspect ?? "landscape",
    sortOrder: 0,
    status: cover.status ?? "ready",
    serverOwned: cover.serverOwned,
    version: cover.version,
    ...(cover.imageUrl ? { url: cover.imageUrl } : {}),
    ...(cover.thumbnailUrl ? { thumbnailUrl: cover.thumbnailUrl } : {}),
  };
}
</script>

<template>
  <NuxtPage v-if="route.path !== '/admin/gallery'" />
  <div v-else class="admin-recruitment-page admin-section-page">
    <p v-if="galleryStore.apiError" role="alert">{{ galleryStore.apiError.message }}（{{ galleryStore.apiError.code }}）</p>
    <p v-if="galleryStore.apiLoading" role="status">正在加载画廊…</p>
    <AdminPageHeading eyebrow="Gallery Stories" title="画廊专题" description="在专题自己的新建或编辑页直接上传、审阅和发布图片与视频；中心负责人只能管理所属中心内容，联盟总负责人可管理全部专题。">
      <template #actions><NuxtLink class="button" to="/admin/gallery/new">新建画廊专题</NuxtLink></template>
    </AdminPageHeading>

    <section class="admin-gallery-admin-grid" aria-label="画廊专题列表">
      <article v-for="album in scopedAlbums" :key="album.id">
        <div :style="{ '--gallery-cover': '#3f4e58' }">
          <ContentMediaView v-if="coverMedia(album)" class="admin-gallery-admin-grid__cover" :item="coverMedia(album)!" preview="thumbnail" :controls="false" />
          <span v-else class="admin-gallery-admin-grid__cover admin-gallery-admin-grid__cover--empty">暂无封面</span>
          <span class="admin-gallery-admin-grid__eyebrow">&lt; HSD GALLERY &gt;</span>
          <AdminStatusPill :status="albumStatus(album)" />
          <h2>{{ album.title }}</h2>
          <p>{{ album.assets.length }} 项专题素材</p>
        </div>
        <footer><span>{{ album.team || "未填写制作团队" }}</span><NuxtLink :to="`/admin/gallery/${encodeURIComponent(album.id)}`">编辑专题</NuxtLink></footer>
      </article>
    </section>

    <section v-if="!scopedAlbums.length" class="admin-list-card admin-empty" aria-live="polite">
      <strong>暂无可管理画廊</strong>
      <p>创建一个专题后，直接在专题编辑页添加图片或视频。</p>
      <NuxtLink class="button" to="/admin/gallery/new">新建画廊专题</NuxtLink>
    </section>
  </div>
</template>
