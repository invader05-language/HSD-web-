<script setup lang="ts">
import { ADMIN_CONTENT_RECORDS } from "~/data/admin-content";
definePageMeta({ layout: "admin" });
useHead({ title: "帮助中心管理｜HSD 管理台" });
const helpRecords = ADMIN_CONTENT_RECORDS.filter((record) => record.category === "帮助文章");
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Help Center" title="帮助中心管理" description="维护登录、报名、考核结果、资源访问等说明，并记录最后审核人与更新时间。">
      <template #actions><button type="button" class="button">新建帮助文章</button></template>
    </AdminPageHeading>
    <AdminRecordWorkspace :records="helpRecords" table-label="帮助文章列表" item-label="帮助文章" new-label="新建帮助文章" :categories="['帮助文章']" />
  </div>
</template>
