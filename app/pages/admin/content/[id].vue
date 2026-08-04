<script setup lang="ts">
import { usePortalContentStore } from "~/stores/portal-content";

definePageMeta({ layout: "admin" });
const route = useRoute();
const content = usePortalContentStore();
const record = computed(() => content.getById(String(route.params.id)));
useHead({ title: computed(() => `${record.value?.title ?? '内容不存在'}｜HSD 管理台`) });
function onSaved() {}
</script>

<template><div class="admin-recruitment-page admin-section-page"><AdminPageHeading eyebrow="Official Content" :title="record?.title ?? '内容不存在'" :description="record ? '编辑工作版本不会提前覆盖当前公开版本。' : '该内容不存在，或本地 Mock 存储已被重置。'" /><PortalContentEditor v-if="record" :record="record" @saved="onSaved" /><NuxtLink v-else class="button" to="/admin/content">返回官网内容列表</NuxtLink></div></template>
