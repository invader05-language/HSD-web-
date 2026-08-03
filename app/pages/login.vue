<script setup lang="ts">
import { Field, Form } from "vee-validate";
import { z } from "zod";
import { useSessionStore } from "~/stores/session";
import { buildLoginTarget, normalizeRedirectTarget } from "~/utils/login-continuation";

useHead({ title: "成员登录｜白云 HSD 开发者部落" });

const route = useRoute();
const session = useSessionStore();
const submitting = ref(false);
const serverError = ref("");
const redirectTarget = computed(() => normalizeRedirectTarget(route.query.redirect));

onMounted(() => {
  if (typeof route.query.redirect !== "string") return;
  window.history.replaceState({ ...window.history.state }, "", buildLoginTarget(route.query.redirect));
});

const rules = {
  account: (value: unknown) => z.string().min(4, "请输入学号或成员账号").safeParse(value).success || "请输入学号或成员账号",
  password: (value: unknown) => z.string().min(6, "密码至少 6 位").safeParse(value).success || "密码至少 6 位"
};

async function signIn(values: Record<string, unknown>) {
  submitting.value = true;
  serverError.value = "";
  await new Promise((resolve) => setTimeout(resolve, 450));
  session.signIn(String(values.account ?? ""));
  submitting.value = false;
  await navigateTo(redirectTarget.value);
}
</script>

<template>
  <div class="login-page">
    <div class="login-page__context">
      <div>
        <p class="eyebrow">Member Access</p>
        <h1>只在需要个人身份时登录</h1>
        <p>项目、活动、媒体作品和公开资源无需登录即可浏览。登录用于保护申请进度、结果中心、成长记录和个人资料。</p>
        <ul><li>查看招新录取与阶段考核</li><li>提交或取消活动报名</li><li>编辑个人资料与头像</li><li>访问内部成员资料</li></ul>
      </div>
    </div>
    <div class="login-page__form">
      <div>
        <NuxtLink class="brand-lockup" to="/"><span class="brand-lockup__mark">&lt; HSD &gt;</span><span class="brand-lockup__name">白云 HSD 开发者部落</span></NuxtLink>
        <h2>成员登录</h2>
        <Form v-slot="{ errors }" @submit="signIn">
          <label>学号或成员账号<Field name="account" autocomplete="username" :rules="rules.account" /><small>{{ errors.account }}</small></label>
          <label>密码<Field name="password" type="password" autocomplete="current-password" :rules="rules.password" /><small>{{ errors.password }}</small></label>
          <p v-if="serverError" class="form-error" role="alert">{{ serverError }}</p>
          <button class="button" type="submit" :disabled="submitting">{{ submitting ? "正在登录…" : "登录并继续" }}</button>
        </Form>
        <p class="login-page__hint">原型演示：使用 <code>demo-member</code> 查看正式成员资料，使用 <code>demo-applicant</code> 体验预备成员报名；密码填写任意 6 位以上内容。</p>
        <NuxtLink class="text-link" to="/help#login">无法登录？查看帮助 →</NuxtLink>
      </div>
    </div>
  </div>
</template>
