<script setup lang="ts">
import { useSessionStore } from "~/stores/session";
import { useCurrentMember } from "~/composables/useCurrentMember";
import {
  isSupportedAvatar,
  validateMemberProfileDraft,
  type MemberProfileFormErrors,
} from "~/utils/member-profile-form";

definePageMeta({ middleware: "member" });
useHead({ title: "编辑个人资料｜白云 HSD 开发者部落" });

const session = useSessionStore();
const currentMember = useCurrentMember();
const currentProfile = currentMember.profile;
const draft = reactive(currentMember.createDraft());
const errors = reactive<MemberProfileFormErrors & { avatar?: string }>({});
const status = ref<"idle" | "saving" | "success" | "error">("idle");
const fileInput = ref<HTMLInputElement | null>(null);
let draftObjectUrl: string | undefined;

const avatarSource = computed(() => draft.avatarUrl || undefined);

function clearErrors() {
  delete errors.direction;
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
    direction: draft.direction.trim(),
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
          <button type="button" @click="session.signOut(); navigateTo('/')">退出登录</button>
        </nav>
      </aside>

      <main id="profile-form" class="member-profile-main">
        <p class="member-profile-breadcrumb">成员空间　/　<strong>个人资料</strong></p>
        <p class="eyebrow">Member Profile</p>
        <h1>编辑个人资料</h1>
        <p class="member-profile-lead">完善你的成员资料。学籍和组织资料由部落统一维护，不能在此修改。</p>

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
              <div><span class="member-profile-number">01</span><div><h2>身份与组织资料</h2><p>这些信息用于学籍和组织识别，由授权管理员维护。</p></div></div>
              <span class="member-profile-readonly">系统只读</span>
            </div>
            <div class="member-profile-readonly-grid">
              <div><span>姓名</span><strong>{{ draft.name }}</strong></div>
              <div><span>学号</span><strong>{{ draft.studentId }}</strong></div>
              <div><span>年级</span><strong>{{ draft.grade }}</strong></div>
              <div><span>班级</span><strong>{{ draft.className }}</strong></div>
              <div><span>所属中心</span><strong>{{ currentProfile.identity === "预备成员" ? "待确定" : draft.center }}</strong></div>
              <div><span>组织职务</span><strong>{{ currentProfile.identity === "预备成员" ? "暂无组织职务" : draft.role }}</strong></div>
            </div>
          </section>

          <section class="member-profile-section">
            <div class="member-profile-section__head">
              <div><span class="member-profile-number">02</span><div><h2>成员资料</h2><p>保存后直接同步到当前前端会话中的成员展示页面。</p></div></div>
            </div>
            <div class="member-profile-fields">
              <label>
                <span>实践方向</span>
                <input v-model="draft.direction" maxlength="80" :aria-invalid="Boolean(errors.direction)" aria-describedby="direction-help direction-error">
                <small id="direction-help">用一句话描述当前主要参与方向。</small>
                <small v-if="errors.direction" id="direction-error" class="member-profile-error">{{ errors.direction }}</small>
              </label>
              <label class="member-profile-field-wide">
                <span>个人简介</span>
                <textarea v-model="draft.bio" maxlength="500" rows="5" :aria-invalid="Boolean(errors.bio)" aria-describedby="bio-help bio-error"></textarea>
                <small id="bio-help">请介绍当前实践重点、协作经验或正在成长的方向。</small>
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
                <span>当前仅进行浏览器本地预览，不会上传服务器；正式接入后，上传即视为同意在成员页面公开展示。</span>
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
