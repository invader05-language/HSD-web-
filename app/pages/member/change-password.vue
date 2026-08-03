<script setup lang="ts">
import { useSessionStore } from "~/stores/session";
import { normalizePasswordChangeContinuation } from "~/utils/password-change";

definePageMeta({ layout: false });
useHead({ title: "首次修改密码｜白云 HSD 开发者部落" });

const route = useRoute();
const session = useSessionStore();
const newPassword = ref("");
const confirmation = ref("");
const passwordError = ref("");
const confirmationError = ref("");
const formError = ref("");
const submitting = ref(false);
const continuation = computed(() => normalizePasswordChangeContinuation(route.query.redirect));

onMounted(async () => {
  if (session.isAuthenticated && !session.mustChangePassword) {
    await navigateTo(continuation.value, { replace: true });
  }
});

async function submitPasswordChange() {
  passwordError.value = "";
  confirmationError.value = "";
  formError.value = "";
  submitting.value = true;
  const result = session.completePasswordChange(newPassword.value, confirmation.value);
  submitting.value = false;

  if (result.status === "invalid_input") {
    passwordError.value = result.errors.password ?? "";
    confirmationError.value = result.errors.confirmation ?? "";
    return;
  }
  if (result.status === "storage_unavailable") {
    formError.value = "浏览器存储暂不可用，密码修改状态尚未保存，请稍后重试。";
    return;
  }
  if (result.status === "not_required") {
    await navigateTo("/login", { replace: true });
    return;
  }
  await navigateTo(continuation.value, { replace: true });
}

async function signOut() {
  session.signOut();
  await navigateTo("/login", { replace: true });
}
</script>

<template>
  <main class="password-change-page">
    <section class="password-change-card" aria-labelledby="password-change-title">
      <div class="password-change-brand" aria-label="白云 HSD 开发者部落">
        <span>&lt; HSD &gt;</span>
        <strong>白云 HSD 开发者部落</strong>
      </div>
      <p class="eyebrow">First Login Security</p>
      <h1 id="password-change-title">设置新的登录密码</h1>
      <p class="password-change-intro">当前账号仍在首次登录受限状态。完成密码修改后，才能继续进入成员空间。</p>

      <form novalidate @submit.prevent="submitPasswordChange">
        <label>
          新密码
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            :aria-invalid="Boolean(passwordError)"
            :aria-describedby="passwordError ? 'new-password-error' : 'new-password-help'"
          >
          <small id="new-password-help">至少 8 位，且不能继续使用初始密码。</small>
          <small v-if="passwordError" id="new-password-error" class="password-change-error">{{ passwordError }}</small>
        </label>
        <label>
          确认新密码
          <input
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            :aria-invalid="Boolean(confirmationError)"
            :aria-describedby="confirmationError ? 'confirmation-error' : undefined"
          >
          <small v-if="confirmationError" id="confirmation-error" class="password-change-error">{{ confirmationError }}</small>
        </label>
        <p v-if="formError" class="password-change-error" role="alert">{{ formError }}</p>
        <button class="button" type="submit" :disabled="submitting">
          {{ submitting ? "正在保存…" : "保存新密码并继续" }}
        </button>
      </form>

      <button class="password-change-signout" type="button" @click="signOut">退出当前账号</button>
      <p class="password-change-boundary">当前页面仅演示首次改密流程；正式上线后由服务端完成密码加密、验证与会话管理。</p>
    </section>
  </main>
</template>

<style scoped>
.password-change-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: clamp(24px, 6vw, 72px);
  background:
    linear-gradient(135deg, rgb(177 32 43 / 8%), transparent 45%),
    var(--cool-gray);
}

.password-change-card {
  width: min(100%, 620px);
  padding: clamp(28px, 5vw, 56px);
  border: 1px solid var(--border);
  border-top: 5px solid var(--brand-red);
  background: var(--surface);
  box-shadow: 0 24px 60px rgb(33 31 30 / 12%);
}

.password-change-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
}

.password-change-brand span,
.password-change-card .eyebrow {
  color: var(--brand-red);
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.password-change-card h1 {
  margin: 8px 0 12px;
  font-family: Georgia, "Songti SC", serif;
  font-size: clamp(36px, 6vw, 56px);
  line-height: 1.15;
}

.password-change-intro,
.password-change-boundary {
  color: var(--muted);
}

.password-change-card form {
  display: grid;
  gap: 24px;
  margin-top: 36px;
}

.password-change-card label {
  display: grid;
  gap: 8px;
  font-weight: 700;
}

.password-change-card input {
  min-height: 52px;
  padding: 0 14px;
  border: 1px solid #b9b3ad;
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.password-change-card input:focus-visible {
  border-color: var(--brand-red);
  outline: 3px solid rgb(177 32 43 / 18%);
}

.password-change-card small {
  color: var(--muted);
  font-weight: 400;
}

.password-change-error {
  margin: 0;
  color: var(--brand-red) !important;
}

.password-change-card .button {
  width: 100%;
  min-height: 52px;
}

.password-change-signout {
  display: block;
  margin: 18px auto 0;
  border: 0;
  background: transparent;
  color: var(--brand-red);
  cursor: pointer;
  font-weight: 700;
}

.password-change-boundary {
  margin: 36px 0 0;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 13px;
}

@media (max-width: 560px) {
  .password-change-page { padding: 16px; }
  .password-change-card { padding: 28px 22px; }
  .password-change-brand { margin-bottom: 32px; }
}
</style>
