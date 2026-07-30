<script setup lang="ts">
import {
  ADMIN_ROLES,
  PERMISSION_MODULES,
  type PermissionAction
} from "~/data/admin-system";

definePageMeta({ layout: "admin" });
useHead({ title: "角色权限｜HSD 管理台" });

const selectedRoleId = ref("alliance-lead");
const showConfirm = ref(false);
const selectedRole = computed(() => ADMIN_ROLES.find((role) => role.id === selectedRoleId.value)!);
const actions: { id: PermissionAction; label: string }[] = [
  { id: "view", label: "查看" },
  { id: "create", label: "新建" },
  { id: "edit", label: "编辑" },
  { id: "review", label: "审核" },
  { id: "publish", label: "发布" },
  { id: "export", label: "导出" }
];
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Roles & Permissions" title="角色权限" description="通过角色、业务域与动作三级边界控制管理能力；前端原型只展示权限语义，真实 API 仍须服务端逐次校验。">
      <template #actions><button type="button" class="button" aria-label="保存权限配置" @click="showConfirm = true">保存权限配置</button></template>
    </AdminPageHeading>
    <section class="admin-role-layout">
      <aside class="admin-role-list">
        <header><span>ROLE TYPES</span><h2>管理角色</h2></header>
        <button v-for="role in ADMIN_ROLES" :key="role.id" type="button" :class="{ 'is-active': role.id === selectedRoleId }" @click="selectedRoleId = role.id"><span>{{ role.users }}</span><strong>{{ role.name }}</strong><small>{{ role.scope }}</small></button>
        <footer><button type="button">＋ 新建自定义角色</button></footer>
      </aside>
      <div class="admin-role-main">
        <header><div><span>PERMISSION MATRIX</span><h2>{{ selectedRole.name }}</h2><p>{{ selectedRole.description }}</p></div><AdminStatusPill :status="`${selectedRole.users} 个账号`" /></header>
        <div class="admin-table-scroll"><table aria-label="角色权限矩阵"><thead><tr><th>业务模块</th><th v-for="action in actions" :key="action.id">{{ action.label }}</th></tr></thead><tbody><tr v-for="module in PERMISSION_MODULES" :key="module.id"><td><strong>{{ module.label }}</strong><small>{{ module.id }}</small></td><td v-for="action in actions" :key="action.id"><label class="admin-permission-check"><input type="checkbox" :checked="selectedRole.permissions[module.id]?.includes(action.id)" :disabled="selectedRole.id === 'alliance-lead'"><span>{{ selectedRole.permissions[module.id]?.includes(action.id) ? "允许" : "禁止" }}</span></label></td></tr></tbody></table></div>
        <footer><p>中心负责人访问成员与考核数据时，还需叠加“所属中心”数据范围。</p><span>最近修改：2026-07-28 · 联盟管理员</span></footer>
      </div>
    </section>
    <Teleport to="body">
      <div v-if="showConfirm" class="admin-drawer-backdrop admin-modal-center" @click.self="showConfirm = false">
        <section class="admin-system-confirm"><span>HIGH RISK CHANGE</span><h2>确认修改角色权限？</h2><p>这会影响 {{ selectedRole.users }} 个账号在招新、成员、内容和资源等模块中的操作范围。真实系统会要求重新验证身份并记录审计日志。</p><dl><div><dt>角色</dt><dd>{{ selectedRole.name }}</dd></div><div><dt>数据范围</dt><dd>{{ selectedRole.scope }}</dd></div><div><dt>影响账号</dt><dd>{{ selectedRole.users }} 个</dd></div></dl><footer><button type="button" class="button button--ghost" @click="showConfirm = false">取消修改</button><button type="button" class="button" @click="showConfirm = false">确认保存并记录日志</button></footer></section>
      </div>
    </Teleport>
  </div>
</template>
