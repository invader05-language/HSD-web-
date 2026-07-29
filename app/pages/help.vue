<script setup lang="ts">
useHead({ title: "帮助中心｜白云 HSD 开发者部落" });
const query = ref("");
const topics = [
  { id: "recruitment", title: "招新报名与申请进度", text: "浏览招新说明无需登录。点击填写报名表时登录，提交后在成员空间查看进度。" },
  { id: "login", title: "成员账号与登录", text: "成员账号由部落统一开通。忘记账号或无法登录时，请联系人才发展中心核验身份。" },
  { id: "privacy", title: "头像、个人资料与隐私", text: "头像与个人资料联动。可选择上传并公开，或使用白底 HSD 默认头像；考核、申请和成长记录始终仅本人可见。" },
  { id: "activities", title: "活动报名与取消", text: "活动详情公开浏览，提交和取消报名需要登录。截止后如需变更，请联系活动负责人。" },
  { id: "resources", title: "资源浏览与下载", text: "公开路线和模板无需登录，内部课程包仅在点击下载时要求成员登录。" }
];
const visible = computed(() => topics.filter((topic) => `${topic.title}${topic.text}`.includes(query.value.trim())));
</script>

<template>
  <div>
    <PageBanner eyebrow="Help Center" title="先找到问题，再找到负责人" description="关于登录、招新、活动报名、资源权限和个人资料的常见问题，都可以在这里查询。" tone="warm" media-label="帮助与服务索引视觉位" />
    <section class="section section--cool">
      <div class="shell help-layout">
        <div>
          <label class="search-field">搜索帮助内容<input v-model="query" type="search" placeholder="例如：报名、头像、下载"></label>
          <p>{{ visible.length }} 条匹配结果</p>
        </div>
        <div v-if="visible.length" class="faq-list">
          <details v-for="topic in visible" :id="topic.id" :key="topic.id">
            <summary>{{ topic.title }}</summary><p>{{ topic.text }}</p>
          </details>
        </div>
        <EmptyState v-else title="没有找到相关帮助" description="可以换一个关键词，或联系人才发展中心。" />
      </div>
    </section>
  </div>
</template>
