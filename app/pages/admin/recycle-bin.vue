<script setup lang="ts">
definePageMeta({ layout: "admin" });
useHead({ title: "回收站｜HSD 管理台" });
const removed = [
  { name: "旧版招新 Banner", type: "媒体素材", removedBy: "周同学", removedAt: "2026-07-29 18:21", purgeAt: "2026-08-28" },
  { name: "测试活动 07", type: "活动", removedBy: "联盟管理员", removedAt: "2026-07-28 10:16", purgeAt: "2026-08-27" }
];
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Recycle Bin" title="回收站" description="被移除的内容先进入可恢复状态；永久删除前必须检查引用关系并再次确认。">
      <template #actions><button type="button" class="button button--ghost">清理策略</button></template>
    </AdminPageHeading>
    <section class="admin-list-card"><header><div><span>Recoverable Records</span><h2>可恢复项目</h2></div><p>默认保留 30 天</p></header><div class="admin-table-scroll"><table aria-label="回收站项目"><thead><tr><th>名称</th><th>类型</th><th>移除人</th><th>移除时间</th><th>计划清理</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="item in removed" :key="item.name"><td><strong>{{ item.name }}</strong><small>引用检查：无阻塞</small></td><td>{{ item.type }}</td><td>{{ item.removedBy }}</td><td>{{ item.removedAt }}</td><td>{{ item.purgeAt }}</td><td><button type="button">恢复 / 永久删除</button></td></tr></tbody></table></div></section>
  </div>
</template>
