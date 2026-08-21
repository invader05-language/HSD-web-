<script setup lang="ts">
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import { useCurrentMember } from "~/composables/useCurrentMember";
import {
  isSupportedAvatar,
  validateMemberProfileDraft,
  type MemberProfileFormErrors,
} from "~/utils/member-profile-form";
import { BAIZE_DIRECTIONS } from "~/data/recruitment-application";

definePageMeta({ middleware: "member" });
useHead({ title: "编辑个人资料｜白云 HSD 开发者部落" });

const session = useSessionStore();
const sessionGateway = useSessionGateway();
const apiRuntime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const currentMember = useCurrentMember();
const currentProfile = currentMember.profile;
const draft = reactive(currentMember.createDraft());
const errors = reactive<MemberProfileFormErrors & { avatar?: string }>({});
const status = ref<"idle" | "saving" | "success" | "error">("idle");
const fileInput = ref<HTMLInputElement | null>(null);
let draftObjectUrl: string | undefined;

const avatarSource = computed(() => draft.avatarUrl || undefined);

function clearErrors() {
  delete errors.name;
  delete errors.grade;
  delete errors.className;
  delete errors.baizeDirection;
  delete errors.bio;
  delete errors.avatar;
}

function releaseDraftObjectUrl() {
  if (draftObjectUrl && draftObjectUrl !== currentProfile.value.avatarUrl) {
    URL.revokeObjectURL(draftObjectUrl);
  }
  draftObjectUrl = undefined;
}

function resetDraft() {
  releaseDraftObjectUrl();
  Object.assign(draft, currentMember.createDraft());
  clearErrors();
  status.value = "idle";
}

function chooseAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  delete errors.avatar;
  if (!isSupportedAvatar(file)) {
    errors.avatar = "请选择 JPG、PNG、WEBP 或 GIF 图片，且文件不超过 5MB。";
    (event.target as HTMLInputElement).value = "";
    return;
  }

  if (draftObjectUrl) URL.revokeObjectURL(draftObjectUrl);
  draftObjectUrl = URL.createObjectURL(file);
  draft.avatarUrl = draftObjectUrl;
  status.value = "idle";
}

function removeAvatar() {
  if (draftObjectUrl) URL.revokeObjectURL(draftObjectUrl);
  draftObjectUrl = undefined;
  draft.avatarUrl = undefined;
  if (fileInput.value) fileInput.value.value = "";
  delete errors.avatar;
}

async function saveProfile() {
  clearErrors();
  const validation = validateMemberProfileDraft(draft);
  Object.assign(errors, validation);
  if (Object.keys(validation).length) {
    status.value = "error";
    return;
  }

  status.value = "saving";
  await new Promise((resolve) => window.setTimeout(resolve, 180));
  const previousAvatarUrl = currentProfile.value.avatarUrl;
  currentMember.updateProfile({
    name: draft.name.trim(),
    grade: draft.grade.trim(),
    className: draft.className.trim(),
    baizeDirection: draft.center === "白泽开发中心" ? draft.baizeDirection : undefined,
    bio: draft.bio.trim(),
    avatarUrl: draft.avatarUrl,
  });
  if (previousAvatarUrl && previousAvatarUrl !== draft.avatarUrl) {
    URL.revokeObjectURL(previousAvatarUrl);
  }
  draftObjectUrl = undefined;
  status.value = "success";
  await nextTick();
}

async function signOut() {
  if (await session.signOutForRuntime(apiRuntime.public, sessionGateway)) {
    await navigateTo("/");
  }
}

onBeforeUnmount(() => {
  releaseDraftObjectUrl();
});
</script>

<template>
  <div class="member-profile-page">
    <div class="member-profile-mobile-identity">
      <div>
        <HsdAvatar :name="currentProfile.name" :src="currentProfile.avatarUrl" size="sm" />
        <span><strong>{{ currentProfile.name }}</strong><small>{{ currentProfile.identity }}</small></span>
      </div>
      <span>成员空间 / 个人资料</span>
    </div>

    <div class="member-profile-layout">
      <aside class="member-profile-aside">
        <div class="member-space__identity">
          <HsdAvatar :name="currentProfile.name" :src="currentProfile.avatarUrl" size="md" />
          <div><strong>{{ currentProfile.name }}</strong><span>{{ currentProfile.identity }}</span></div>
        </div>
        <nav aria-label="成员空间导航">
          <NuxtLink to="/member">个人概览</NuxtLink>
          <a href="/member#application">申请进度</a>
          <NuxtLink to="/member/results">结果中心</NuxtLink>
          <a href="/member#activities">活动与比赛</a>
          <a class="is-active" href="#profile-form" aria-current="page">个人资料</a>
          <button type="button" @click="signOut">退出登录</button>
        </nav>
        <p v-if="session.signOutError" role="alert">{{ session.signOutError }}</p>
      </aside>

      <main id="profile-form" class="member-profile-main">
        <p class="member-profile-breadcrumb">成员空间　/　<strong>个人资料</strong></p>
        <p class="eyebrow">Member Profile</p>
        <h1>编辑个人资料</h1>
        <p class="member-profile-lead">完善你的个人与成员资料。姓名、年级和班级可由本人修改；学号和组织归属由部落统一维护。</p>

        <div class="member-profile-note">
          <strong>前端演示预览</strong>
          <span v-if="currentProfile.identity === '预备成员'">保存后只同步当前预备成员的个人资料与招新记录，不进入官网正式成员目录；不会上传或写入数据库。</span>
          <span v-else>保存后会同步当前前端会话内的成员页面、官网展示和管理端展示；不会上传或写入数据库。</span>
        </div>

        <p v-if="status === 'saving'" class="member-profile-status" role="status"><strong>正在保存资料…</strong> 请不要重复提交。</p>
        <p v-else-if="status === 'success'" class="member-profile-status" role="status"><strong>资料已更新。</strong> 当前前端演示页面已同步加载新资料。</p>
        <p v-else-if="status === 'error' && !Object.keys(errors).length" class="member-profile-status member-profile-status--error" role="alert"><strong>暂未保存成功。</strong> 请检查填写内容后重试。</p>

        <form class="member-profile-card" novalidate @submit.prevent="saveProfile">
          <section class="member-profile-section">
            <div class="member-profile-section__head">
              <div><span class="member-profile-number">01</span><div><h2>个人基础与组织资料</h2><p>个人基础信息可自行修改；学号和组织信息由授权管理员维护。</p></div></div>
              <span class="member-profile-readonly">部分可编辑</span>
            </div>
            <div class="member-profile-fields">
              <label>
                <span>姓名</span>
                <input v-model="draft.name" maxlength="20" autocomplete="name" :aria-invalid="Boolean(errors.name)" aria-describedby="name-help name-error">
                <small id="name-help">填写本人常用姓名，保存后同步到成员空间与公开展示。</small>
                <small v-if="errors.name" id="name-error" class="member-profile-error">{{ errors.name }}</small>
              </label>
              <label>
                <span>年级</span>
                <input v-model="draft.grade" maxlength="12" placeholder="如：2026 级" :aria-invalid="Boolean(errors.grade)" aria-describedby="grade-help grade-error">
                <small id="grade-help">填写当前所属年级。</small>
                <small v-if="errors.grade" id="grade-error" class="member-profile-error">{{ errors.grade }}</small>
              </label>
              <label class="member-profile-field-wide">
                <span>班级</span>
                <input v-model="draft.className" maxlength="30" placeholder="如：软件工程 1 班" :aria-invalid="Boolean(errors.className)" aria-describedby="class-help class-error">
                <small id="class-help">填写当前专业与班级信息。</small>
                <small v-if="errors.className" id="class-error" class="member-profile-error">{{ errors.className }}</small>
              </label>
            </div>
            <div class="member-profile-readonly-grid">
              <div><span>学号</span><strong>{{ draft.studentId }}</strong></div>
              <div><span>所属中心</span><strong>{{ currentProfile.identity === "预备成员" ? "待确定" : draft.center }}</strong></div>
              <div><span>成员职责</span><strong>{{ currentProfile.identity === "预备成员" ? "普通成员" : draft.memberDuty }}</strong></div>
            </div>
          </section>

          <section class="member-profile-section">
            <div class="member-profile-section__head">
              <div><span class="member-profile-number">02</span><div><h2>成员资料</h2><p>保存后直接同步到当前前端会话中的成员展示页面。</p></div></div>
            </div>
            <div class="member-profile-fields">
              <label v-if="draft.center === '白泽开发中心'">
                <span>实践方向</span>
                <select v-model="draft.baizeDirection" :aria-invalid="Boolean(errors.baizeDirection)" aria-describedby="baize-direction-help baize-direction-error">
                  <option :value="undefined" disabled>请选择实践方向</option>
                  <option v-for="direction in BAIZE_DIRECTIONS" :key="direction" :value="direction">{{ direction }}</option>
                </select>
                <small id="baize-direction-help">白泽开发中心统一使用五项实践方向。</small>
                <small v-if="errors.baizeDirection" id="baize-direction-error" class="member-profile-error">{{ errors.baizeDirection }}</small>
              </label>
              <label class="member-profile-field-wide">
                <span>个人简介</span>
                <textarea v-model="draft.bio" maxlength="500" rows="5" :aria-invalid="Boolean(errors.bio)" aria-describedby="bio-help bio-error"></textarea>
                <small id="bio-help">选填。可介绍当前实践重点、协作经验或正在成长的方向。</small>
                <small v-if="errors.bio" id="bio-error" class="member-profile-error">{{ errors.bio }}</small>
              </label>
            </div>
          </section>

          <section class="member-profile-section">
            <div class="member-profile-section__head">
              <div><span class="member-profile-number">03</span><div><h2>头像</h2><p>上传后自动用于公开成员展示；未上传或移除头像时统一使用白底 HSD 默认头像。</p></div></div>
            </div>
            <div class="member-profile-avatar-panel">
              <HsdAvatar :name="draft.name" :src="avatarSource" size="lg" />
              <div class="member-profile-upload-box">
                <strong>选择头像图片</strong>
                <span>当前仅进行浏览器本地预览，不会上传服务器；正式接入后，正式成员头像会作为基础展示资料默认公开。</span>
                <input ref="fileInput" class="member-profile-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="chooseAvatar">
                <button class="text-link" type="button" @click="fileInput?.click()">选择图片</button>
                <button v-if="draft.avatarUrl" class="text-link member-profile-remove-avatar" type="button" @click="removeAvatar">移除当前预览</button>
                <small v-if="errors.avatar" class="member-profile-error" role="alert">{{ errors.avatar }}</small>
              </div>
            </div>
          </section>

          <section v-if="draft.publicId" class="member-profile-section">
            <div class="member-profile-section__head">
              <div><span class="member-profile-number">04</span><div><h2>关联记录</h2><p>荣誉和成长记录在各自页面维护，不与基础资料混合编辑。</p></div></div>
            </div>
            <div class="member-profile-related">
              <NuxtLink :to="`/people/${draft.publicId}`"><span><strong>个人荣誉</strong><small>查看已公开的荣誉记录</small></span><b>进入 →</b></NuxtLink>
            </div>
          </section>

          <footer class="member-profile-footer">
            <span>当前是前端演示：关闭或刷新浏览器后，资料可能恢复为示例数据。</span>
            <div>
              <button class="button button--ghost" type="button" :disabled="status === 'saving'" @click="resetDraft">取消修改</button>
              <button class="button" type="submit" :disabled="status === 'saving'">{{ status === "saving" ? "正在保存…" : "保存个人资料" }}</button>
            </div>
          </footer>
        </form>
      </main>
    </div>
  </div>
</template>
