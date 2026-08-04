<script setup lang="ts">
import { CENTERS } from "~/data/home";
import { useSessionStore } from "~/stores/session";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { resolveLoginAwareTarget } from "~/utils/login-continuation";

useHead({ title: "加入我们｜白云 HSD 开发者部落" });
const session = useSessionStore();
const batchStore = useRecruitmentBatchStore();
const route = useRoute();
const isJoinLanding = computed(() => route.path === "/join");
const currentBatch = computed(() => batchStore.currentOpenBatch);
const upcomingBatch = computed(() => batchStore.upcomingBatch);
const canApply = computed(() => Boolean(currentBatch.value));
const applyTarget = computed(() => resolveLoginAwareTarget("/join/apply", session.isAuthenticated));
const applyLabel = computed(() => session.isAuthenticated ? "开始填写报名表" : "登录后填写报名表");
</script>

<template>
  <NuxtPage v-if="!isJoinLanding" />
  <div v-else>
    <PageBanner
      eyebrow="Join HSD · Recruitment"
      title="从你的兴趣出发，进入一次真实协作"
      description="无论你关注开发、摄影、设计、活动还是组织成长，都可以在四大中心找到适合的参与方式。"
      tone="red"
      media-label="招新主题视觉素材位"
    >
      <template #actions>
        <NuxtLink v-if="canApply" class="button button--light" :to="applyTarget">{{ applyLabel }}</NuxtLink>
        <button v-else type="button" class="button button--light" disabled>当前暂无开放报名</button>
      </template>
    </PageBanner>
    <section class="section section--compact" aria-live="polite">
      <div class="shell">
        <div v-if="currentBatch" class="join-batch-notice">
          <div>
            <p class="eyebrow">Current Recruitment Batch</p>
            <h2>{{ currentBatch.name }}</h2>
            <p>报名时间：{{ new Date(currentBatch.startAt).toLocaleDateString("zh-CN") }} — {{ new Date(currentBatch.endAt).toLocaleDateString("zh-CN") }}。系统会自动将本次报名关联到当前批次。</p>
          </div>
          <dl><div><dt>开放中心</dt><dd>{{ currentBatch.openCenterIds.length }} 个</dd></div><div><dt>报名方式</dt><dd>自动关联</dd></div></dl>
        </div>
        <div v-else class="join-batch-notice join-batch-notice--closed" role="status">
          <div>
            <p class="eyebrow">Recruitment Schedule</p>
            <h2>{{ upcomingBatch ? `下一批次：${upcomingBatch.name}` : "当前暂无招新安排" }}</h2>
            <p v-if="upcomingBatch">报名将于 {{ new Date(upcomingBatch.startAt).toLocaleDateString("zh-CN") }} 开放，当前暂不能提交报名。</p>
            <p v-else>招新批次尚未发布，报名入口将在批次开放后启用。</p>
          </div>
          <strong>报名入口暂不可用</strong>
        </div>
      </div>
    </section>
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
        <NuxtLink v-if="canApply" class="button" :to="applyTarget">{{ applyLabel }}</NuxtLink>
        <button v-else type="button" class="button" disabled>当前暂无开放报名</button>
      </div>
    </section>
  </div>
</template>
