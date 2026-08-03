<script setup lang="ts">
import { getAdminQualificationLabel } from "~/data/admin-system";
import { useSessionStore } from "~/stores/session";
import { getRequiredAdminAccess } from "~/utils/route-access";

definePageMeta({ layout: "admin" });
useHead({ title: "没有管理权限｜HSD 管理台" });
const route = useRoute();
const session = useSessionStore();
const account = computed(() => session.currentAccount);
const requiredAccess = computed(() =>
  getRequiredAdminAccess(route.query.from) === "owner"
    ? "联盟总负责人资格"
    : "中心负责人资格"
);
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <section class="admin-forbidden-state">
      <span>403 / PERMISSION REQUIRED</span>
      <h1>当前账号没有此项管理权限</h1>
      <p>当前账号无法进入此管理页面。管理员资格配置仅对联盟总负责人开放；其他管理模块需要已启用的中心负责人资格。</p>
      <dl><div><dt>当前账号</dt><dd>{{ account?.name ?? "未登录" }}（{{ account?.account ?? "-" }}）</dd></div><div><dt>当前管理级别</dt><dd>{{ account ? getAdminQualificationLabel(account) : "未登录" }}</dd></div><div><dt>缺少资格</dt><dd>{{ requiredAccess }}</dd></div></dl>
      <div><NuxtLink class="button button--ghost" to="/admin">返回工作台</NuxtLink><NuxtLink class="button" to="/">返回官网</NuxtLink></div>
    </section>
  </div>
</template>
