<script setup lang="ts">
import { onMounted } from "vue";
import { PORTAL_CONTENT_KIND_LABELS, PORTAL_CONTENT_STATUS_LABELS } from "~/data/admin-content";
import { useAdminDashboard } from "~/composables/useAdminDashboard";
import { dashboardTargetToRoute } from "~/utils/admin-dashboard-routes";
import type { DashboardCapability, DashboardTarget, RecruitmentDashboardContext } from "~/types/admin-dashboard";

definePageMeta({ layout: "admin" });
useHead({ title: "管理工作台｜白云 HSD 开发者部落" });

const quickCreateOpen = ref(false);
const quickMenu = ref<HTMLElement>();
const { snapshot, loading, error, refresh } = useAdminDashboard();

const quickActions: Array<{
  label: string;
  capability: DashboardCapability;
  target: DashboardTarget;
}> = [
  { label: "发布 HSD 快讯", capability: "content.create", target: { module: "content", action: "create", resourceType: "content", resourceId: "flash" } },
  { label: "新建新闻", capability: "content.create", target: { module: "content", action: "create", resourceType: "content", resourceId: "article" } },
  { label: "新建公告", capability: "content.create", target: { module: "content", action: "create", resourceType: "content", resourceId: "notice" } },
  { label: "添加成员", capability: "member.create", target: { module: "member", action: "create" } },
];

const availableQuickActions = computed(() => quickActions.filter((action) => (
  snapshot.value?.operator.capabilities.includes(action.capability)
)));

function routeFor(target: DashboardTarget) {
  return dashboardTargetToRoute(target);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function batchStatusLabel(status: RecruitmentDashboardContext["batch"]["status"]) {
  return {
    draft: "草稿",
    upcoming: "即将开放",
    open: "报名开放中",
    paused: "已暂停",
    closed: "报名已关闭",
    archived: "已归档",
  }[status];
}

function selectionLabel(selection: RecruitmentDashboardContext["selection"]) {
  return {
    open: "当前开放批次",
    paused: "当前暂停批次",
    "unfinished-work": "待完成收尾批次",
    upcoming: "下一开放批次",
  }[selection];
}

function actionLabel(target: DashboardTarget) {
  if (target.action === "manage") return "管理批次";
  if (target.action === "assess") return "进入考核";
  if (target.action === "publish-results") return "发布结果";
  return "查看详情";
}

async function focusQuickMenuItem(index = 0) {
  await nextTick();
  const items = Array.from(quickMenu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  items[Math.max(0, Math.min(index, items.length - 1))]?.focus();
}

function handleQuickCreateKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    quickCreateOpen.value = false;
    return;
  }
  if ((event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") && !quickCreateOpen.value) {
    event.preventDefault();
    quickCreateOpen.value = true;
    void focusQuickMenuItem();
  }
}

function handleQuickMenuKeydown(event: KeyboardEvent) {
  const items = Array.from(quickMenu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const current = items.indexOf(document.activeElement as HTMLElement);
  if (event.key === "Escape") {
    event.preventDefault();
    quickCreateOpen.value = false;
    document.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus();
    return;
  }
  if (!items.length || !["ArrowDown", "ArrowUp"].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === "ArrowDown"
    ? (current + 1) % items.length
    : (current - 1 + items.length) % items.length;
  items[next]?.focus();
}

onMounted(() => {
  void refresh();
});
</script>

<template>
  <div class="admin-recruitment-page admin-dashboard-page">
    <AdminPageHeading
      eyebrow="Alliance Operations"
      title="管理工作台"
      :description="snapshot ? `当前操作人：${snapshot.operator.name}。优先处理会影响成员、招新和门户公开状态的事项。` : '正在读取当前权限范围内的运营事项。'"
    >
      <template #actions>
        <div v-if="snapshot" class="admin-dashboard-operator" aria-label="当前操作人">
          <span>{{ snapshot.operator.level === "owner" ? "联盟总负责人" : "中心负责人" }}</span>
          <strong>{{ snapshot.operator.name }}</strong>
        </div>
        <div v-if="availableQuickActions.length" class="admin-quick-create">
          <button
            type="button"
            class="button"
            aria-haspopup="menu"
            :aria-expanded="quickCreateOpen"
            @click="quickCreateOpen = !quickCreateOpen"
            @keydown="handleQuickCreateKeydown"
          >
            ＋ 新建
          </button>
          <div v-if="quickCreateOpen" ref="quickMenu" role="menu" aria-label="快捷新建" @keydown="handleQuickMenuKeydown">
            <NuxtLink
              v-for="item in availableQuickActions"
              :key="item.label"
              :to="routeFor(item.target)"
              role="menuitem"
              @click="quickCreateOpen = false"
            >
              {{ item.label }}
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </div>
        </div>
      </template>
    </AdminPageHeading>

    <section v-if="loading && !snapshot" class="admin-dashboard-state" aria-live="polite">
      <strong>正在加载工作台</strong>
      <span>正在汇总当前权限范围内的运营状态。</span>
    </section>

    <section v-else-if="error && !snapshot" class="admin-dashboard-state is-error" role="alert">
      <strong>工作台暂时无法加载</strong>
      <span>{{ error.message }}</span>
      <button type="button" class="button button--ghost" @click="refresh()">重新加载</button>
    </section>

    <template v-else-if="snapshot">
      <section v-if="snapshot.warnings.length" class="admin-dashboard-warnings" aria-label="需要关注的异常">
        <NuxtLink
          v-for="warning in snapshot.warnings"
          :key="warning.code"
          :to="routeFor(warning.target)"
          :data-level="warning.level"
        >
          <span>{{ warning.level === "error" ? "异常" : "提醒" }}</span>
          <strong>{{ warning.title }}</strong>
          <small>{{ warning.detail || `${warning.count} 项待处理` }}</small>
          <b>{{ warning.count }}</b>
        </NuxtLink>
      </section>

      <section class="admin-dashboard-metrics" aria-label="核心管理指标">
        <NuxtLink
          v-for="metric in snapshot.metrics"
          :key="metric.id"
          :to="routeFor(metric.target)"
          :data-tone="metric.id === 'system-warnings' && metric.value ? 'red' : 'default'"
        >
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <small>{{ metric.detail || "查看相关工作" }}</small>
          <i aria-hidden="true">↗</i>
        </NuxtLink>
      </section>

      <div class="admin-dashboard-grid">
        <section class="admin-dashboard-panel admin-dashboard-todos">
          <header>
            <div><span>Priority Queue</span><h2>优先队列</h2></div>
            <small>仅显示当前权限可处理事项</small>
          </header>
          <div v-if="snapshot.tasks.length">
            <NuxtLink
              v-for="task in snapshot.tasks"
              :key="task.id"
              :to="routeFor(task.target)"
              :data-priority="task.priority"
            >
              <span>{{ task.priority === "urgent" ? "优先" : task.priority === "warning" ? "关注" : "常规" }}</span>
              <div><strong>{{ task.title }}</strong><small>{{ task.meta || "进入相关模块处理" }}</small></div>
              <b>处理 →</b>
            </NuxtLink>
          </div>
          <p v-else class="admin-dashboard-empty">当前没有需要你处理的优先事项。</p>
        </section>

        <section class="admin-dashboard-panel admin-dashboard-recruitment">
          <header>
            <div><span>Recruitment Operations</span><h2>当前操作批次</h2></div>
            <NuxtLink :to="routeFor({ module: 'recruitment', action: 'manage' })">查看批次 →</NuxtLink>
          </header>
          <template v-if="snapshot.recruitment">
            <div class="admin-dashboard-batch">
              <div class="admin-dashboard-batch__intro">
                <span>{{ selectionLabel(snapshot.recruitment.selection) }}</span>
                <strong>{{ snapshot.recruitment.batch.name }}</strong>
                <small>批次 ID：{{ snapshot.recruitment.batch.id }}</small>
              </div>
              <AdminStatusPill :status="batchStatusLabel(snapshot.recruitment.batch.status)" />
              <dl>
                <div><dt>报名人数</dt><dd>{{ snapshot.recruitment.applicationCount }}</dd></div>
                <div><dt>待考核</dt><dd>{{ snapshot.recruitment.assessment.pending }}</dd></div>
                <div><dt>待调整</dt><dd>{{ snapshot.recruitment.assessment.adjustmentPending }}</dd></div>
              </dl>
              <div class="admin-dashboard-batch__actions">
                <NuxtLink
                  v-for="action in snapshot.recruitment.actions"
                  :key="action.capability"
                  :to="routeFor(action.target)"
                >{{ actionLabel(action.target) }} →</NuxtLink>
              </div>
            </div>
          </template>
          <p v-else class="admin-dashboard-empty">当前没有可操作或即将开放的招新批次。</p>
        </section>

        <section class="admin-dashboard-panel admin-dashboard-content">
          <header>
            <div><span>Publishing</span><h2>内容发布动态</h2></div>
            <NuxtLink :to="routeFor({ module: 'content', action: 'list' })">查看全部 →</NuxtLink>
          </header>
          <div v-if="snapshot.content.recent.length">
            <NuxtLink
              v-for="item in snapshot.content.recent"
              :key="item.id"
              :to="routeFor(item.target)"
            >
              <span>{{ PORTAL_CONTENT_KIND_LABELS[item.kind] }}</span>
              <strong>{{ item.title }}</strong>
              <AdminStatusPill :status="PORTAL_CONTENT_STATUS_LABELS[item.status]" />
              <small>{{ formatTime(item.updatedAt) }}</small>
            </NuxtLink>
          </div>
          <p v-else class="admin-dashboard-empty">暂无最近更新的门户内容。</p>
        </section>

        <div class="admin-dashboard-side-stack">
          <section v-if="snapshot.portal" class="admin-dashboard-panel admin-dashboard-portal">
            <header>
              <div><span>Portal State</span><h2>门户发布状态</h2></div>
              <NuxtLink :to="routeFor({ module: 'portal', action: 'configure' })">配置门户 →</NuxtLink>
            </header>
            <div>
              <article>
                <span>当前草稿</span>
                <strong>R{{ snapshot.portal.draftRevision }}</strong>
                <small>{{ snapshot.portal.isDirty ? "有未发布变更" : "与已发布版本一致" }}</small>
              </article>
              <article>
                <span>线上版本</span>
                <strong>R{{ snapshot.portal.publishedRevision }}</strong>
                <small>{{ snapshot.portal.isDirty ? "等待负责人整份发布" : "当前版本已发布" }}</small>
              </article>
            </div>
          </section>

        </div>
      </div>
    </template>

    <section v-else class="admin-dashboard-state" aria-live="polite">
      <strong>当前没有可展示的工作台数据</strong>
      <span>请稍后重新加载，或返回对应模块继续处理。</span>
    </section>
  </div>
</template>
