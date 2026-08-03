<script setup lang="ts">
import { ADMIN_CENTER_SUMMARIES } from "~/data/admin-members";
definePageMeta({ layout: "admin" });
useHead({ title: "中心组织｜HSD 管理台" });
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Organization" title="中心组织" description="查看四个中心的负责人、成员规模和公开说明，中心之间保持平等协作关系。"/>
    <section class="admin-center-admin-grid">
      <article v-for="(center, index) in ADMIN_CENTER_SUMMARIES" :key="center.name">
        <span>0{{ index + 1 }}</span><AdminStatusPill :status="center.state"/><h2>{{ center.name }}</h2><p>{{ center.description }}</p>
        <dl><div><dt>成员</dt><dd>{{ center.members }}</dd></div><div><dt>核心人员</dt><dd>{{ center.core }}</dd></div><div><dt>负责人</dt><dd>{{ center.lead }}</dd></div></dl>
      </article>
    </section>
  </div>
</template>
