<script setup lang="ts">
import MemberSpaceNav from "~/components/member/MemberSpaceNav.vue";
import { useGrowthGateway } from "~/composables/useGrowthGateway";
import { useGrowthStore } from "~/stores/growth";
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";

if (typeof definePageMeta === "function") definePageMeta({ middleware: "member" });
useHead({ title: "我的成长记录｜成员空间" });
const runtime = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
const session = useSessionStore();
const sessionGateway = useSessionGateway();
const gateway = useGrowthGateway();
const store = useGrowthStore();
const form = reactive({ title: "", category: "", reflection: "", occurredOn: "" });
const editing = ref<{ id: string; version: number } | null>(null);
const validationError = ref("");
const profile = computed(() => session.apiSession?.person
  ? { name: session.apiSession.person.name, identity: session.apiSession.person.status === "FORMAL_MEMBER" ? "正式成员" : "预备成员" }
  : { name: "成员", identity: "成员" });
if (gateway) await useAsyncData("member-growth-records", () => store.refresh(gateway));

async function submit() {
  validationError.value = "";
  if (form.title.length > 60 || form.category.length > 30 || form.reflection.length > 1000) { validationError.value = "请将输入内容控制在页面提示的字数范围内。"; return; }
  if (!gateway) return;
  const saved = editing.value
    ? await store.update(gateway, editing.value.id, { expectedVersion: editing.value.version, ...form })
    : await store.create(gateway, { expectedVersion: 0, ...form });
  if (saved) resetForm();
}
function edit(item: typeof store.items[number]) { editing.value = { id: item.id, version: item.version }; Object.assign(form, { title: item.title, category: item.category, reflection: item.reflection, occurredOn: item.occurredOn }); validationError.value = ""; }
function resetForm() { editing.value = null; Object.assign(form, { title: "", category: "", reflection: "", occurredOn: "" }); validationError.value = ""; }
async function remove(item: typeof store.items[number]) { if (!gateway || !window.confirm("确定删除这条成长记录吗？")) return; await store.remove(gateway, item.id, item.version); }
async function signOut() { if (await session.signOutForRuntime(runtime.public, sessionGateway)) await navigateTo("/"); }
</script>

<template>
  <div class="member-space member-space--subpage">
    <MemberSpaceNav :profile="profile" active="growth" :signing-out="session.isSigningOut" :sign-out-error="session.signOutError" @sign-out="signOut" />
    <main class="section member-space__content"><div class="shell">
      <p class="eyebrow">成员空间</p><h1>我的成长记录</h1><p>记录只对本人可见，用于回顾实践过程和成长变化。</p>
      <p v-if="store.apiLoading" role="status">正在同步成长记录…</p><p v-if="store.apiError" role="alert">{{ store.apiError.message }}</p><p v-if="validationError" class="form-error" role="alert">{{ validationError }}</p>
      <form data-testid="growth-record-form" class="member-record-form" @submit.prevent="submit">
        <div class="member-record-form__grid"><label>标题<input v-model="form.title" maxlength="60" required><small>{{ form.title.length }}/60</small></label><label>类别<input v-model="form.category" maxlength="30" required><small>{{ form.category.length }}/30</small></label><label>发生日期<input v-model="form.occurredOn" type="date" required></label></div>
        <label>成长复盘<textarea v-model="form.reflection" maxlength="1000" rows="7"></textarea><small>{{ form.reflection.length }}/1000</small></label>
        <div class="member-record-form__actions"><button class="button" :disabled="store.apiLoading">{{ editing ? "保存修改" : "保存记录" }}</button><button v-if="editing" class="button button--ghost" type="button" :disabled="store.apiLoading" @click="resetForm">取消编辑</button></div>
      </form>
      <section class="member-record-list" aria-label="成长记录列表"><header><h2>已保存记录</h2><span>{{ store.items.length }} 条</span></header><p v-if="!store.items.length && !store.apiLoading && !store.apiError" data-testid="empty" class="member-space-empty">还没有成长记录，完成一次实践后可以从这里开始记录。</p><div v-else class="member-record-timeline"><article v-for="item in store.items" :key="item.id" class="member-record-card"><header><div><span>{{ item.category }}</span><h3>{{ item.title }}</h3></div><time>{{ item.occurredOn }}</time></header><p class="member-record-card__body">{{ item.reflection || "未填写复盘内容" }}</p><footer><button type="button" class="text-link" :disabled="store.apiLoading" @click="edit(item)">编辑</button><button type="button" class="text-link" :disabled="store.apiLoading" @click="remove(item)">删除</button></footer></article></div></section>
    </div></main>
  </div>
</template>
