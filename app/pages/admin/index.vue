<script setup lang="ts">
import {
  ADMIN_CONTENT_ACTIVITY,
  ADMIN_DASHBOARD_METRICS,
  ADMIN_QUICK_CREATE,
  ADMIN_RECENT_ACTIVITY,
  ADMIN_RECRUITMENT_PROGRESS,
  ADMIN_STORAGE_OVERVIEW,
  ADMIN_TODOS
} from "~/data/admin-dashboard";

definePageMeta({ layout: "admin" });
useHead({ title: "管理工作台｜白云 HSD 开发者部落" });

const quickCreateOpen = ref(false);
</script>

<template>
  <div class="admin-recruitment-page admin-dashboard-page">
    <AdminPageHeading
      eyebrow="Alliance Operations"
      title="管理工作台"
      description="先处理影响成员与公开内容的事项，再进入各业务模块完成日常管理。"
    >
      <template #actions>
        <div class="admin-quick-create">
          <button
            type="button"
            class="button"
            aria-haspopup="menu"
            :aria-expanded="quickCreateOpen"
            @click="quickCreateOpen = !quickCreateOpen"
          >
            ＋ 新建
          </button>
          <div v-if="quickCreateOpen" role="menu" aria-label="快捷新建">
            <NuxtLink
              v-for="item in ADMIN_QUICK_CREATE"
              :key="item.label"
              :to="item.to"
              role="menuitem"
            >
              {{ item.label }}
              <span>→</span>
            </NuxtLink>
          </div>
        </div>
      </template>
    </AdminPageHeading>

    <section class="admin-dashboard-metrics" aria-label="核心管理指标">
      <NuxtLink
        v-for="metric in ADMIN_DASHBOARD_METRICS"
        :key="metric.label"
        :to="metric.to"
        :data-tone="metric.tone"
      >
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.description }}</small>
        <i aria-hidden="true">↗</i>
      </NuxtLink>
    </section>

    <div class="admin-dashboard-grid">
      <section class="admin-dashboard-panel admin-dashboard-todos">
        <header>
          <div><span>Priority Queue</span><h2>今日待办</h2></div>
          <small>按风险与截止时间排序</small>
        </header>
        <div>
          <NuxtLink
            v-for="todo in ADMIN_TODOS"
            :key="todo.id"
            :to="todo.to"
            :data-priority="todo.priority"
          >
            <span>{{ todo.type }}</span>
            <div><strong>{{ todo.title }}</strong><small>{{ todo.meta }}</small></div>
            <b>立即处理 →</b>
          </NuxtLink>
        </div>
      </section>

      <section class="admin-dashboard-panel admin-dashboard-recruitment">
        <header>
          <div><span>Recruitment 2026</span><h2>招新进度</h2></div>
          <NuxtLink to="/admin/recruitment">进入考核台 →</NuxtLink>
        </header>
        <div>
          <article v-for="item in ADMIN_RECRUITMENT_PROGRESS" :key="item.label">
            <div><strong>{{ item.label }}</strong><small>{{ item.meta }}</small></div>
            <b>{{ item.value }}</b>
          </article>
        </div>
      </section>

      <section class="admin-dashboard-panel admin-dashboard-content">
        <header>
          <div><span>Publishing</span><h2>内容发布动态</h2></div>
          <NuxtLink to="/admin/content">查看全部 →</NuxtLink>
        </header>
        <div>
          <article v-for="item in ADMIN_CONTENT_ACTIVITY" :key="item.title">
            <span>{{ item.type }}</span>
            <strong>{{ item.title }}</strong>
            <AdminStatusPill :status="item.status" />
            <small>{{ item.time }}</small>
          </article>
        </div>
      </section>

      <section class="admin-dashboard-panel admin-dashboard-storage">
        <header>
          <div><span>Assets & Storage</span><h2>媒体与存储</h2></div>
          <NuxtLink to="/admin/media">管理素材 →</NuxtLink>
        </header>
        <div>
          <article v-for="item in ADMIN_STORAGE_OVERVIEW" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.meta }}</small>
          </article>
        </div>
        <footer><span>Mock 存储配额</span><strong>37.4 GB / 100 GB</strong></footer>
      </section>
    </div>

    <section class="admin-dashboard-panel admin-dashboard-recent">
      <header>
        <div><span>Audit Preview</span><h2>最近操作记录</h2></div>
        <NuxtLink to="/admin/logs">完整日志 →</NuxtLink>
      </header>
      <div>
        <article v-for="(item, index) in ADMIN_RECENT_ACTIVITY" :key="item.action">
          <span>{{ String(index + 1).padStart(2, "0") }}</span>
          <strong>{{ item.actor }}</strong>
          <p>{{ item.action }}</p>
          <small>{{ item.time }}</small>
        </article>
      </div>
    </section>
  </div>
</template>
