<script setup lang="ts">
import {
  ADMIN_ASSETS,
  ADMIN_UPLOAD_TASKS,
  canSelectAsset,
  filterAdminAssets,
  getAssetProcessingLabel
} from "~/data/admin-assets";

definePageMeta({ layout: "admin" });
useHead({ title: "媒体素材库｜HSD 管理台" });

const filters = reactive({ query: "", type: "全部类型", state: "全部状态" });
const view = ref<"grid" | "list">("grid");
const showUpload = ref(false);
const selected = ref<(typeof ADMIN_ASSETS)[number] | null>(null);
const visible = computed(() => filterAdminAssets(ADMIN_ASSETS, filters));
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Media Library" title="媒体素材库" description="集中管理图片、视频及其授权、处理、审核和使用位置；原文件计划进入对象存储，数据库只保存元数据与引用关系。">
      <template #actions><NuxtLink class="button button--ghost" to="/admin/uploads">查看上传任务</NuxtLink><button type="button" class="button" @click="showUpload = true">上传素材</button></template>
    </AdminPageHeading>
    <section class="admin-summary-strip" aria-label="素材概览">
      <div><span>全部素材</span><strong>486</strong><small>图片 391 · 视频 76</small></div>
      <div><span>存储使用</span><strong>38%</strong><small>演示配额 26.4 / 70 GB</small></div>
      <div><span>处理中</span><strong>07</strong><small>缩略图与视频转码</small></div>
      <div><span>待审核</span><strong>12</strong><small>公开授权与内容检查</small></div>
    </section>
    <section class="admin-list-card admin-media-workspace">
      <header><div><span>Asset Management</span><h2>全部媒体素材</h2></div><div class="admin-view-toggle"><button type="button" :class="{ 'is-active': view === 'grid' }" @click="view = 'grid'">网格</button><button type="button" :class="{ 'is-active': view === 'list' }" @click="view = 'list'">紧凑</button></div></header>
      <div class="admin-filters"><label>搜索素材<input v-model="filters.query" type="search" placeholder="文件名、作者或替代文本"></label><label>素材类型<select v-model="filters.type"><option>全部类型</option><option>图片</option><option>视频</option><option>文档</option></select></label><label>处理状态<select v-model="filters.state"><option>全部状态</option><option>可使用</option><option>处理中</option><option>异常</option></select></label></div>
      <div class="admin-asset-grid" :class="{ 'is-list': view === 'list' }">
        <button v-for="asset in visible" :key="asset.id" type="button" class="admin-asset-card" @click="selected = asset">
          <span class="admin-asset-visual" :style="{ '--asset-accent': asset.accent }"><i>&lt; HSD &gt;</i><small>{{ asset.type }} · {{ asset.dimensions }}</small></span>
          <span class="admin-asset-copy"><strong>{{ asset.name }}</strong><small>{{ asset.owner }} · {{ asset.size }}</small><span><AdminStatusPill :status="getAssetProcessingLabel(asset.processingStatus)" /><AdminStatusPill :status="canSelectAsset(asset) ? '可使用' : asset.reviewStatus === 'rejected' ? '审核退回' : '待审核'" /></span></span>
        </button>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="showUpload" class="admin-drawer-backdrop" @click.self="showUpload = false">
        <aside class="admin-candidate-drawer" aria-label="上传素材面板">
          <header class="admin-drawer__header"><div><span>UPLOAD QUEUE</span><h2>上传新素材</h2><p>原型展示分片上传、处理与审核状态</p></div><button type="button" aria-label="关闭上传面板" @click="showUpload = false">×</button></header>
          <div class="admin-drawer__body">
            <section><header><span>01</span><h3>选择文件</h3></header><button class="admin-upload-zone" type="button"><strong>拖放文件到这里，或选择本地文件</strong><small>图片建议单张不超过 20 MB；视频建议先完成剪辑与压缩</small></button></section>
            <section><header><span>02</span><h3>上传与处理队列</h3></header><div class="admin-upload-list"><article v-for="task in ADMIN_UPLOAD_TASKS" :key="task.id"><div><strong>{{ task.name }}</strong><small>{{ task.type }} · {{ task.note }}</small></div><AdminStatusPill :status="task.status" /><span><i :style="{ width: `${task.progress}%` }" /></span><b>{{ task.progress }}%</b></article></div></section>
            <section><header><span>03</span><h3>存储与审核说明</h3></header><p class="admin-inline-note">后端接入后：浏览器分片直传对象存储；服务端记录文件元数据；异步生成缩略图、转码、病毒扫描；审核通过后才可被官网选择。</p></section>
          </div>
          <footer class="admin-drawer__footer"><span>当前不会真正读取或上传本地文件</span><button type="button" class="button" @click="showUpload = false">保存演示任务</button></footer>
        </aside>
      </div>
      <div v-if="selected" class="admin-drawer-backdrop" @click.self="selected = null">
        <aside class="admin-candidate-drawer" aria-label="素材详情">
          <header class="admin-drawer__header"><div><span>ASSET DETAIL</span><h2>{{ selected.name }}</h2><p>{{ selected.type }} · {{ selected.dimensions }} · {{ selected.size }}</p></div><button type="button" aria-label="关闭素材详情" @click="selected = null">×</button></header>
          <div class="admin-drawer__body"><section><header><span>01</span><h3>预览与状态</h3></header><div class="admin-asset-detail-visual" :style="{ '--asset-accent': selected.accent }">&lt; HSD &gt;</div><p class="admin-inline-note">{{ canSelectAsset(selected) ? "该素材已完成处理和审核，可用于官网。" : "该素材尚未达到公开使用条件。" }}</p></section><section><header><span>02</span><h3>公开信息</h3></header><label>替代文本<textarea v-model="selected.alt" rows="3" placeholder="描述图片内容，帮助无障碍访问"></textarea></label></section><section><header><span>03</span><h3>使用位置</h3></header><ul class="admin-usage-list"><li v-for="usage in selected.usages" :key="usage">{{ usage }}</li><li v-if="!selected.usages.length">当前未被任何页面使用</li></ul></section></div>
          <footer class="admin-drawer__footer"><span>删除前将检查所有引用位置</span><button type="button" class="button button--ghost">移入回收站</button><button type="button" class="button">保存元数据</button></footer>
        </aside>
      </div>
    </Teleport>
  </div>
</template>
