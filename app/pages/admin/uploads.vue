<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { ADMIN_UPLOAD_TASKS, type AdminAssetCenterId, filterAdminUploadTasksByOwnerCenter } from "~/data/admin-assets";
import { useUploadGateway } from "~/composables/useUploadGateway";
import { createAdminUploadListController, type AdminUploadKind, type AdminUploadStatus } from "~/services/uploads/admin-upload-list";
import { useSessionStore } from "~/stores/session";
import { getAdminCenterScope, getRecruitmentCenterId } from "~/utils/admin-center-scope";

definePageMeta({ layout: "admin" });
useHead({ title: "上传任务｜HSD 管理台" });

const runtime = useRuntimeConfig() as { public: { useMockApi: boolean } };
const useMockApi = runtime.public.useMockApi;
const gateway = useUploadGateway();
const session = useSessionStore();
const centerScope = computed(() => getAdminCenterScope(session.currentAccount?.adminCenterRole));
const ownerCenterId = computed<AdminAssetCenterId | undefined>(() => centerScope.value ? getRecruitmentCenterId(centerScope.value) as AdminAssetCenterId : undefined);
const visibleUploadTasks = computed(() => filterAdminUploadTasksByOwnerCenter(ADMIN_UPLOAD_TASKS, ownerCenterId.value));

const realList = !useMockApi && gateway ? createAdminUploadListController(gateway) : undefined;
const query = ref(""); const status = ref<AdminUploadStatus | "">(""); const kind = ref<AdminUploadKind | "">(""); const centerId = ref("");
const page = computed({ get: () => realList?.query.value.page ?? 1, set: (value: number) => { if (realList) { realList.setPage(value); void realList.load(); } } });
const isOwner = computed(() => session.adminLevel === "owner");
const rows = computed(() => realList?.records.value ?? []); const total = computed(() => realList?.total.value ?? 0); const pageCount = computed(() => Math.max(1, Math.ceil(total.value / (realList?.query.value.pageSize ?? 20)))); const listStatus = computed(() => realList?.status.value ?? "error"); const listError = computed(() => realList?.error.value || "上传任务读取服务不可用。");
let filterTimer: ReturnType<typeof setTimeout> | undefined;
let filterWatchInitialized = false;
watch([query, status, kind, centerId], () => {
  if (!realList) return;
  realList.setFilters({ q: query.value, ...(status.value ? { status: status.value } : {}), ...(kind.value ? { kind: kind.value } : {}), ...(isOwner.value && centerId.value ? { centerId: centerId.value } : {}) });
  if (!filterWatchInitialized) {
    filterWatchInitialized = true;
    void realList.load();
    return;
  }
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(() => { void realList.load(); }, 300);
});
onUnmounted(() => { if (filterTimer) clearTimeout(filterTimer); });
</script>

<template>
  <div v-if="useMockApi" class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Upload Tasks" title="上传任务" description="本地 Mock 演示任务进度与处理状态。"><template #actions><NuxtLink class="button" to="/admin">返回管理台</NuxtLink></template></AdminPageHeading>
    <section class="admin-list-card"><header><div><span>Upload Queue</span><h2>当前上传与处理任务</h2></div><p>{{ visibleUploadTasks.length }} 个 Mock 任务</p></header><div class="admin-upload-list admin-upload-list--page"><article v-for="task in visibleUploadTasks" :key="task.id"><div><strong>{{ task.name }}</strong><small>{{ task.type }} · {{ task.note }}</small></div><AdminStatusPill :status="task.status" /><span><i :style="{ width: `${task.progress}%` }" /></span><b>{{ task.progress }}%</b></article></div></section>
  </div>

  <div v-else class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Upload Tasks" title="上传任务" description="仅从服务端分页读取上传与处理队列。"><template #actions><NuxtLink class="button" to="/admin">返回管理台</NuxtLink></template></AdminPageHeading>
    <section class="admin-summary-strip" aria-label="上传任务概览"><div><span>匹配任务</span><strong>{{ total }}</strong><small>服务端查询结果</small></div><div><span>当前页</span><strong>{{ rows.length }}</strong><small>仅 API 返回项目</small></div><div><span>页码</span><strong>{{ page }}</strong><small>共 {{ pageCount }} 页</small></div><div><span>读取模式</span><strong>API</strong><small>不使用本地任务缓存</small></div></section>
    <section class="admin-list-card"><header><div><span>Upload Queue</span><h2>上传与处理任务</h2></div><p>数据仅来自服务端分页查询</p></header>
      <div class="admin-filters"><label>搜索文件<input v-model="query" type="search" placeholder="文件名"></label><label>上传状态<select v-model="status"><option value="">全部状态</option><option value="uploading">上传中</option><option value="processing">处理中</option><option value="ready">可用</option><option value="failed">失败</option><option value="expired">已过期</option></select></label><label>文件类型<select v-model="kind"><option value="">全部类型</option><option value="image">图片</option><option value="video">视频</option></select></label><label v-if="isOwner">中心 ID<input v-model="centerId" type="search" placeholder="可选中心 ID"></label></div>
      <div v-if="listStatus === 'loading'" class="admin-empty" role="status"><strong>正在读取上传任务</strong><p>正在请求服务端分页数据。</p></div><div v-else-if="listStatus === 'unauthorized'" class="admin-empty" role="alert"><strong>登录状态已失效</strong><p>{{ listError }}</p></div><div v-else-if="listStatus === 'forbidden'" class="admin-empty" role="alert"><strong>无权读取上传任务</strong><p>{{ listError }}</p></div><div v-else-if="listStatus === 'notFound'" class="admin-empty" role="alert"><strong>上传任务不存在</strong><p>{{ listError }}</p></div><div v-else-if="listStatus === 'error'" class="admin-empty" role="alert"><strong>上传任务读取失败</strong><p>{{ listError }}</p></div>
      <div v-else-if="rows.length" class="admin-table-scroll"><table aria-label="上传任务列表"><thead><tr><th>文件</th><th>类型</th><th>大小</th><th>状态</th><th>版本</th><th>创建人</th><th>完成时间</th><th>过期时间</th><th>失败代码</th></tr></thead><tbody><tr v-for="upload in rows" :key="upload.id"><td><strong>{{ upload.fileName }}</strong><small>{{ upload.mimeType }}</small></td><td>{{ upload.kind }}</td><td>{{ upload.byteSize }}</td><td>{{ upload.status }}</td><td>R{{ upload.version }}</td><td>{{ upload.createdBy }}</td><td>{{ upload.completedAt || "—" }}</td><td>{{ upload.expiresAt }}</td><td>{{ upload.failureCode || "—" }}</td></tr></tbody></table></div><div v-else class="admin-empty"><strong>没有匹配的上传任务</strong><p>服务端未返回符合当前筛选条件的任务。</p></div><PaginationControls v-if="listStatus !== 'loading'" v-model="page" :page-count="pageCount" label="上传任务分页" />
    </section>
  </div>
</template>
