<script setup lang="ts">
import {
  filterAdminRecords,
  type AdminContentRecord,
  type AdminRecordFilters
} from "~/data/admin-content";

const props = withDefaults(
  defineProps<{
    records: AdminContentRecord[];
    tableLabel: string;
    categories: string[];
    itemLabel: string;
    newLabel: string;
  }>(),
  { itemLabel: "内容", newLabel: "新建内容" }
);

const filters = reactive<AdminRecordFilters>({
  query: "",
  status: "全部状态",
  category: "全部分类"
});
const selected = ref<AdminContentRecord | null>(null);
const confirmPublish = ref(false);
const savedMessage = ref("");
const visibleRecords = computed(() =>
  filterAdminRecords(props.records, filters)
);

function openRecord(record: AdminContentRecord) {
  selected.value = { ...record };
  savedMessage.value = "";
}

function createRecord() {
  selected.value = {
    id: "mock-new",
    title: `未命名${props.itemLabel}`,
    category: props.categories[0] ?? "未分类",
    status: "草稿",
    owner: "当前管理员",
    updatedAt: "刚刚",
    summary: "请在此填写对外展示的内容摘要。"
  };
  savedMessage.value = "";
}

function closeDrawer() {
  selected.value = null;
  confirmPublish.value = false;
}
</script>

<template>
  <section class="admin-list-card admin-record-workspace">
    <header>
      <div>
        <span>Record Workspace</span>
        <h2>{{ tableLabel }}</h2>
      </div>
      <p>共 {{ visibleRecords.length }} 条 · 当前均为 Mock 演示数据</p>
    </header>

    <div class="admin-filters">
      <label>
        搜索{{ itemLabel }}
        <input v-model="filters.query" type="search" :placeholder="`标题、摘要或负责人`">
      </label>
      <label>
        发布状态
        <select v-model="filters.status">
          <option>全部状态</option>
          <option>草稿</option>
          <option>待审核</option>
          <option>已发布</option>
          <option>已下架</option>
        </select>
      </label>
      <label>
        内容分类
        <select v-model="filters.category">
          <option>全部分类</option>
          <option v-for="category in categories" :key="category">{{ category }}</option>
        </select>
      </label>
      <div class="admin-filter-action">
        <button type="button" class="button" @click="createRecord">{{ newLabel }}</button>
      </div>
    </div>

    <div v-if="visibleRecords.length" class="admin-table-scroll">
      <table :aria-label="tableLabel">
        <thead>
          <tr>
            <th>标题 / 摘要</th>
            <th>分类</th>
            <th>状态</th>
            <th>负责人</th>
            <th>推荐位</th>
            <th>更新时间</th>
            <th><span class="sr-only">操作</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in visibleRecords" :key="record.id">
            <td><strong>{{ record.title }}</strong><small>{{ record.summary }}</small></td>
            <td>{{ record.category }}</td>
            <td><AdminStatusPill :status="record.status" /></td>
            <td>{{ record.owner }}</td>
            <td>{{ record.recommendation || "未推荐" }}</td>
            <td>{{ record.updatedAt }}</td>
            <td><button type="button" @click="openRecord(record)">查看 / 编辑</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="admin-empty">
      <strong>没有匹配的{{ itemLabel }}</strong>
      <p>调整关键词或筛选条件后再试。</p>
    </div>

    <Teleport to="body">
      <div v-if="selected" class="admin-drawer-backdrop" @click.self="closeDrawer">
        <aside class="admin-candidate-drawer" :aria-label="`${itemLabel}编辑器`">
          <header class="admin-drawer__header">
            <div><span>EDITOR / PREVIEW</span><h2>{{ selected.title }}</h2><p>保存与发布为两种独立状态</p></div>
            <button type="button" aria-label="关闭编辑器" @click="closeDrawer">×</button>
          </header>
          <div class="admin-drawer__body">
            <section>
              <header><span>01</span><h3>基本信息</h3></header>
              <div class="admin-editor-grid">
                <label>标题<input v-model="selected.title" type="text"></label>
                <label>分类<select v-model="selected.category"><option v-for="category in categories" :key="category">{{ category }}</option></select></label>
                <label class="is-wide">内容摘要<textarea v-model="selected.summary" rows="4" /></label>
              </div>
            </section>
            <section>
              <header><span>02</span><h3>对外预览</h3></header>
              <article class="admin-inline-preview">
                <span>{{ selected.category }}</span>
                <h3>{{ selected.title }}</h3>
                <p>{{ selected.summary }}</p>
                <small>实际图片、正文与接口尚未接入</small>
              </article>
            </section>
            <section>
              <header><span>03</span><h3>发布设置</h3></header>
              <p class="admin-inline-note">当前状态：{{ selected.status }}。发布前需要经过内容审核，不能从草稿直接跳过审核。</p>
              <label>首页推荐位<select><option>不推荐到首页</option><option>加入对应首页模块</option></select></label>
            </section>
          </div>
          <footer class="admin-drawer__footer">
            <span>{{ savedMessage || "所有修改仅保留在当前前端会话" }}</span>
            <button type="button" class="button button--ghost" @click="savedMessage = '草稿已在当前会话保存'">保存草稿</button>
            <button type="button" class="button" @click="confirmPublish = true">提交审核 / 发布</button>
          </footer>
          <div v-if="confirmPublish" class="admin-confirm-backdrop">
            <section>
              <span>Publish Confirmation</span>
              <h3>确认提交内容状态？</h3>
              <p>发布后将影响官网列表、详情页及已选择的首页推荐位。后端接入后需再次校验权限与内容版本。</p>
              <dl><div><dt>当前内容</dt><dd>{{ selected.title }}</dd></div><div><dt>目标状态</dt><dd>{{ selected.status === "待审核" ? "已发布" : "待审核" }}</dd></div></dl>
              <div>
                <button type="button" class="button button--ghost" @click="confirmPublish = false">返回检查</button>
                <button type="button" class="button" @click="selected.status = selected.status === '待审核' ? '已发布' : '待审核'; confirmPublish = false; savedMessage = '状态已在当前会话更新'">确认更新</button>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </Teleport>
  </section>
</template>
