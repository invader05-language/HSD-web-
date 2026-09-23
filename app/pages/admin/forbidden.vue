<script setup lang="ts">
import { getAdminQualificationLabel } from "~/data/admin-system";
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import {
  getAdminPermissionRequirement,
  resolveProtectedRouteTarget,
  type AdminRequiredAccess,
} from "~/utils/route-access";

definePageMeta({ layout: "admin" });
useHead({ title: "没有管理权限｜HSD 管理台" });
const route = useRoute();
const session = useSessionStore();
const account = computed(() => session.currentAccount);
const required = computed<AdminRequiredAccess>(() => {
  const value = route.query.required;
  return value === "owner" || value === "scope" || value === "center"
    ? value
    : getAdminPermissionRequirement(route.query.from);
});
const requiredAccess = computed(() => ({
  owner: "联盟总负责人资格",
  center: "中心负责人资格",
  scope: "对应中心范围权限",
}[required.value]));
const reason = computed(() => String(route.query.reason ?? "permission_required"));

onMounted(async () => {
  if (!session.isAuthenticated) return;
  const config = useRuntimeConfig() as { public: { useMockApi: boolean; apiBase: string } };
  await session.refreshForRuntime(config.public, useSessionGateway());
  const target = resolveProtectedRouteTarget(route.path, route.fullPath, session);
  if (target) await navigateTo(target, { replace: true });
});
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <section class="admin-forbidden-state">
      <span>403 / PERMISSION REQUIRED</span>
      <h1>当前账号没有此项管理权限</h1>
      <p>当前账号无法进入此管理页面。请确认账号已配置并启用对应管理资格。</p>
      <dl><div><dt>当前账号</dt><dd>{{ account?.name ?? "未登录" }}（{{ account?.account ?? "-" }}）</dd></div><div><dt>当前管理级别</dt><dd>{{ account ? getAdminQualificationLabel(account) : "未登录" }}</dd></div><div><dt>所需资格</dt><dd>{{ requiredAccess }}</dd></div><div><dt>拦截原因</dt><dd>{{ reason }}</dd></div></dl>
      <div><NuxtLink class="button button--ghost" to="/admin">返回工作台</NuxtLink><NuxtLink class="button" to="/">返回官网</NuxtLink></div>
    </section>
  </div>
</template>
