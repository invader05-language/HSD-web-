<script setup lang="ts">
import { Field, Form } from "vee-validate";
import { z } from "zod";

useHead({ title: "招新报名｜白云 HSD 开发者部落" });

const submitted = ref(false);
const submitting = ref(false);
const schema = {
  name: (value: unknown) => z.string().min(2, "请输入至少 2 个字的姓名").safeParse(value).success || "请输入至少 2 个字的姓名",
  studentId: (value: unknown) => z.string().regex(/^\d{8,14}$/, "请输入 8–14 位学号").safeParse(value).success || "请输入 8–14 位学号",
  center: (value: unknown) => z.string().min(1, "请选择首选中心").safeParse(value).success || "请选择首选中心",
  introduction: (value: unknown) => z.string().min(20, "请至少填写 20 个字").safeParse(value).success || "请至少填写 20 个字"
};

async function submitApplication() {
  submitting.value = true;
  await new Promise((resolve) => setTimeout(resolve, 500));
  submitting.value = false;
  submitted.value = true;
}
</script>

<template>
  <div class="task-page">
    <div class="task-page__header shell">
      <p class="eyebrow">Recruitment Application</p>
      <h1>2026 招新报名</h1>
      <p>请如实填写。提交后可在成员空间查看申请进度，当前页面为可交互前端演示。</p>
    </div>
    <section class="task-page__body">
      <div class="shell form-layout">
        <div v-if="submitted" class="status-panel status-panel--success" role="status">
          <span>申请已提交</span>
          <h2>我们已收到你的报名信息</h2>
          <p>后续交流安排会显示在成员空间。Mock 阶段不会向真实后台写入数据。</p>
          <NuxtLink class="button" to="/member">查看申请进度</NuxtLink>
        </div>
        <Form v-else v-slot="{ errors, meta }" class="application-form" @submit="submitApplication">
          <div class="form-section">
            <span>01</span><div><h2>基础信息</h2><p>用于报名身份确认，不会公开展示。</p></div>
          </div>
          <div class="form-grid">
            <label>姓名<Field name="name" :rules="schema.name" /><small>{{ errors.name }}</small></label>
            <label>学号<Field name="studentId" :rules="schema.studentId" inputmode="numeric" /><small>{{ errors.studentId }}</small></label>
            <label>首选中心<Field name="center" as="select" :rules="schema.center"><option value="">请选择</option><option>白泽开发中心</option><option>新媒体中心</option><option>拓维策划中心</option><option>人才发展中心</option></Field><small>{{ errors.center }}</small></label>
            <label>联系方式<Field name="contact" placeholder="微信号或手机号" /><small>仅用于招新联系</small></label>
          </div>
          <label>个人介绍与报名原因<Field name="introduction" as="textarea" rows="6" :rules="schema.introduction" /><small>{{ errors.introduction || "建议说明兴趣、已有经历和希望尝试的方向。" }}</small></label>
          <label class="checkbox-field"><Field name="consent" type="checkbox" :value="true" />我确认信息真实，并同意仅将其用于本次招新。</label>
          <div class="form-actions">
            <button class="button" type="submit" :disabled="submitting || !meta.valid">{{ submitting ? "正在提交…" : "提交招新申请" }}</button>
            <span v-if="!meta.valid">请完成必填项后提交</span>
          </div>
        </Form>
        <aside class="form-aside"><h2>填写说明</h2><p>报名资料属于个人信息，仅本人及授权招新负责人可查看。</p><NuxtLink class="text-link" to="/help#privacy">隐私与报名帮助 →</NuxtLink></aside>
      </div>
    </section>
  </div>
</template>
