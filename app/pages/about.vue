<script setup lang="ts">
import { CENTERS } from "~/data/home";
import { resolvePublicAvatar } from "~/data/people";
import { useMemberRepository } from "~/composables/useMemberRepository";

useHead({ title: "部落介绍｜白云 HSD 开发者部落" });
const memberRepository = useMemberRepository();
const corePeople = memberRepository.publicCorePeople;
const publicMembers = memberRepository.publicMembers;
</script>

<template>
  <div>
    <PageBanner
      eyebrow="About HSD"
      title="不只学习技术，更在真实协作中成长"
      description="白云 HSD 开发者部落隶属学校华为 ICT 学院相关学生组织体系，覆盖技术研发、内容传播、活动策划与人才成长。"
      tone="warm"
      media-label="部落年度合影素材位"
    />

    <section class="section">
      <div class="shell about-intro">
        <div>
          <p class="eyebrow">Our Mission</p>
          <h2>让个人成长进入真实项目，也让每种创造力被看见</h2>
        </div>
        <div>
          <p>我们通过技术沙龙、项目实训、赛事协作、媒体创作和新人培养，把零散兴趣转化为可以持续投入的成长路径。</p>
          <p>大多数部落内容对所有同学开放。只有成员个人资料、考核结果、申请进度与成长记录等个人信息需要登录后查看。</p>
        </div>
      </div>
    </section>

    <section class="section section--warm">
      <div class="shell">
        <div class="section-heading section-heading--wide">
          <div>
            <p class="eyebrow">Core Team</p>
            <h2>核心人员重点展示</h2>
          </div>
          <div class="section-heading__aside">
            <p>该区域独立于普通成员名录，用于展示当前承担组织方向、关键项目和跨中心协作职责的核心人员。</p>
            <NuxtLink to="/people/core" class="directory-link">查看全体核心人员 →</NuxtLink>
          </div>
        </div>
        <div class="core-team">
          <article v-for="(member, index) in corePeople.slice(0, 3)" :key="member.id">
            <div class="core-team__visual">
              <HsdAvatar :name="member.name" :src="resolvePublicAvatar(member)" size="lg" />
              <span>0{{ index + 1 }}</span>
            </div>
            <p>{{ member.memberDuty }}</p>
            <h3>{{ member.name }}</h3>
            <p v-if="member.baizeDirection">{{ member.baizeDirection }}</p>
          </article>
        </div>
      </div>
    </section>

    <section id="members" class="section section--cool">
      <div class="shell">
        <div class="section-heading section-heading--wide">
          <div>
            <p class="eyebrow">Member Directory</p>
            <h2>成员风采</h2>
          </div>
          <div class="section-heading__aside">
            <p>头像与个人资料头像联动；已上传照片显示本人头像，没有头像时统一使用白底 HSD 默认头像。</p>
            <NuxtLink to="/people/members" class="directory-link">查看所有成员 →</NuxtLink>
          </div>
        </div>
        <div class="member-directory">
          <article v-for="member in publicMembers" :key="member.id">
            <HsdAvatar :name="member.name" :src="resolvePublicAvatar(member)" size="lg" />
            <div>
              <h3>{{ member.name }}</h3>
              <p>{{ member.centerName }}</p>
              <span v-if="member.baizeDirection">{{ member.baizeDirection }}</span>
            </div>
          </article>
        </div>
        <p class="privacy-note">成员基础资料默认用于成员展示；未登录访客仅查看公开的基础风采信息。</p>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Collaboration</p>
            <h2>四个中心，平等协作</h2>
          </div>
        </div>
        <div class="plain-grid">
          <NuxtLink
            v-for="center in CENTERS"
            :key="center.slug"
            :to="`/centers/${center.slug}`"
          >
            <span>{{ center.index }}</span>
            <h3>{{ center.title }}</h3>
            <p>{{ center.description }}</p>
            <strong>查看中心详情 →</strong>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
