<script setup lang="ts">
import { ADMIN_AUDIT_RECORDS, filterAuditRecords } from "~/data/admin-system";

definePageMeta({ layout: "admin" });
useHead({ title: "操作日志｜HSD 管理台" });
const filters = reactive({ query: "", module: "全部模块", result: "全部结果" });
const selected = ref<(typeof ADMIN_AUDIT_RECORDS)[number] | null>(null);
const visible = computed(() => filterAuditRecords(ADMIN_AUDIT_RECORDS, filters));
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Audit Log" title="操作日志" description="追踪敏感操作的执行人、对象、前后状态、结果、时间、IP 与设备，便于后续审计与问题回溯。">
      <template #actions><button type="button" class="button button--ghost">导出日志</button></template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><span>Audit Records</span><h2>管理员操作日志</h2></div><p>默认保留 180 天 · 当前为 Mock 数据</p></header>
      <div class="admin-filters"><label>搜索日志<input v-model="filters.query" type="search" placeholder="操作人、动作或对象"></label><label>业务模块<select v-model="filters.module"><option>全部模块</option><option>招新与考核</option><option>组织与成员</option><option>媒体与资源</option><option>系统与权限</option></select></label><label>执行结果<select v-model="filters.result"><option>全部结果</option><option>成功</option><option>失败</option></select></label></div>
      <div class="admin-table-scroll"><table aria-label="管理员操作日志"><thead><tr><th>操作人</th><th>模块 / 动作</th><th>对象</th><th>结果</th><th>时间</th><th>IP / 设备</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="record in visible" :key="record.id"><td><strong>{{ record.actor }}</strong><small>{{ record.role }}</small></td><td><strong>{{ record.action }}</strong><small>{{ record.module }}</small></td><td>{{ record.target }}</td><td><AdminStatusPill :status="record.result" /></td><td>{{ record.time }}</td><td>{{ record.ip }}<br><small>{{ record.device }}</small></td><td><button type="button" @click="selected = record">变更前 / 变更后</button></td></tr></tbody></table></div>
    </section>
    <Teleport to="body"><div v-if="selected" class="admin-drawer-backdrop" @click.self="selected = null"><aside class="admin-candidate-drawer" aria-label="日志详情"><header class="admin-drawer__header"><div><span>AUDIT DETAIL</span><h2>{{ selected.action }}</h2><p>{{ selected.time }} · {{ selected.actor }}</p></div><button type="button" aria-label="关闭日志详情" @click="selected = null">×</button></header><div class="admin-drawer__body"><section><header><span>01</span><h3>变更前 / 变更后</h3></header><div class="admin-audit-diff"><article><span>BEFORE</span><p>{{ selected.before }}</p></article><article><span>AFTER</span><p>{{ selected.after }}</p></article></div></section><section><header><span>02</span><h3>请求环境</h3></header><dl class="admin-detail-grid"><div><dt>执行角色</dt><dd>{{ selected.role }}</dd></div><div><dt>执行结果</dt><dd>{{ selected.result }}</dd></div><div><dt>IP 地址</dt><dd>{{ selected.ip }}</dd></div><div><dt>设备</dt><dd>{{ selected.device }}</dd></div></dl></section></div><footer class="admin-drawer__footer"><span>审计日志不允许由普通管理员修改</span><button type="button" class="button" @click="selected = null">关闭</button></footer></aside></div></Teleport>
  </div>
</template>
