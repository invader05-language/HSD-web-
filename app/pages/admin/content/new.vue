<script setup lang="ts">
import type { PortalContentKind } from "~/types/portal-content";

definePageMeta({ layout: "admin" });
useHead({ title: "新建官网内容｜HSD 管理台" });

const route = useRoute();
const initialKind = computed<PortalContentKind>(() => route.query.kind === "flash" || route.query.kind === "notice" ? route.query.kind : "article");
function onSaved(id: string) {
  navigateTo(`/admin/content/${id}`);
}
</script>

<template><div class="admin-recruitment-page admin-section-page"><AdminPageHeading eyebrow="Official Content" title="新建官网内容" description="内容先保存为草稿，再进入审核和发布流程。" /><PortalContentEditor :initial-kind="initialKind" @saved="onSaved" /></div></template>
