<script setup lang="ts">
definePageMeta({ layout: "admin" });
useHead({ title: "管理员账号｜HSD 管理台" });
const accounts = [
  { name: "联盟管理员", account: "admin-alliance", role: "联盟总负责人", scope: "全联盟", state: "正常", last: "07-30 10:42" },
  { name: "陈同学", account: "baize-lead", role: "中心负责人", scope: "白泽开发中心", state: "正常", last: "07-30 08:58" },
  { name: "周同学", account: "media-admin", role: "媒体管理员", scope: "媒体与门户", state: "正常", last: "07-30 09:36" },
  { name: "内容编辑 03", account: "editor-03", role: "内容编辑", scope: "内容草稿", state: "已锁定", last: "07-29 23:18" }
];
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Administrator Accounts" title="管理员账号" description="分配管理角色、中心数据范围与账号状态；账号不得直接继承普通成员的公开资料设置。">
      <template #actions><button type="button" class="button">添加管理员</button></template>
    </AdminPageHeading>
    <section class="admin-list-card"><header><div><span>Accounts</span><h2>管理账号清单</h2></div><p>共 {{ accounts.length }} 个 Mock 账号</p></header><div class="admin-table-scroll"><table aria-label="管理员账号列表"><thead><tr><th>管理员</th><th>角色</th><th>数据范围</th><th>账号状态</th><th>最后访问</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="account in accounts" :key="account.account"><td><strong>{{ account.name }}</strong><small>{{ account.account }}</small></td><td>{{ account.role }}</td><td>{{ account.scope }}</td><td><AdminStatusPill :status="account.state" /></td><td>{{ account.last }}</td><td><button type="button">配置账号</button></td></tr></tbody></table></div></section>
  </div>
</template>
