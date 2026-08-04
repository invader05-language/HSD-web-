<script setup lang="ts">
import { Field, Form } from "vee-validate";
import { z } from "zod";
import { useSessionStore } from "~/stores/session";
import {
  buildLoginTarget,
  resolveLoginContinuation,
  type LoginMode
} from "~/utils/login-continuation";
import { getLoginDestination, getLoginErrorMessage } from "~/utils/login-mode";
import { buildPasswordChangeTarget } from "~/utils/password-change";

const route = useRoute();
const session = useSessionStore();
const submitting = ref(false);
const hydrated = ref(false);
const serverError = ref("");
const continuation = computed(() => resolveLoginContinuation(route.query));
const mode = ref<LoginMode>(continuation.value.mode);
const redirectTarget = computed(() => getLoginDestination(continuation.value, mode.value));
const isAdminMode = computed(() => mode.value === "admin");
const modeCopy = computed(() => isAdminMode.value
  ? {
      eyebrow: "Administrator Access",
      heading: "进入管理工作台",
      description: "管理员登录仅用于平台事务和管理员资格配置。系统会根据账号的管理员资格决定是否允许进入。",
      title: "管理员登录"
    }
  : {
      eyebrow: "Member Access",
      heading: "只在需要个人身份时登录",
      description: "项目、活动、媒体作品和公开资源无需登录即可浏览。登录用于保护申请进度、结果中心、成长记录和个人资料。",
      title: "成员登录"
    });

useHead({ title: computed(() => `${modeCopy.value.title}｜白云 HSD 开发者部落`) });

onMounted(async () => {
  await nextTick();
  hydrated.value = true;
  if (route.query.mode || continuation.value.mode !== "admin") return;
  window.history.replaceState(
    { ...window.history.state },
    "",
    buildLoginTarget(continuation.value.adminTarget)
  );
});

const rules = {
  account: (value: unknown) => z.string().min(4, "请输入学号或成员账号").safeParse(value).success || "请输入学号或成员账号",
  password: (value: unknown) => z.string().min(6, "密码至少 6 位").safeParse(value).success || "密码至少 6 位"
};

async function signIn(values: Record<string, unknown>) {
  submitting.value = true;
  serverError.value = "";
  await new Promise((resolve) => setTimeout(resolve, 450));
  const result = session.signIn(
    String(values.account ?? ""),
    String(values.password ?? ""),
    { requireAdmin: isAdminMode.value }
  );
  submitting.value = false;
  if (result.status === "password_change_required") {
    await navigateTo(buildPasswordChangeTarget(redirectTarget.value));
    return;
  }
  if (result.status !== "success") {
    serverError.value = getLoginErrorMessage(result.status);
    return;
  }
  await navigateTo(redirectTarget.value);
}
</script>

<template>
  <div class="login-page">
    <div class="login-page__context">
      <div>
        <p class="eyebrow">{{ modeCopy.eyebrow }}</p>
        <h1>{{ modeCopy.heading }}</h1>
        <p>{{ modeCopy.description }}</p>
        <ul v-if="!isAdminMode"><li>查看招新录取与阶段考核</li><li>提交或取消活动报名</li><li>编辑个人资料与头像</li><li>访问内部成员资料</li></ul>
        <ul v-else><li>处理平台日常事务</li><li>管理成员、内容与媒体资源</li><li>仅负责人可配置管理员资格</li></ul>
      </div>
    </div>
    <div class="login-page__form">
      <div>
        <NuxtLink class="brand-lockup" to="/"><span class="brand-lockup__mark">&lt; HSD &gt;</span><span class="brand-lockup__name">白云 HSD 开发者部落</span></NuxtLink>
        <h2>{{ modeCopy.title }}</h2>
        <fieldset class="login-mode" :disabled="!hydrated">
          <legend>选择登录身份</legend>
          <label :class="{ 'is-selected': !isAdminMode }"><input v-model="mode" type="radio" name="login-mode" value="member" /><span>成员登录</span></label>
          <label :class="{ 'is-selected': isAdminMode }"><input v-model="mode" type="radio" name="login-mode" value="admin" /><span>管理员登录</span></label>
        </fieldset>
        <Form v-slot="{ errors }" method="post" @submit="signIn">
          <label>学号或成员账号<Field name="account" autocomplete="username" :rules="rules.account" :disabled="!hydrated" /><small>{{ errors.account }}</small></label>
          <label>密码<Field name="password" type="password" autocomplete="current-password" :rules="rules.password" :disabled="!hydrated" /><small>{{ errors.password }}</small></label>
          <p v-if="serverError" class="form-error" role="alert">{{ serverError }}</p>
          <button class="button" type="submit" :disabled="submitting || !hydrated">{{ submitting ? "正在登录…" : "登录并继续" }}</button>
        </Form>
        <p class="login-page__hint">无法登录或忘记账号时，请联系联盟总负责人核验身份并处理账号问题。</p>
      </div>
    </div>
  </div>
</template>
