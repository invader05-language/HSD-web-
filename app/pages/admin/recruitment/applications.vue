<script setup lang="ts">
import { ADMIN_CANDIDATES } from "~/data/recruitment-admin";

definePageMeta({ layout: "admin" });
useHead({ title: "报名人员｜HSD 管理台" });

const query = ref("");
const center = ref("全部中心");
const visible = computed(() =>
  ADMIN_CANDIDATES.filter((candidate) => {
    const matchesQuery = `${candidate.name}${candidate.studentId}`.includes(query.value.trim());
    const matchesCenter = center.value === "全部中心" || candidate.preferences[0] === center.value;
    return matchesQuery && matchesCenter;
  })
);
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Applications"
      title="报名人员"
      description="查看本批次报名资料和三个中心志愿；考核操作仍在预备成员考核台完成。"
    >
      <template #actions><button type="button" class="button button--ghost">导出当前名单</button></template>
    </AdminPageHeading>

    <section class="admin-list-card">
      <header>
        <div><span>Application Roster</span><h2>2026 秋季招新报名</h2></div>
        <p>共 {{ visible.length }} 人</p>
      </header>
      <div class="admin-filters">
        <label>搜索报名人<input v-model="query" type="search" placeholder="姓名或学号"></label>
        <label>第一志愿<select v-model="center"><option>全部中心</option><option>白泽开发中心</option><option>新媒体中心</option><option>拓维策划中心</option><option>人才发展中心</option></select></label>
        <label>报名状态<select><option>全部状态</option><option>资料完整</option><option>需要补充</option></select></label>
        <label>报名时间<select><option>最近提交</option><option>最早提交</option></select></label>
      </div>
      <div class="admin-table-scroll">
        <table aria-label="招新报名人员">
          <thead><tr><th>报名人</th><th>第一志愿</th><th>第二志愿</th><th>第三志愿</th><th>白泽方向</th><th>接受调剂</th><th>提交时间</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>
            <tr v-for="candidate in visible" :key="candidate.id">
              <td><strong>{{ candidate.name }}</strong><small>{{ candidate.studentId }}</small></td>
              <td>{{ candidate.preferences[0] }}</td>
              <td>{{ candidate.preferences[1] || "—" }}</td>
              <td>{{ candidate.preferences[2] || "—" }}</td>
              <td>{{ candidate.baizeDirection || "—" }}</td>
              <td>{{ candidate.acceptsAdjustment ? "接受" : "不接受" }}</td>
              <td>{{ candidate.updatedAt }}</td>
              <td><button type="button" :aria-label="`查看报名 ${candidate.name}`">查看报名</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
