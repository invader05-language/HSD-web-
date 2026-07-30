<script setup lang="ts">
import { ADMIN_RESOURCES, getResourceAccessLabel } from "~/data/admin-assets";

definePageMeta({ layout: "admin" });
useHead({ title: "学习资料｜HSD 管理台" });
const selected = ref<(typeof ADMIN_RESOURCES)[number] | null>(null);
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Learning Resources" title="学习资料" description="维护站内资料详情、文件版本、访问范围与发布设置；列表点击先进入站内详情，下载是明确的后续动作。">
      <template #actions><button type="button" class="button">上传学习资料</button></template>
    </AdminPageHeading>
    <section class="admin-summary-strip" aria-label="资料概览">
      <div><span>全部资料</span><strong>36</strong><small>PDF · DOCX · 外部链接</small></div>
      <div><span>公开资料</span><strong>14</strong><small>无需登录即可查看详情</small></div>
      <div><span>成员资料</span><strong>18</strong><small>登录后获取文件动作</small></div>
      <div><span>待审核</span><strong>04</strong><small>文件与公开范围检查</small></div>
    </section>
    <section class="admin-list-card">
      <header><div><span>Resource Management</span><h2>学习资料管理列表</h2></div><p>真实文件服务尚未接入</p></header>
      <div class="admin-filters"><label>搜索资料<input type="search" placeholder="标题、分类或负责人"></label><label>访问范围<select><option>全部范围</option><option>公开访问</option><option>登录成员</option><option>指定中心</option></select></label><label>发布状态<select><option>全部状态</option><option>草稿</option><option>待审核</option><option>已发布</option></select></label></div>
      <div class="admin-table-scroll"><table aria-label="学习资料管理列表"><thead><tr><th>资料</th><th>分类</th><th>格式</th><th>访问范围</th><th>状态</th><th>下载记录</th><th>更新时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="resource in ADMIN_RESOURCES" :key="resource.id"><td><strong>{{ resource.title }}</strong><small>{{ resource.description }}</small></td><td>{{ resource.category }}</td><td>{{ resource.format }}</td><td>{{ getResourceAccessLabel(resource.access) }}</td><td><AdminStatusPill :status="resource.status" /></td><td>{{ resource.downloads }}</td><td>{{ resource.updatedAt }}</td><td><button type="button" :aria-label="`编辑资源 ${resource.title}`" @click="selected = resource">查看 / 编辑</button></td></tr></tbody></table></div>
    </section>
    <Teleport to="body">
      <div v-if="selected" class="admin-drawer-backdrop" @click.self="selected = null">
        <aside class="admin-candidate-drawer" aria-label="学习资料编辑器">
          <header class="admin-drawer__header"><div><span>RESOURCE EDITOR</span><h2>{{ selected.title }}</h2><p>{{ selected.format }} · {{ getResourceAccessLabel(selected.access) }}</p></div><button type="button" aria-label="关闭资源编辑器" @click="selected = null">×</button></header>
          <div class="admin-drawer__body">
            <section><header><span>01</span><h3>基本信息</h3></header><div class="admin-editor-grid"><label>标题<input v-model="selected.title" type="text"></label><label>分类<input v-model="selected.category" type="text"></label><label class="is-wide">资料说明<textarea v-model="selected.description" rows="4"></textarea></label></div></section>
            <section><header><span>02</span><h3>文件与版本历史</h3></header><div class="admin-version-list"><article v-for="version in selected.versions" :key="version.version"><span>{{ version.version }}</span><div><strong>{{ version.fileName }}</strong><small>{{ version.size }} · {{ version.uploadedAt }} · {{ version.owner }}</small></div><AdminStatusPill :status="version.state" /></article></div><button type="button" class="admin-secondary-action">上传新版本</button></section>
            <section><header><span>03</span><h3>访问与发布</h3></header><div class="admin-editor-grid"><label>访问范围<select v-model="selected.access"><option value="public">公开访问</option><option value="member">登录成员</option><option value="center">指定中心</option></select></label><label>发布状态<select v-model="selected.status"><option>草稿</option><option>待审核</option><option>已发布</option></select></label></div><p class="admin-inline-note">病毒扫描与 Office 转换将在后端接入；PDF 在线预览、临时签名下载地址和访问日志也属于文件服务范围。</p></section>
          </div>
          <footer class="admin-drawer__footer"><span>本页仅维护前端 Mock 数据</span><button type="button" class="button button--ghost">预览站内详情</button><button type="button" class="button">保存资源</button></footer>
        </aside>
      </div>
    </Teleport>
  </div>
</template>
