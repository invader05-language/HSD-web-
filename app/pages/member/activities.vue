<script setup lang="ts">
import MemberSpaceNav from "~/components/member/MemberSpaceNav.vue";
import { useSessionStore } from "~/stores/session";
import { useSessionGateway } from "~/composables/useSessionGateway";
import { useMemberActivitiesGateway } from "~/composables/useMemberActivitiesGateway";
import type { MemberActivityRegistration, MemberActivityStatus } from "~/services/member-activities/member-activities-gateway";

if (typeof definePageMeta === "function") definePageMeta({ middleware: "member" });
useHead({ title: "活动与比赛｜成员空间" });
const runtime = useRuntimeConfig() as { public: { apiBase: string; useMockApi: boolean } };
const session = useSessionStore();
const sessionGateway = useSessionGateway();
const gateway = useMemberActivitiesGateway();
const profile = computed(() => session.apiSession?.person ? { name: session.apiSession.person.name, identity: session.apiSession.person.status === "FORMAL_MEMBER" ? "正式成员" : "预备成员" } : { name: "成员", identity: "成员" });
const items = ref<MemberActivityRegistration[]>([]);
const page = ref(1);
const pageSize = 20;
const totalPages = ref(0);
const status = ref<MemberActivityStatus | "all">("all");
const loading = ref(false);
const error = ref("");

async function load() {
  if (!gateway) return;
  loading.value = true; error.value = "";
  try { const result = await gateway.list(page.value, pageSize, status.value); items.value = result.items; totalPages.value = result.totalPages; }
  catch (cause) { error.value = cause instanceof Error ? cause.message : "活动报名暂时不可用。"; }
  finally { loading.value = false; }
}
async function changeStatus(value: MemberActivityStatus | "all") { status.value = value; page.value = 1; await load(); }
async function cancel(item: MemberActivityRegistration) { if (!gateway || !window.confirm("确定取消这项活动报名吗？")) return; await gateway.cancel(item.id, item.version); await load(); }
async function signOut() { if (await session.signOutForRuntime(runtime.public, sessionGateway)) await navigateTo("/"); }
onMounted(() => void load());
</script>

<template>
  <div class="member-space member-space--subpage">
    <MemberSpaceNav :profile="profile" active="activities" :signing-out="session.isSigningOut" :sign-out-error="session.signOutError" @sign-out="signOut" />
    <main class="section member-space__content"><div class="shell">
      <p class="eyebrow">成员空间</p><h1>活动与比赛</h1><p>查看已报名活动、比赛安排和当前报名状态。</p>
      <div class="member-activity-filters" role="tablist" aria-label="活动报名状态"><button v-for="option in [{ value: 'all', label: '全部' }, { value: 'registered', label: '已报名' }, { value: 'accepted', label: '已通过' }, { value: 'rejected', label: '未通过' }, { value: 'cancelled', label: '已取消' }]" :key="option.value" type="button" :aria-selected="status === option.value" @click="changeStatus(option.value as MemberActivityStatus | 'all')">{{ option.label }}</button></div>
      <p v-if="loading" role="status">正在读取活动报名…</p><p v-else-if="error" role="alert">{{ error }}</p><p v-else-if="!items.length" class="member-space-empty">当前筛选条件下暂无活动报名。</p>
      <div v-else class="member-activity-list"><article v-for="item in items" :key="item.id" class="member-activity-card"><header><span>{{ item.type }}</span><strong>{{ item.title }}</strong><b>{{ item.status === 'accepted' ? '已通过' : item.status === 'rejected' ? '未通过' : item.status === 'cancelled' ? '已取消' : '已报名' }}</b></header><dl><div><dt>时间</dt><dd>{{ item.date }} {{ item.time }}</dd></div><div><dt>地点</dt><dd>{{ item.location }}</dd></div></dl><button v-if="item.status === 'registered'" type="button" class="text-link" @click="cancel(item)">取消报名</button></article></div>
      <nav v-if="totalPages > 1" class="member-space-pagination" aria-label="活动分页"><button type="button" :disabled="page <= 1" @click="page -= 1; load()">上一页</button><span>第 {{ page }} / {{ totalPages }} 页</span><button type="button" :disabled="page >= totalPages" @click="page += 1; load()">下一页</button></nav>
    </div></main>
  </div>
</template>
