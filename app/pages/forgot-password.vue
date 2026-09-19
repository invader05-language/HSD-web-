<script setup lang="ts">
import { Field, Form } from "vee-validate";
import { z } from "zod";
import { usePasswordRecoveryRequest } from "~/composables/usePasswordRecoveryRequest";

useHead({ title: "忘记密码｜白云 HSD 开发者部落" });
const { submitting, submitted, error, message, submit } = usePasswordRecoveryRequest();
const rules = (value: unknown) => z.string().trim().min(4, "请输入学号或成员账号").max(64, "账号长度不能超过 64 个字符").safeParse(value).success || "请输入 4—64 个字符的学号或成员账号";
</script>

<template>
  <div class="login-page password-recovery-public-page">
    <div class="login-page__context">
      <div><p class="eyebrow">Account Recovery</p><h1>找回账号访问</h1><p>提交申请后，联盟总负责人会通过线下可信渠道完成身份核验并处理。</p><ul><li>只需填写学号或成员账号</li><li>平台不会通过短信或邮件发送密码</li><li>重置后首次登录需要重新设置密码</li></ul></div>
    </div>
    <div class="login-page__form">
      <div>
        <NuxtLink class="brand-lockup" to="/login"><span class="brand-lockup__mark">&lt; HSD &gt;</span><span class="brand-lockup__name">白云 HSD 开发者部落</span></NuxtLink>
        <h2>忘记密码</h2>
        <template v-if="!submitted">
          <p class="password-recovery-public-page__intro">请输入学号或成员账号。为保护账号隐私，无论账号是否存在，提交后都会显示相同提示。</p>
          <Form v-slot="{ errors }" @submit="(values) => submit(String(values.account ?? ''))">
            <label>学号或成员账号<Field name="account" autocomplete="username" :rules="rules" :disabled="submitting" /><small>{{ errors.account }}</small></label>
            <p v-if="error" class="form-error" role="alert">{{ error }}</p>
            <button class="button" type="submit" :disabled="submitting">{{ submitting ? "正在提交…" : "提交找回申请" }}</button>
          </Form>
        </template>
        <section v-else class="password-recovery-public-page__success" role="status"><strong>申请已提交</strong><p>{{ message }}</p><NuxtLink class="button" to="/login">返回登录</NuxtLink></section>
        <NuxtLink v-if="!submitted" class="password-recovery-public-page__back" to="/login">返回登录</NuxtLink>
      </div>
    </div>
  </div>
</template>
