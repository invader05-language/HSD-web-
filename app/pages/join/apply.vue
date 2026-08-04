<script setup lang="ts">
import {
  BAIZE_DIRECTIONS,
  RECRUITMENT_CENTERS,
  createRegistrationProfileDraft,
  type RecruitmentApplicationDraft,
  type RecruitmentCenter,
} from "~/data/recruitment-application";
import { useCurrentMember } from "~/composables/useCurrentMember";
import { useRecruitmentBatchStore } from "~/stores/recruitment-batch";
import { useRecruitmentApplicationStore } from "~/stores/recruitment-application";
import {
  validateApplicationDraft,
  validateConfirmation,
  validateRegistrationStep,
} from "~/utils/recruitment-application-form";
import { isSupportedAvatar } from "~/utils/member-profile-form";

type Step = 1 | 2 | 3;

const STEPS: ReadonlyArray<{ id: Step; label: string }> = [
  { id: 1, label: "完善个人资料" },
  { id: 2, label: "填写报名志愿" },
  { id: 3, label: "确认并提交" },
];

useHead({ title: "成员注册与招新报名｜白云 HSD 开发者部落" });
definePageMeta({ middleware: "member" });

const currentMember = useCurrentMember();
const currentProfile = currentMember.profile;
const batchStore = useRecruitmentBatchStore();
const applicationStore = useRecruitmentApplicationStore();
const capturedBatchId = ref(batchStore.currentOpenBatch?.id);
const activeBatch = computed(() => capturedBatchId.value ? batchStore.getBatch(capturedBatchId.value) : undefined);
const hasOpenBatch = computed(() => Boolean(activeBatch.value && batchStore.effectiveStatus(activeBatch.value.id) === "open"));
const step = ref<Step>(1);
const profileDraft = reactive(createRegistrationProfileDraft(currentProfile.value));
const applicationDraft = reactive<RecruitmentApplicationDraft>(applicationStore.createDraft());
const errors = reactive<Record<string, string>>({});
const confirmation = ref(false);
const submitting = ref(false);
const submitError = ref("");
const editingApplication = ref(false);
const showWithdrawConfirmation = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
let draftObjectUrl: string | undefined;

const isBaizeFirstChoice = computed(() => applicationDraft.firstChoice === "白泽开发中心");
const avatarSource = computed(() => profileDraft.avatarUrl || undefined);
const currentBatchApplication = computed(() => activeBatch.value
  ? applicationStore.getApplication(activeBatch.value.id, currentProfile.value.id)
  : undefined);
const submittedApplication = computed(() => {
  const application = currentBatchApplication.value;
  return application && application.status !== "withdrawn" && !editingApplication.value
    ? application
    : undefined;
});
const isResubmitting = computed(() => currentBatchApplication.value?.status === "withdrawn");
const submitButtonLabel = computed(() => {
  if (submitting.value) return "正在提交…";
  if (editingApplication.value) return "确认并保存修改";
  if (isResubmitting.value) return "确认并重新提交报名";
  return "确认并提交报名";
});
const grades = ["2024 级", "2025 级", "2026 级", "2027 级"];

function clearErrors(...keys: string[]) {
  keys.forEach((key) => delete errors[key]);
}

function setErrors(nextErrors: Record<string, string | undefined>) {
  clearErrors(...Object.keys(errors));
  Object.entries(nextErrors).forEach(([key, value]) => {
    if (value) errors[key] = value;
  });
}

async function focusFirstError() {
  await nextTick();
  const field = Object.keys(errors)[0];
  if (!field) return;
  document.querySelector<HTMLElement>(`[data-field="${field}"] input, [data-field="${field}"] select, [data-field="${field}"] textarea, [data-field="${field}"] button`)?.focus();
}

async function validateStep(target: Step) {
  if (target === 1) setErrors(validateRegistrationStep(profileDraft, applicationDraft));
  if (target === 2) setErrors(validateApplicationDraft(applicationDraft));
  if (target === 3) setErrors(validateConfirmation(confirmation.value));
  if (Object.keys(errors).length) {
    await focusFirstError();
    return false;
  }
  return true;
}

async function nextStep() {
  if (step.value === 3 || !(await validateStep(step.value))) return;
  step.value = (step.value + 1) as Step;
}

function previousStep() {
  if (step.value === 1) return;
  clearErrors(...Object.keys(errors));
  step.value = (step.value - 1) as Step;
}

async function goToStep(target: Step) {
  if (target <= step.value) {
    clearErrors(...Object.keys(errors));
    step.value = target;
    return;
  }
  for (let current = 1; current < target; current += 1) {
    if (!(await validateStep(current as Step))) return;
  }
  step.value = target;
}

function updateFirstChoice(event: Event) {
  applicationStore.setFirstChoice(
    applicationDraft,
    ((event.target as HTMLSelectElement).value || undefined) as RecruitmentCenter | undefined,
  );
  clearErrors("firstChoice", "baizeDirection");
}

function releaseDraftObjectUrl() {
  if (draftObjectUrl && draftObjectUrl !== currentProfile.value.avatarUrl) {
    URL.revokeObjectURL(draftObjectUrl);
  }
  draftObjectUrl = undefined;
}

function chooseAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  clearErrors("avatarUrl");
  if (!isSupportedAvatar(file)) {
    errors.avatarUrl = "请选择 JPG、PNG、WEBP 或 GIF 图片，且文件不超过 5MB。";
    input.value = "";
    return;
  }

  releaseDraftObjectUrl();
  draftObjectUrl = URL.createObjectURL(file);
  profileDraft.avatarUrl = draftObjectUrl;
}

function removeAvatar() {
  releaseDraftObjectUrl();
  profileDraft.avatarUrl = undefined;
  if (fileInput.value) fileInput.value.value = "";
  clearErrors("avatarUrl");
}

function loadApplicationDraft() {
  const application = currentBatchApplication.value;
  if (!application) return;
  Object.assign(profileDraft, createRegistrationProfileDraft(currentProfile.value));
  Object.assign(applicationDraft, applicationStore.createDraft(), {
    contact: application.contact,
    firstChoice: application.firstChoice,
    secondChoice: application.secondChoice,
    thirdChoice: application.thirdChoice,
    baizeDirection: application.baizeDirection,
    acceptsAdjustment: application.acceptsAdjustment,
  });
  confirmation.value = false;
  clearErrors(...Object.keys(errors));
  submitError.value = "";
  step.value = 1;
}

function startEditingApplication() {
  loadApplicationDraft();
  editingApplication.value = true;
}

function confirmWithdrawApplication() {
  const batchId = activeBatch.value?.id;
  if (!batchId) return;
  applicationStore.withdrawApplication(batchId);
  showWithdrawConfirmation.value = false;
  editingApplication.value = false;
  loadApplicationDraft();
}

async function submitApplication() {
  submitError.value = "";
  const profileIsValid = await validateStep(1);
  if (!profileIsValid) {
    step.value = 1;
    return;
  }
  const choicesAreValid = await validateStep(2);
  if (!choicesAreValid) {
    step.value = 2;
    return;
  }
  const confirmationIsValid = await validateStep(3);
  if (!confirmationIsValid) return;

  submitting.value = true;
  try {
    const batchId = activeBatch.value?.id;
    if (!batchId || !hasOpenBatch.value) {
      throw new Error("当前批次已暂停或关闭，暂不能提交报名。请保留页面草稿并返回加入我们查看最新安排。");
    }
    applicationStore.submitApplication(
      {
        ...profileDraft,
        name: profileDraft.name.trim(),
        studentId: profileDraft.studentId.trim(),
        grade: profileDraft.grade.trim(),
        className: profileDraft.className.trim(),
        bio: profileDraft.bio.trim(),
      },
      {
        ...applicationDraft,
        contact: applicationDraft.contact.trim(),
      },
      confirmation.value,
      { batchId, allowExistingUpdate: editingApplication.value },
    );
    draftObjectUrl = undefined;
    editingApplication.value = false;
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : "报名提交失败，请稍后重试。";
  } finally {
    submitting.value = false;
  }
}

onBeforeUnmount(() => {
  releaseDraftObjectUrl();
});
</script>

<template>
  <div class="task-page recruitment-application-page">
    <header class="task-page__header shell">
      <p class="eyebrow">Member Registration · Recruitment</p>
      <h1>成员注册与招新报名</h1>
      <p>登录用于确认账号身份；在这里完善成员资料并提交本次招新志愿。当前为前端演示，刷新后会恢复示例数据。</p>
    </header>

    <section class="task-page__body">
      <div class="shell">
        <section v-if="!hasOpenBatch" class="recruitment-success recruitment-success--blocked" role="status" aria-live="polite">
          <p class="eyebrow">Recruitment Unavailable</p>
          <h2>当前暂无开放报名</h2>
          <p>{{ batchStore.upcomingBatch ? `下一批次“${batchStore.upcomingBatch.name}”计划于 ${new Date(batchStore.upcomingBatch.startAt).toLocaleDateString("zh-CN")} 开放。` : "当前没有已开放的招新批次。" }}</p>
          <div class="recruitment-success__actions"><NuxtLink class="button" to="/join">返回加入我们</NuxtLink></div>
        </section>
        <section v-else-if="submittedApplication" class="recruitment-success" role="status" aria-live="polite">
          <p class="eyebrow">Submitted</p>
          <h2>成员注册与招新报名已提交</h2>
          <p>你的报名已关联到“{{ submittedApplication.batchNameSnapshot }}”，并以预备成员身份进入后续流程。</p>
          <dl>
            <div><dt>招新批次</dt><dd>{{ submittedApplication.batchNameSnapshot }}</dd></div>
            <div><dt>成员身份</dt><dd>预备成员</dd></div>
            <div><dt>所属中心</dt><dd>待确定</dd></div>
            <div><dt>报名状态</dt><dd>已提交</dd></div>
          </dl>
          <div class="recruitment-success__actions">
            <NuxtLink class="button" to="/member">进入个人中心</NuxtLink>
            <NuxtLink class="button button--ghost" to="/member/results">查看结果中心</NuxtLink>
            <button v-if="submittedApplication.status === 'submitted'" class="button button--ghost" type="button" @click="startEditingApplication">修改报名</button>
            <button v-if="submittedApplication.status === 'submitted'" class="button button--ghost" type="button" @click="showWithdrawConfirmation = true">撤回报名</button>
          </div>
          <details>
            <summary>查看已提交报名摘要</summary>
            <div class="recruitment-summary-grid">
              <section><h3>成员资料</h3><p>姓名：{{ currentProfile.name }}</p><p v-if="currentProfile.bio">个人简介：{{ currentProfile.bio }}</p><p>联系方式：{{ submittedApplication.contact }}（仅招新联系）</p></section>
              <section><h3>报名志愿</h3><p>第一志愿：{{ submittedApplication.firstChoice }}</p><p>第二志愿：{{ submittedApplication.secondChoice || "未填写" }}</p><p>第三志愿：{{ submittedApplication.thirdChoice || "未填写" }}</p><p>白泽意向方向：{{ submittedApplication.baizeDirection || "不适用" }}</p></section>
            </div>
          </details>
          <div v-if="showWithdrawConfirmation" class="admin-modal-backdrop">
            <section role="alertdialog" aria-modal="true" aria-labelledby="withdraw-application-title">
              <span>Withdraw Application</span>
              <h3 id="withdraw-application-title">确认撤回本次报名？</h3>
              <p>撤回后不会进入管理员报名名单；在本批次截止前仍可修改并重新提交。</p>
              <div><button type="button" class="button button--ghost" @click="showWithdrawConfirmation = false">返回检查</button><button type="button" class="button" @click="confirmWithdrawApplication">确认撤回</button></div>
            </section>
          </div>
        </section>

        <div v-else class="recruitment-application-layout">
          <div class="recruitment-application-main">
            <p v-if="isResubmitting" class="recruitment-batch-context" role="status">报名已撤回，可在截止时间前修改后重新提交。</p>
            <p v-else-if="editingApplication" class="recruitment-batch-context" role="status">正在修改已提交报名，保存后会更新当前批次的报名快照。</p>
            <nav class="recruitment-steps" aria-label="报名步骤">
              <button v-for="item in STEPS" :key="item.id" type="button" :class="{ 'is-current': step === item.id, 'is-complete': step > item.id }" :aria-current="step === item.id ? 'step' : undefined" @click="goToStep(item.id)">
                <span>{{ String(item.id).padStart(2, "0") }}</span><strong>{{ item.label }}</strong>
              </button>
            </nav>

            <form class="recruitment-application-card" novalidate @submit.prevent="submitApplication">
              <section v-show="step === 1" aria-labelledby="registration-profile-heading">
                <header class="recruitment-section-heading"><span>01</span><div><h2 id="registration-profile-heading">完善个人资料</h2><p>这些资料会在最终提交后建立当前账号的初始成员档案。</p></div></header>
                <div class="registration-avatar" data-field="avatarUrl">
                  <HsdAvatar :name="profileDraft.name || '成员'" :src="avatarSource" size="lg" />
                  <div><strong>头像（可选）</strong><p>上传后自动用于公开成员展示；未上传时使用白底 HSD 默认头像。当前仅本地预览，不会上传服务器。</p><input ref="fileInput" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="chooseAvatar"><button class="text-link" type="button" @click="fileInput?.click()">选择图片</button><button v-if="profileDraft.avatarUrl" class="text-link registration-avatar__remove" type="button" @click="removeAvatar">移除预览</button><small v-if="errors.avatarUrl" class="form-error" role="alert">{{ errors.avatarUrl }}</small></div>
                </div>
                <div class="registration-fields">
                  <label data-field="name"><span>姓名</span><input v-model="profileDraft.name" autocomplete="name" maxlength="20" :aria-invalid="Boolean(errors.name)" :aria-describedby="errors.name ? 'name-error' : undefined"><small v-if="errors.name" id="name-error" class="form-error">{{ errors.name }}</small></label>
                  <label data-field="studentId"><span>学号</span><input v-model="profileDraft.studentId" inputmode="numeric" maxlength="14" :aria-invalid="Boolean(errors.studentId)" :aria-describedby="errors.studentId ? 'student-id-error' : undefined"><small v-if="errors.studentId" id="student-id-error" class="form-error">{{ errors.studentId }}</small></label>
                  <label data-field="grade"><span>年级</span><select v-model="profileDraft.grade" :aria-invalid="Boolean(errors.grade)" :aria-describedby="errors.grade ? 'grade-error' : undefined"><option value="">请选择年级</option><option v-for="grade in grades" :key="grade" :value="grade">{{ grade }}</option></select><small v-if="errors.grade" id="grade-error" class="form-error">{{ errors.grade }}</small></label>
                  <label data-field="className"><span>班级</span><input v-model="profileDraft.className" maxlength="30" :aria-invalid="Boolean(errors.className)" :aria-describedby="errors.className ? 'class-name-error' : undefined"><small v-if="errors.className" id="class-name-error" class="form-error">{{ errors.className }}</small></label>
                  <label data-field="bio" class="registration-fields__wide"><span>个人简介（选填）</span><textarea v-model="profileDraft.bio" rows="5" maxlength="180" :aria-invalid="Boolean(errors.bio)" :aria-describedby="errors.bio ? 'bio-error' : undefined"></textarea><small>最多 180 个字符，可介绍你的实践重点或想持续发展的方向。</small><small v-if="errors.bio" id="bio-error" class="form-error">{{ errors.bio }}</small></label>
                  <label data-field="contact" class="registration-fields__wide"><span>联系方式</span><input v-model="applicationDraft.contact" maxlength="50" autocomplete="tel" :aria-invalid="Boolean(errors.contact)" :aria-describedby="errors.contact ? 'contact-error contact-help' : 'contact-help'"><small id="contact-help">仅用于招新联系，不展示在公开成员资料中。</small><small v-if="errors.contact" id="contact-error" class="form-error">{{ errors.contact }}</small></label>
                </div>
                <section class="registration-managed" aria-label="系统管理信息"><h3>系统管理信息</h3><dl><div><dt>成员身份</dt><dd>预备成员</dd></div><div><dt>所属中心</dt><dd>待确定</dd></div><div><dt>组织职务</dt><dd>暂无组织职务</dd></div></dl></section>
              </section>

              <section v-show="step === 2" aria-labelledby="application-choice-heading">
                <header class="recruitment-section-heading"><span>02</span><div><h2 id="application-choice-heading">填写报名志愿</h2><p>按真实意愿排序。白泽开发中心只能作为第一志愿。</p></div></header>
                <div class="registration-fields">
                  <label data-field="firstChoice"><span>第一志愿</span><select :value="applicationDraft.firstChoice || ''" :aria-invalid="Boolean(errors.firstChoice)" :aria-describedby="errors.firstChoice ? 'first-choice-error' : undefined" @change="updateFirstChoice"><option value="">请选择第一志愿</option><option v-for="center in RECRUITMENT_CENTERS" :key="center" :value="center">{{ center }}</option></select><small v-if="errors.firstChoice" id="first-choice-error" class="form-error">{{ errors.firstChoice }}</small></label>
                  <label data-field="secondChoice"><span>第二志愿（可选）</span><select v-model="applicationDraft.secondChoice" :aria-invalid="Boolean(errors.secondChoice)" :aria-describedby="errors.secondChoice ? 'second-choice-error' : undefined"><option :value="undefined">未填写</option><option v-for="center in RECRUITMENT_CENTERS.filter((item) => item !== '白泽开发中心')" :key="center" :value="center">{{ center }}</option></select><small v-if="errors.secondChoice" id="second-choice-error" class="form-error">{{ errors.secondChoice }}</small></label>
                  <label data-field="thirdChoice"><span>第三志愿（可选）</span><select v-model="applicationDraft.thirdChoice" :aria-invalid="Boolean(errors.thirdChoice)" :aria-describedby="errors.thirdChoice ? 'third-choice-error' : undefined"><option :value="undefined">未填写</option><option v-for="center in RECRUITMENT_CENTERS.filter((item) => item !== '白泽开发中心')" :key="center" :value="center">{{ center }}</option></select><small v-if="errors.thirdChoice" id="third-choice-error" class="form-error">{{ errors.thirdChoice }}</small></label>
                  <label v-if="isBaizeFirstChoice" data-field="baizeDirection" class="registration-fields__wide"><span>白泽意向方向</span><select v-model="applicationDraft.baizeDirection" :aria-invalid="Boolean(errors.baizeDirection)" :aria-describedby="errors.baizeDirection ? 'baize-direction-error' : undefined"><option value="">请选择方向</option><option v-for="direction in BAIZE_DIRECTIONS" :key="direction" :value="direction">{{ direction }}</option></select><small v-if="errors.baizeDirection" id="baize-direction-error" class="form-error">{{ errors.baizeDirection }}</small></label>
                </div>
                <fieldset data-field="acceptsAdjustment" class="registration-adjustment" :aria-describedby="errors.acceptsAdjustment ? 'adjustment-error' : undefined"><legend>是否接受调剂</legend><label><input v-model="applicationDraft.acceptsAdjustment" type="radio" :value="true">接受调剂</label><label><input v-model="applicationDraft.acceptsAdjustment" type="radio" :value="false">不接受调剂</label><small v-if="errors.acceptsAdjustment" id="adjustment-error" class="form-error">{{ errors.acceptsAdjustment }}</small></fieldset>
              </section>

              <section v-show="step === 3" aria-labelledby="application-confirmation-heading">
                <header class="recruitment-section-heading"><span>03</span><div><h2 id="application-confirmation-heading">确认并提交</h2><p>请核对全部资料；提交后会同步已保存成员资料与本次招新申请。</p></div></header>
                <p class="recruitment-batch-context">当前批次：<strong>{{ activeBatch?.name }}</strong> · 系统将自动关联本批次，不支持手动切换。</p>
                <div class="recruitment-confirmation-grid">
                  <section><header><h3>成员资料</h3><button type="button" class="text-link" @click="goToStep(1)">修改</button></header><div class="recruitment-confirmation-profile"><HsdAvatar :name="profileDraft.name || '成员'" :src="avatarSource" size="sm" /><div><p>姓名：{{ profileDraft.name }}</p><p>学号：{{ profileDraft.studentId }}</p><p>年级：{{ profileDraft.grade }}</p><p>班级：{{ profileDraft.className }}</p></div></div><p v-if="profileDraft.bio">个人简介：{{ profileDraft.bio }}</p><p>联系方式：{{ applicationDraft.contact }}（仅招新联系）</p></section>
                  <section><header><h3>报名志愿</h3><button type="button" class="text-link" @click="goToStep(2)">修改</button></header><p>第一志愿：{{ applicationDraft.firstChoice }}</p><p>第二志愿：{{ applicationDraft.secondChoice || "未填写" }}</p><p>第三志愿：{{ applicationDraft.thirdChoice || "未填写" }}</p><p>白泽意向方向：{{ applicationDraft.baizeDirection || "不适用" }}</p><p>调剂意愿：{{ applicationDraft.acceptsAdjustment ? "接受调剂" : "不接受调剂" }}</p></section>
                </div>
                <label data-field="confirmation" class="registration-confirmation"><input v-model="confirmation" type="checkbox" :aria-invalid="Boolean(errors.confirmation)" :aria-describedby="errors.confirmation ? 'confirmation-error' : undefined">我确认以上资料真实，并同意仅将联系方式用于本次招新联系。</label><small v-if="errors.confirmation" id="confirmation-error" class="form-error">{{ errors.confirmation }}</small>
                <p v-if="submitError" class="form-error" role="alert">{{ submitError }}</p>
              </section>

              <footer class="recruitment-application-actions">
                <button v-if="step > 1" class="button button--ghost" type="button" @click="previousStep">上一步</button>
                <span v-else />
                <button v-if="step < 3" class="button" type="button" @click="nextStep">下一步</button>
                <button v-else class="button" type="submit" :disabled="submitting">{{ submitButtonLabel }}</button>
              </footer>
            </form>
          </div>

          <aside class="recruitment-application-aside"><p class="eyebrow">Application Notes</p><h2>填写说明</h2><ol><li>请使用真实个人资料，提交后可在个人中心继续维护头像与简介。</li><li>联系方式仅用于本次招新联系，不会进入公开成员展示。</li><li>报名提交后为预备成员，所属中心与组织职务将等待后续结果确定。</li></ol><p>当前为前端 Mock 演示，不会创建真实账号、上传文件或写入数据库。</p></aside>
        </div>
      </div>
    </section>
  </div>
</template>
