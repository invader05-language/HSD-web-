<script setup lang="ts">
import { useSessionStore } from "~/stores/session";

definePageMeta({ layout: "admin" });
useHead({ title: "没有管理权限｜HSD 管理台" });
const route = useRoute();
const session = useSessionStore();
const account = computed(() => session.currentAccount);
const levelLabel = computed(() => {
  if (session.adminLevel === "owner") return "联盟总负责人";
  if (session.adminLevel === "admin") return "平台管理员";
  return "普通成员";
});
const requiredAccess = computed(() =>
  route.path.toLowerCase().replace(/\/+$/, "") === "/admin/accounts"
    ? "联盟总负责人资格"
    : "平台管理员资格"
);
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <section class="admin-forbidden-state">
      <span>403 / PERMISSION REQUIRED</span>
      <h1>当前账号没有此项管理权限</h1>
      <p>当前账号无法进入此管理页面。管理员资格配置仅对联盟总负责人开放；其他管理模块需要已启用的平台管理员资格。</p>
      <dl><div><dt>当前账号</dt><dd>{{ account?.name ?? "未登录" }}（{{ account?.account ?? "-" }}）</dd></div><div><dt>当前管理级别</dt><dd>{{ levelLabel }}</dd></div><div><dt>缺少资格</dt><dd>{{ requiredAccess }}</dd></div></dl>
      <div><NuxtLink class="button button--ghost" to="/admin">返回工作台</NuxtLink><NuxtLink class="button" to="/">返回官网</NuxtLink></div>
    </section>
  </div>
</template>
