<script setup lang="ts">
import { RECRUITMENT_BATCHES } from "~/data/recruitment-admin";

definePageMeta({ layout: "admin" });
useHead({ title: "招新批次｜HSD 管理台" });

const showCreate = ref(false);
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading
      eyebrow="Recruitment Cycles"
      title="招新批次"
      description="统一管理报名时间、开放中心、负责人和批次状态；关闭后的历史批次继续保留只读记录。"
    >
      <template #actions>
        <button type="button" class="button" @click="showCreate = true">新建招新批次</button>
      </template>
    </AdminPageHeading>

    <section class="admin-summary-strip" aria-label="批次概览">
      <div><span>当前批次</span><strong>01</strong><small>正在进行</small></div>
      <div><span>报名人数</span><strong>80</strong><small>2026 秋季招新</small></div>
      <div><span>开放中心</span><strong>04</strong><small>全部中心</small></div>
      <div><span>待配置</span><strong>01</strong><small>草稿批次</small></div>
    </section>

    <section class="admin-list-card">
      <header>
        <div><span>Recruitment Batch List</span><h2>全部招新批次</h2></div>
        <p>Mock 数据 · 共 {{ RECRUITMENT_BATCHES.length }} 个批次</p>
      </header>
      <div class="admin-batch-list">
        <article v-for="batch in RECRUITMENT_BATCHES" :key="batch.id">
          <div class="admin-batch-list__index">{{ batch.id === "2026-autumn" ? "CURRENT" : batch.id.slice(0, 4) }}</div>
          <div>
            <AdminStatusPill :status="batch.status" />
            <h3>{{ batch.name }}</h3>
            <p>{{ batch.period }}</p>
          </div>
          <dl>
            <div><dt>开放中心</dt><dd>{{ batch.centers }} 个</dd></div>
            <div><dt>报名人数</dt><dd>{{ batch.applicants }} 人</dd></div>
            <div><dt>负责人</dt><dd>{{ batch.owner }}</dd></div>
          </dl>
          <button type="button">{{ batch.status === "已结束" ? "查看归档" : "配置批次" }} →</button>
        </article>
      </div>
    </section>

    <div v-if="showCreate" class="admin-drawer-backdrop" @click.self="showCreate = false">
      <aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="新建招新批次">
        <header class="admin-drawer__header">
          <div><span>New Recruitment Cycle</span><h2>新建招新批次</h2><p>当前仅展示字段结构，不写入数据库</p></div>
          <button type="button" aria-label="关闭新建批次" @click="showCreate = false">×</button>
        </header>
        <div class="admin-drawer__body">
          <section>
            <header><span>01</span><h3>批次信息</h3></header>
            <div class="admin-form-grid">
              <label>批次名称<input value="2027 春季补招"></label>
              <label>负责人<select><option>联盟总负责人</option><option>人才发展中心负责人</option></select></label>
              <label>报名开始时间<input type="date" value="2027-02-20"></label>
              <label>报名截止时间<input type="date" value="2027-03-08"></label>
            </div>
          </section>
          <section>
            <header><span>02</span><h3>开放中心</h3></header>
            <div class="admin-check-grid">
              <label><input type="checkbox" checked> 白泽开发中心</label>
              <label><input type="checkbox" checked> 新媒体中心</label>
              <label><input type="checkbox" checked> 拓维策划中心</label>
              <label><input type="checkbox" checked> 人才发展中心</label>
            </div>
          </section>
          <section class="admin-inline-note">
            保存后只会形成草稿，批次公开前仍需完成报名表和负责人配置。
          </section>
        </div>
        <footer class="admin-drawer__footer">
          <span>Mock 原型，不创建真实批次</span>
          <button type="button" class="button button--ghost" @click="showCreate = false">取消</button>
          <button type="button" class="button" @click="showCreate = false">保存草稿</button>
        </footer>
      </aside>
    </div>
  </div>
</template>
