<script setup lang="ts">
definePageMeta({ layout: "admin" });
useHead({ title: "活动报名名单｜HSD 管理台" });

const registrations = [
  { name: "周同学", id: "2026012042", activity: "2026 秋季招新宣讲会", center: "白泽开发中心", status: "报名成功", time: "07-30 09:21" },
  { name: "吴同学", id: "2026013156", activity: "2026 秋季招新宣讲会", center: "新媒体中心", status: "报名成功", time: "07-30 08:53" },
  { name: "秦同学", id: "2025008172", activity: "HarmonyOS 原生开发工作坊", center: "白泽开发中心", status: "候补", time: "07-29 21:40" }
];
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Registrations" title="活动报名名单" description="按活动集中查看报名信息、候补状态与导出范围；真实个人数据需由后端按权限返回。">
      <template #actions><button class="button button--ghost" type="button">配置报名字段</button><button class="button" type="button">导出当前名单</button></template>
    </AdminPageHeading>
    <section class="admin-list-card">
      <header><div><span>Registration Records</span><h2>当前活动报名</h2></div><p>共 164 人 · 以下为 Mock 样例</p></header>
      <div class="admin-filters"><label>搜索报名人<input type="search" placeholder="姓名或学号"></label><label>活动<select><option>全部活动</option><option>2026 秋季招新宣讲会</option><option>HarmonyOS 原生开发工作坊</option></select></label><label>报名状态<select><option>全部状态</option><option>报名成功</option><option>候补</option><option>已取消</option></select></label></div>
      <div class="admin-table-scroll"><table aria-label="活动报名名单"><thead><tr><th>报名人</th><th>活动</th><th>意向中心</th><th>状态</th><th>报名时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="item in registrations" :key="item.id"><td><strong>{{ item.name }}</strong><small>{{ item.id }}</small></td><td>{{ item.activity }}</td><td>{{ item.center }}</td><td><AdminStatusPill :status="item.status" /></td><td>{{ item.time }}</td><td><button type="button">查看详情</button></td></tr></tbody></table></div>
    </section>
  </div>
</template>
