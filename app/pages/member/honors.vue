<script setup lang="ts">
import MemberSpaceNav from "~/components/member/MemberSpaceNav.vue";
import { useHonorsGateway } from "~/composables/useHonorsGateway";
import { useMemberHonorsStore } from "~/stores/member-honors";
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";

if (typeof definePageMeta === "function") definePageMeta({ middleware: "member" });
useHead({ title: "我的荣誉｜成员空间" });
const runtime = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
const session = useSessionStore();
const sessionGateway = useSessionGateway();
const gateway = useHonorsGateway();
const store = useMemberHonorsStore();
const form = reactive({ title: "", type: "", description: "", awardedAt: "", proofReference: "" });
const validationError = ref("");
const profile = computed(() => session.apiSession?.person
  ? { name: session.apiSession.person.name, identity: session.apiSession.person.status === "FORMAL_MEMBER" ? "正式成员" : "预备成员" }
  : { name: "成员", identity: "成员" });
if (gateway) await useAsyncData("member-honors", () => store.refresh(gateway));

async function submit() {
  validationError.value = "";
  if (form.title.length > 80 || form.type.length > 40 || form.description.length > 1000 || form.proofReference.length > 1000) { validationError.value = "请将输入内容控制在页面提示的字数范围内。"; return; }
  if (!gateway) return;
  const created = await store.submit(gateway, { expectedVersion: 0, ...form, publicConsent: false });
  if (created) Object.assign(form, { title: "", type: "", description: "", awardedAt: "", proofReference: "" });
}
async function consent(item: typeof store.items[number], value: boolean) { if (gateway) await store.updateConsent(gateway, item.id, item.version, value); }
async function signOut() { if (await session.signOutForRuntime(runtime.public, sessionGateway)) await navigateTo("/"); }
</script>

<template>
  <div class="member-space member-space--subpage">
    <MemberSpaceNav :profile="profile" active="honors" :signing-out="session.isSigningOut" :sign-out-error="session.signOutError" @sign-out="signOut" />
    <main class="section member-space__content"><div class="shell">
      <p class="eyebrow">成员空间</p><h1>我的荣誉</h1><p>提交自己的荣誉记录，审核通过后可以决定是否公开展示。</p>
      <p v-if="store.apiLoading" role="status">正在同步荣誉…</p><p v-if="store.apiError" role="alert">{{ store.apiError.message }}</p><p v-if="validationError" class="form-error" role="alert">{{ validationError }}</p>
      <form data-testid="member-honor-form" class="member-record-form" @submit.prevent="submit"><div class="member-record-form__grid"><label>荣誉名称<input v-model="form.title" maxlength="80" required><small>{{ form.title.length }}/80</small></label><label>类型<input v-model="form.type" maxlength="40" required><small>{{ form.type.length }}/40</small></label><label>获奖日期<input v-model="form.awardedAt" type="date" required></label></div><label>荣誉说明<textarea v-model="form.description" maxlength="1000" rows="6"></textarea><small>{{ form.description.length }}/1000</small></label><label>证明材料引用<input v-model="form.proofReference" maxlength="1000"><small>{{ form.proofReference.length }}/1000</small></label><div class="member-record-form__actions"><button class="button" :disabled="store.apiLoading">提交荣誉</button></div></form>
      <section class="member-record-list" aria-label="我的荣誉列表"><header><h2>已提交荣誉</h2><span>{{ store.items.length }} 条</span></header><p v-if="!store.items.length && !store.apiLoading && !store.apiError" data-testid="empty" class="member-space-empty">还没有提交过荣誉记录。</p><div v-else class="member-record-timeline"><article v-for="item in store.items" :key="item.id" class="member-record-card"><header><div><span>{{ item.type }}</span><h3>{{ item.title }}</h3></div><time>{{ item.awardedDateLabel }}</time></header><p class="member-record-card__body">{{ item.description || "未填写荣誉说明" }}</p><footer><span class="member-record-status">{{ item.status === "approved" ? "已通过" : item.status === "rejected" ? "未通过" : "审核中" }}</span><label v-if="item.status === 'approved'" class="member-record-consent"><input :checked="item.publicConsent" type="checkbox" @change="consent(item, ($event.target as HTMLInputElement).checked)">同意公开</label></footer></article></div></section>
    </div></main>
  </div>
</template>
