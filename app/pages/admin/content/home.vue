<script setup lang="ts">
import { HOMEPAGE_SLOTS } from "~/data/admin-content";

definePageMeta({ layout: "admin" });
useHead({ title: "首页内容配置｜HSD 管理台" });
const saved = ref(false);
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Homepage Curation" title="首页内容配置" description="首页结构遵循已经定稿的用户端信息架构；这里只调整每个模块中的内容与顺序。">
      <template #actions><button type="button" class="button button--ghost">预览官网首页</button><button type="button" class="button" @click="saved = true">保存配置</button></template>
    </AdminPageHeading>
    <div class="admin-fixed-notice"><strong>固定模块，不允许删除</strong><p>可调整模块内条目顺序和替换推荐内容；模块数量、位置和容量由前端设计基线控制。</p><span v-if="saved">已保存到当前 Mock 会话</span></div>
    <section class="admin-home-slots" aria-label="首页固定模块">
      <article v-for="(slot, index) in HOMEPAGE_SLOTS" :key="slot.id">
        <header><div><span>{{ String(index + 1).padStart(2, "0") }} / FIXED SLOT</span><h2>{{ slot.label }}</h2><p>{{ slot.description }}</p></div><AdminStatusPill :status="`${slot.current} / ${slot.capacity}`" /></header>
        <ol><li v-for="(item, itemIndex) in slot.items" :key="item"><b aria-hidden="true">⋮⋮</b><span>{{ itemIndex + 1 }}</span><strong>{{ item }}</strong><button type="button">替换</button></li><li v-for="empty in slot.capacity - slot.current" :key="`empty-${empty}`" class="is-empty"><b>+</b><span>{{ slot.current + empty }}</span><strong>添加推荐内容</strong><button type="button">选择</button></li></ol>
        <footer><small>容量上限 {{ slot.capacity }} 条</small><button type="button">查看用户端预览 →</button></footer>
      </article>
    </section>
  </div>
</template>
