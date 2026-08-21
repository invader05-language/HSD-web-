<script setup lang="ts">
import { onServerPrefetch } from "vue";
import { useContentGateway } from "~/composables/useContentGateway";
import { useHelpStore } from "~/stores/help";
import { ADMIN_CONTENT_RECORDS } from "~/data/admin-content";
definePageMeta({ layout: "admin" });
useHead({ title: "帮助中心管理｜HSD 管理台" });
const gateway = useContentGateway();
const helpStore = useHelpStore();
const selectedId = ref<string>();
const draft = reactive({ title: "", summary: "", body: "" });
const newSlug = ref("");
const mockHelpRecords = ADMIN_CONTENT_RECORDS.filter((record) => record.category === "帮助文章");
if (gateway) {
  const initialHelp = useState("help-admin-initial", () => ({ initialized: false, items: [] as typeof helpStore.adminItems, error: null as typeof helpStore.adminError }));
  const load = async () => {
    await helpStore.refreshAdmin(gateway);
    initialHelp.value = { initialized: true, items: helpStore.adminItems, error: helpStore.adminError };
  };
  if (import.meta.server || import.meta.env.SSR) onServerPrefetch(load);
  else if (useNuxtApp().isHydrating && initialHelp.value.initialized) helpStore.$patch({ adminItems: initialHelp.value.items, adminError: initialHelp.value.error, adminLoading: false });
  else void load();
}
const selected = computed(() => helpStore.adminItems.find((item) => item.id === selectedId.value));
function edit(id: string) { const item = helpStore.adminItems.find((value) => value.id === id); if (!item) return; selectedId.value = id; Object.assign(draft, item.workingRevision); }
async function save() { if (gateway && selected.value) await helpStore.saveDraft(gateway, selected.value, draft); }
async function publish() { if (!gateway || !selected.value || !confirm("确认保存并发布当前草稿？已发布版本将在成功后才会切换。")) return; const saved = await helpStore.saveDraft(gateway, selected.value, draft); if (saved) await helpStore.publish(gateway, saved); }
async function createDraft() { if (!gateway) return; const created = await helpStore.createDraft(gateway, { slug: newSlug.value, ...draft }); if (created) { newSlug.value = ""; edit(created.id); } }
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Help Center" title="帮助中心管理" description="草稿与公开版本分离；发布成功后才会切换官网读取的不可变修订。" />
    <AdminRecordWorkspace v-if="!gateway" :records="mockHelpRecords" table-label="帮助文章列表" item-label="帮助文章" new-label="新建帮助文章" :categories="['帮助文章']" />
    <section v-if="gateway" class="admin-list-card" aria-label="新建帮助草稿"><h2>新建帮助草稿</h2><label>稳定 slug<input v-model="newSlug" type="text" placeholder="account-login"></label><label>标题<input v-model="draft.title" type="text"></label><label>摘要<textarea v-model="draft.summary" rows="2" /></label><label>正文<textarea v-model="draft.body" rows="4" /></label><button type="button" class="button" @click="createDraft">新建草稿</button></section>
    <section v-if="gateway" class="admin-list-card">
      <p v-if="helpStore.adminLoading" role="status">正在加载帮助草稿...</p>
      <div v-else-if="helpStore.adminError" class="admin-empty"><strong>帮助内容加载失败</strong><p>{{ helpStore.adminError.message }}</p></div>
      <div v-else-if="!helpStore.adminItems.length" class="admin-empty"><strong>暂无帮助文章</strong><p>通过 API 新建第一篇帮助草稿后会显示在这里。</p></div>
      <div v-else class="admin-table-scroll"><table aria-label="帮助文章列表"><thead><tr><th>标题</th><th>slug</th><th>状态</th><th>版本</th><th></th></tr></thead><tbody>
        <tr v-for="item in helpStore.adminItems" :key="item.id"><td>{{ item.workingRevision.title }}</td><td>{{ item.slug }}</td><td>{{ item.status }}</td><td>{{ item.version }}</td><td><button type="button" @click="edit(item.id)">编辑草稿</button></td></tr>
      </tbody></table></div>
    </section>
    <section v-if="selected" class="admin-list-card" aria-label="帮助草稿编辑器">
      <label>标题<input v-model="draft.title" type="text"></label><label>摘要<textarea v-model="draft.summary" rows="3" /></label><label>正文<textarea v-model="draft.body" rows="8" /></label>
      <p v-if="helpStore.adminError" role="alert">{{ helpStore.adminError.message }}</p><div><button type="button" class="button button--ghost" @click="save">保存草稿</button><button type="button" class="button" @click="publish">发布当前草稿</button></div>
    </section>
  </div>
</template>
