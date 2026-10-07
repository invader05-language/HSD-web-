<script setup lang="ts">
import { Field, Form } from "vee-validate";
import { z } from "zod";
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import { SessionApiError } from "~/services/api-session.gateway";
import {
  buildLoginTarget,
  resolveLoginContinuation,
  type LoginMode
} from "~/utils/login-continuation";
import { getLoginApiErrorMessage, getLoginDestination, getLoginErrorMessage } from "~/utils/login-mode";
import { buildPasswordChangeTarget } from "~/utils/password-change";

const route = useRoute();
const session = useSessionStore();
const sessionGateway = useSessionGateway();
const apiRuntime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const submitting = ref(false);
const hydrated = ref(false);
const serverError = ref("");
const diagnosticRequestId = ref("");
const copiedRequestId = ref(false);
const requestIdSelected = ref(false);
const requestIdCode = ref<HTMLElement | null>(null);
const showPassword = ref(false);
const remainingSeconds = ref(0);
let retryTimer: ReturnType<typeof setInterval> | undefined;
let retryUntil = 0;

function clearRetryCountdown() {
  if (retryTimer) clearInterval(retryTimer);
  retryTimer = undefined;
  retryUntil = 0;
  remainingSeconds.value = 0;
}

function startRetryCountdown(seconds: number) {
  clearRetryCountdown();
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  retryUntil = Date.now() + seconds * 1000;
  const update = () => {
    remainingSeconds.value = Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000));
    if (remainingSeconds.value === 0) clearRetryCountdown();
  };
  update();
  retryTimer = setInterval(update, 1000);
}

const retryCountdown = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60);
  const seconds = remainingSeconds.value % 60;
  return minutes > 0 ? `剩余 ${minutes} 分 ${seconds} 秒` : `剩余 ${seconds} 秒`;
});

async function copyRequestId() {
  if (!diagnosticRequestId.value) return;
  try {
    await navigator.clipboard.writeText(diagnosticRequestId.value);
    copiedRequestId.value = true;
  } catch {
    const input = document.createElement("textarea");
    input.value = diagnosticRequestId.value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    copiedRequestId.value = document.execCommand("copy");
    input.remove();
    if (!copiedRequestId.value && requestIdCode.value) {
      const range = document.createRange();
      range.selectNodeContents(requestIdCode.value);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      requestIdSelected.value = true;
    }
  }
}

onUnmounted(clearRetryCountdown);
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
  if (submitting.value || remainingSeconds.value > 0) return;
  submitting.value = true;
  serverError.value = "";
  diagnosticRequestId.value = "";
  copiedRequestId.value = false;
  requestIdSelected.value = false;
  clearRetryCountdown();
  let result;
  try {
    result = await session.signInForRuntime(
      apiRuntime.public,
      sessionGateway,
      String(values.account ?? ""),
      String(values.password ?? ""),
      { requireAdmin: isAdminMode.value },
    );
  } catch (error) {
    serverError.value = getLoginApiErrorMessage(error);
    if (error instanceof SessionApiError) {
      diagnosticRequestId.value = error.requestId ?? "";
      if ((error.status === 423 || error.status === 429) && error.retryAfterSeconds) {
        startRetryCountdown(error.retryAfterSeconds);
      }
    }
    return;
  } finally {
    submitting.value = false;
  }
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
          <label for="login-password">密码</label>
          <div class="login-page__password-field">
            <Field id="login-password" name="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" :rules="rules.password" :disabled="!hydrated" />
            <button type="button" class="login-page__visibility" :aria-label="showPassword ? '隐藏密码' : '显示密码'" :aria-pressed="showPassword" @click="showPassword = !showPassword">{{ showPassword ? "隐藏" : "显示" }}</button>
          </div>
          <small>{{ errors.password }}</small>
          <NuxtLink class="login-page__forgot" to="/forgot-password">忘记密码？</NuxtLink>
          <p v-if="serverError" class="form-error" role="alert">{{ serverError }}</p>
          <p v-if="remainingSeconds > 0" class="login-page__countdown" role="status">{{ retryCountdown }}</p>
          <p v-if="diagnosticRequestId" class="login-page__diagnostic">请求编号：<code ref="requestIdCode">{{ diagnosticRequestId }}</code><button type="button" @click="copyRequestId">{{ copiedRequestId ? "已复制" : requestIdSelected ? "已选中，请复制" : "复制编号" }}</button></p>
          <button class="button" type="submit" :disabled="submitting || !hydrated || remainingSeconds > 0">{{ submitting ? "正在登录…" : "登录并继续" }}</button>
        </Form>
        <p class="login-page__hint">无法登录或忘记账号时，请联系联盟总负责人核验身份并处理账号问题。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page__password-field { position: relative; }
.login-page__password-field input { padding-right: 4.5rem; }
.login-page__visibility { position: absolute; right: .5rem; top: 50%; transform: translateY(-50%); border: 0; background: transparent; color: var(--brand-red); cursor: pointer; }
.login-page__countdown, .login-page__diagnostic { margin: .5rem 0; font-size: .9rem; }
.login-page__diagnostic { overflow-wrap: anywhere; }
.login-page__diagnostic button { margin-left: .5rem; border: 0; background: transparent; color: var(--brand-red); cursor: pointer; text-decoration: underline; }
</style>
