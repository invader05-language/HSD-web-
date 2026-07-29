<script setup lang="ts">
import { useSessionStore } from "~/stores/session";

useHead({ title: "成员空间｜白云 HSD 开发者部落" });
const session = useSessionStore();
</script>

<template>
  <div class="member-space">
    <aside>
      <div class="member-space__identity"><HsdAvatar :name="session.memberName" size="md" /><div><strong>{{ session.memberName }}</strong><span>HSD 成员</span></div></div>
      <nav aria-label="成员空间导航"><a href="#overview">个人概览</a><a href="#application">申请进度</a><a href="#assessment">考核结果</a><a href="#activities">活动与比赛</a><a href="#growth">成长记录</a></nav>
      <button type="button" @click="session.signOut(); navigateTo('/')">退出登录</button>
    </aside>
    <main id="overview">
      <p class="eyebrow">Member Workspace</p><h1>你好，{{ session.memberName }}</h1><p>这里集中展示与你个人相关的信息；公开内容仍可从官网导航直接访问。</p>
      <div class="member-dashboard">
        <section id="application"><span>申请进度</span><h2>2026 招新申请</h2><strong>已通过</strong><p>下一步：完善个人简介与作品记录。</p></section>
        <section id="assessment"><span>考核结果</span><h2>基础能力考核</h2><strong>查看结果</strong><p>结果仅本人登录后可见。</p></section>
        <section id="activities"><span>活动与比赛</span><h2>2 个待参加事项</h2><strong>查看日程</strong><p>可在这里取消个人报名。</p></section>
        <section id="growth"><span>成长记录</span><h2>3 条项目经历</h2><strong>继续完善</strong><p>记录个人贡献与阶段复盘。</p></section>
      </div>
      <section class="profile-panel"><div><h2>个人资料与头像</h2><p>头像未上传时统一显示白底 HSD 默认图；上传后可选择是否在成员风采中公开。</p></div><button class="button" type="button">编辑个人资料</button></section>
    </main>
  </div>
</template>
