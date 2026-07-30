<script setup lang="ts">
import { CORE_MEMBER_PLACEMENTS } from "~/data/admin-members";
definePageMeta({ layout: "admin" });
useHead({ title: "核心人员配置｜HSD 管理台" });
const featuredPlacement = CORE_MEMBER_PLACEMENTS[0]!;
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Core People" title="核心人员配置" description="从正式成员中选择重点职责人员，配置任期、公开状态和部落介绍中的展示顺序。">
      <template #actions><button class="button">添加核心人员</button></template>
    </AdminPageHeading>
    <div class="admin-split-workspace">
      <section class="admin-list-card">
        <header><div><span>Display Order</span><h2>核心人员展示顺序</h2></div><p>拖动手柄仅作原型展示</p></header>
        <div class="admin-order-list">
          <article v-for="(person, index) in CORE_MEMBER_PLACEMENTS" :key="person.id">
            <b>⠿</b><span>{{ String(index + 1).padStart(2, "0") }}</span>
            <div><strong>{{ person.name }}</strong><small>{{ person.role }}</small></div>
            <p>{{ person.term }}</p>
            <AdminStatusPill :status="person.public ? '公开展示' : '暂不公开'" />
            <button>编辑</button>
          </article>
        </div>
      </section>
      <aside class="admin-preview-panel">
        <span>Public Preview</span><h2>部落介绍展示预览</h2><p>公开页面继续读取成员的统一头像和公开资料，不保存重复副本。</p>
        <div><strong>&lt; HSD &gt;</strong><h3>{{ featuredPlacement.name }}</h3><p>{{ featuredPlacement.role }}</p></div>
        <NuxtLink to="/about#core-team" target="_blank">在新窗口预览部落介绍 →</NuxtLink>
      </aside>
    </div>
  </div>
</template>
