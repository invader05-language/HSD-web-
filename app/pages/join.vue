<script setup lang="ts">
import { CENTERS } from "~/data/home";
import { buildLoginTarget } from "~/utils/login-continuation";

useHead({ title: "加入我们｜白云 HSD 开发者部落" });
const applyTarget = buildLoginTarget("/join/apply");
</script>

<template>
  <div>
    <PageBanner
      eyebrow="Join HSD · 2026"
      title="从你的兴趣出发，进入一次真实协作"
      description="无论你关注开发、摄影、设计、活动还是组织成长，都可以在四大中心找到适合的参与方式。"
      tone="red"
      media-label="招新主题视觉素材位"
    >
      <template #actions>
        <NuxtLink class="button button--light" :to="applyTarget">登录后填写报名表</NuxtLink>
        <NuxtLink class="button button--ghost" to="/help#recruitment">查看报名帮助</NuxtLink>
      </template>
    </PageBanner>
    <section class="section section--warm">
      <div class="shell">
        <div class="section-heading section-heading--wide">
          <div><p class="eyebrow">Choose Your Direction</p><h2>四个方向，任选其一开始</h2></div>
          <p>报名时选择一个首选中心和一个兴趣方向，后续可在培训与项目中跨中心协作。</p>
        </div>
        <div class="join-directions">
          <article v-for="center in CENTERS" :key="center.title">
            <span>{{ center.index }}</span><h3>{{ center.title }}</h3><p>{{ center.description }}</p>
          </article>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="shell join-process">
        <p class="eyebrow">Application Flow</p>
        <h2>报名流程</h2>
        <ol>
          <li><span>01</span><strong>登录并填写申请</strong><p>完善基础资料、方向偏好与个人介绍。</p></li>
          <li><span>02</span><strong>参加交流与基础考核</strong><p>了解彼此期待，完成对应方向的小任务。</p></li>
          <li><span>03</span><strong>查看结果与加入成长路径</strong><p>结果和后续安排仅本人登录后可见。</p></li>
        </ol>
        <NuxtLink class="button" :to="applyTarget">开始填写报名表</NuxtLink>
      </div>
    </section>
  </div>
</template>

