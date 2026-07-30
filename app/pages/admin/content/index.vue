<script setup lang="ts">
import { ADMIN_CONTENT_RECORDS } from "~/data/admin-content";

definePageMeta({ layout: "admin" });
useHead({ title: "内容管理｜HSD 管理台" });
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Content & Portal" title="内容管理" description="集中维护快讯、新闻、通知与帮助文章，确保草稿、审核、发布和下架状态清晰分离。">
      <template #actions><NuxtLink class="button button--ghost" to="/admin/content/home">配置首页内容</NuxtLink><button type="button" class="button">新建内容</button></template>
    </AdminPageHeading>
    <section class="admin-summary-strip" aria-label="内容概览">
      <div><span>全部内容</span><strong>48</strong><small>门户可管理记录</small></div>
      <div><span>待审核</span><strong>05</strong><small>需要内容负责人处理</small></div>
      <div><span>草稿</span><strong>09</strong><small>尚未进入审核流程</small></div>
      <div><span>已发布</span><strong>34</strong><small>正在官网展示</small></div>
    </section>
    <section class="admin-workflow-path" aria-label="内容发布流程">
      <div><span>01</span><strong>保存草稿</strong><small>编辑中，仅后台可见</small></div>
      <i aria-hidden="true">→</i>
      <div><span>02</span><strong>提交审核</strong><small>内容负责人检查</small></div>
      <i aria-hidden="true">→</i>
      <div><span>03</span><strong>确认发布</strong><small>同步到官网与推荐位</small></div>
      <i aria-hidden="true">→</i>
      <div><span>04</span><strong>下架归档</strong><small>停止公开但保留记录</small></div>
    </section>
    <AdminRecordWorkspace :records="ADMIN_CONTENT_RECORDS" table-label="内容管理列表" item-label="内容" new-label="新建内容" :categories="['HSD 快讯', '新闻动态', '通知公告', '帮助文章']" />
  </div>
</template>
