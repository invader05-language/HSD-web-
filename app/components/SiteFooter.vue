<script setup lang="ts">
import { SITE_CONFIG } from "~/data/site";
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__grid shell">
      <div>
        <p class="site-footer__mark">{{ SITE_CONFIG.shortName }}</p>
        <h2>{{ SITE_CONFIG.name }}</h2>
        <p>{{ SITE_CONFIG.description }}</p>
      </div>
      <div>
        <h3>快速入口</h3>
        <div class="site-footer__links">
          <NuxtLink to="/projects">项目成果</NuxtLink>
          <NuxtLink to="/activities">动态与活动</NuxtLink>
          <NuxtLink to="/resources">资源中心</NuxtLink>
          <NuxtLink to="/join">加入我们</NuxtLink>
          <NuxtLink to="/help">帮助中心</NuxtLink>
        </div>
      </div>
      <div>
        <h3>联系与说明</h3>
        <p>广东白云学院校园开发者社群</p>
        <p>公开内容无需登录，个人数据与个人操作按需登录。</p>
      </div>
    </div>
    <div class="site-footer__bottom shell">
      <span class="site-footer__copyright">© 2026 白云 HSD 开发者部落</span>
      <p class="site-footer__notice">
        本平台由学生社团自主建设，仅用于社团管理与校园交流，站内内容及图片不作任何商业用途。
      </p>
    </div>
  </footer>
</template>
