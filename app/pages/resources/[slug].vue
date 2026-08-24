<script setup lang="ts">
import { findResource, PUBLIC_RESOURCES, resourcePrimaryAction } from "~/data/resources";
import { useResourcesStore } from "~/stores/resources";
import { useContentGateway } from "~/composables/useContentGateway";
import { useSessionStore } from "~/stores/session";
import { buildLoginTarget } from "~/utils/login-continuation";

const route = useRoute();
const session = useSessionStore();
const gateway = useContentGateway();
const resourcesStore = useResourcesStore();
const slug = String(route.params.slug);
const detailData = ref<any>();
if (gateway) {
  if (resourcesStore.detail?.slug !== slug) resourcesStore.activateApiMode();
  const { data } = await useAsyncData(`public-resource-${slug}`, () => resourcesStore.refreshPublicDetailFromApi(gateway, slug));
  detailData.value = data.value;
}
const resource = computed<any>(() => gateway ? resourcesStore.detail ?? detailData.value : findResource(slug));

if (gateway && resourcesStore.apiError) {
  throw createError({ statusCode: resourcesStore.apiError.status ?? 502, statusMessage: resourcesStore.apiError.message });
}

if (!gateway && !resource.value) {
  throw createError({ statusCode: 404, statusMessage: "资源不存在" });
}

const action = computed(() => gateway ? (resource.value?.kind === "article" ? "阅读正文" : resource.value?.access === "member" ? "登录后访问" : "查看资源") : resourcePrimaryAction(resource.value!));
const isUnavailable = computed(() => !gateway && ["not-connected", "offline"].includes(resource.value!.status));
const loginTarget = computed(() => buildLoginTarget(route.fullPath));
const relatedResources = computed(() => gateway ? [] : PUBLIC_RESOURCES.filter((item) => item.slug !== resource.value!.slug).slice(0, 3));
const resourceCategory = computed(() => resource.value?.category ?? resource.value?.kind ?? "资源");
const resourceContents = computed(() => resource.value?.contents ?? (resource.value?.content ? [resource.value.content] : []));

useHead(() => ({ title: `${resource.value?.title}｜资源中心` }));
</script>

<template>
  <main v-if="resource" class="resource-detail">
    <header class="resource-detail-hero">
      <div class="shell">
        <nav aria-label="面包屑" class="breadcrumb"><NuxtLink to="/resources">资源中心</NuxtLink><span>/</span><span>{{ resourceCategory }}</span></nav>
        <p class="eyebrow">{{ resourceCategory }} · {{ resource.format }}</p>
        <h1>{{ resource.title }}</h1>
        <p>{{ resource.summary }}</p>
      </div>
    </header>

    <section class="section section--cool">
      <div class="shell resource-detail-body">
        <article id="resource-content">
          <p class="eyebrow">Resource Overview</p>
          <h2>{{ resource.kind === "article" ? "学习步骤" : "内容清单" }}</h2>
          <p v-if="resource.kind === 'article'">按以下步骤完成学习，并结合自己的项目记录实践中的问题与收获。</p>
          <ol class="resource-content-list">
            <li v-for="(item, index) in resourceContents" :key="item"><span>0{{ Number(index) + 1 }}</span>{{ item }}</li>
          </ol>

          <section class="resource-version-list" aria-labelledby="version-heading">
            <p class="eyebrow">Version Record</p>
            <h2 id="version-heading">版本记录</h2>
            <div><strong>{{ resource.versionLabel ?? resource.version ?? "当前版本" }}</strong><span v-if="resource.updatedAt">更新于 {{ resource.updatedAt }}</span><p>当前公开的资源说明与内容范围。</p></div>
          </section>

          <section class="resource-related" aria-labelledby="related-heading">
            <p class="eyebrow">Related Resources</p>
            <h2 id="related-heading">相关资源</h2>
            <div>
              <NuxtLink v-for="item in relatedResources" :key="item.slug" :to="item.to">{{ item.title }} <span>→</span></NuxtLink>
            </div>
          </section>
        </article>

        <aside class="resource-file-panel">
          <p class="eyebrow">File Information</p>
          <h2>资源信息</h2>
          <dl>
            <div><dt>格式</dt><dd>{{ resource.format }}</dd></div>
            <div><dt>访问范围</dt><dd>{{ resource.access === "member" ? "成员可查看下载权限" : "公开浏览" }}</dd></div>
            <div><dt>当前状态</dt><dd>{{ resource.status === "ready" ? "可访问" : resource.status === "offline" ? "已下线" : "暂未接入" }}</dd></div>
            <div v-if="resource.fileSize"><dt>文件大小</dt><dd>{{ resource.fileSize }}</dd></div>
          </dl>

          <button v-if="isUnavailable" class="button" type="button" disabled>{{ action }}</button>
          <a v-else-if="!gateway && resource.kind === 'external'" class="button" :href="resource.externalUrl" target="_blank" rel="noopener noreferrer">{{ action }}</a>
          <a v-else-if="resource.kind === 'article'" class="button" href="#resource-content">{{ action }}</a>
          <a v-else-if="resource.variant?.url" class="button" :href="resource.variant.url">{{ action }}</a>

          <NuxtLink
            v-if="resource.access === 'member' && !session.isAuthenticated"
            class="text-link"
            :to="loginTarget"
          >
            登录查看下载权限
          </NuxtLink>
          <p v-else-if="resource.access === 'member'" class="resource-file-panel__notice">
            已登录，文件接入后将开放成员下载权限。
          </p>
          <p v-if="isUnavailable" class="resource-file-panel__notice">真实文件尚未接入，当前不提供下载链接。</p>
        </aside>
      </div>
    </section>
  </main>
</template>
