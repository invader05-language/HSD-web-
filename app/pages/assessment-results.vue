<script setup lang="ts">
useHead({ title: "考核结果｜白云 HSD 开发者部落" });
</script>

<template>
  <main class="assessment-page">
    <section class="assessment-page__header">
      <div class="shell">
        <p class="eyebrow">Assessment Results</p>
        <h1>考核结果</h1>
        <p>该页面用于承载成员个人考核信息。</p>
      </div>
    </section>
    <section class="section">
      <div class="shell assessment-empty">
        <p class="eyebrow">Data Connection</p>
        <h2>考核数据暂未接入</h2>
        <p>后端和数据库字段确认后，将根据正式数据契约设计展示结构。</p>
        <div class="button-row">
          <NuxtLink class="button button--dark" to="/member">返回成员空间</NuxtLink>
          <NuxtLink class="button button--ghost" to="/">返回首页</NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>
