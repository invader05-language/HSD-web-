<script setup lang="ts">
import {
  ADMIN_MEMBERS,
  filterAdminMembers,
  type AdminMemberFilters
} from "~/data/admin-members";

definePageMeta({ layout: "admin" });
useHead({ title: "全体成员｜HSD 管理台" });

const filters = reactive<AdminMemberFilters>({
  query: "",
  center: "全部中心",
  identity: "全部身份",
  publicState: "全部状态"
});
const visible = computed(() => filterAdminMembers(ADMIN_MEMBERS, filters));
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Member Directory"
      title="全体成员"
      description="集中维护成员身份、中心归属和公开资料状态；个人考核与公开风采继续保持权限隔离。"
    >
      <template #actions><button type="button" class="button">添加成员</button></template>
    </AdminPageHeading>

    <section class="admin-summary-strip" aria-label="成员概览">
      <div><span>全部成员</span><strong>{{ ADMIN_MEMBERS.length }}</strong><small>当前 Mock 名单</small></div>
      <div><span>正式成员</span><strong>05</strong><small>已形成中心关系</small></div>
      <div><span>核心成员</span><strong>02</strong><small>重点职责人员</small></div>
      <div><span>资料待审核</span><strong>01</strong><small>公开前需要处理</small></div>
    </section>

    <section class="admin-list-card">
      <header><div><span>Member Management</span><h2>成员管理名单</h2></div><p>共 {{ visible.length }} 人</p></header>
      <div class="admin-filters">
        <label>搜索成员<input v-model="filters.query" type="search" placeholder="姓名或学号"></label>
        <label>所属中心<select v-model="filters.center"><option>全部中心</option><option>白泽开发中心</option><option>新媒体中心</option><option>拓维策划中心</option><option>人才发展中心</option></select></label>
        <label>当前身份<select v-model="filters.identity"><option>全部身份</option><option>正式成员</option><option>预备成员</option><option>核心成员</option></select></label>
        <label>公开资料<select v-model="filters.publicState"><option>全部状态</option><option>已公开</option><option>未公开</option><option>资料待审核</option></select></label>
      </div>
      <div class="admin-table-scroll">
        <table aria-label="成员管理名单">
          <thead><tr><th>成员</th><th>身份</th><th>中心</th><th>方向</th><th>年级</th><th>公开资料</th><th>更新时间</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>
            <tr v-for="member in visible" :key="member.id">
              <td><strong>{{ member.name }}</strong><small>{{ member.studentId }}</small></td>
              <td><AdminStatusPill :status="member.identity" /></td>
              <td>{{ member.center }}</td>
              <td>{{ member.direction }}</td>
              <td>{{ member.grade }}</td>
              <td><AdminStatusPill :status="member.publicState" /></td>
              <td>{{ member.updatedAt }}</td>
              <td><NuxtLink :to="`/admin/members/${member.id}`" :aria-label="`查看成员 ${member.name}`">查看/编辑</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
