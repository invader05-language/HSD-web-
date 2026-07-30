<script setup lang="ts">
definePageMeta({ layout: "admin" });
useHead({ title: "没有管理权限｜HSD 管理台" });
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <section class="admin-forbidden-state">
      <span>403 / PERMISSION REQUIRED</span>
      <h1>当前账号没有此项管理权限</h1>
      <p>你可以查看所属业务范围，但不能执行此页面要求的编辑或发布动作。如确需操作，请联系联盟总负责人调整角色或数据范围。</p>
      <dl><div><dt>缺少权限</dt><dd>system.permissions.edit</dd></div><div><dt>当前角色</dt><dd>中心负责人</dd></div><div><dt>允许范围</dt><dd>所属中心</dd></div></dl>
      <div><NuxtLink class="button button--ghost" to="/admin">返回工作台</NuxtLink><NuxtLink class="button" to="/admin/accounts">查看管理员账号</NuxtLink></div>
    </section>
  </div>
</template>
