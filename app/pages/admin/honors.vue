<script setup lang="ts">
import { HONOR_REVIEW_RECORDS } from "~/data/admin-members";
definePageMeta({ layout: "admin" });
useHead({ title: "荣誉审核｜HSD 管理台" });
const selected = ref<(typeof HONOR_REVIEW_RECORDS)[number] | null>(null);
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Honor Review" title="荣誉审核" description="审核成员提交的比赛、证书、作品和表彰；证明材料只用于内部核验。"/>
    <section class="admin-list-card">
      <header><div><span>Review Queue</span><h2>待处理荣誉</h2></div><p>3 条待审核</p></header>
      <div class="admin-filters"><label>搜索成员或荣誉<input type="search" placeholder="姓名、奖项或作品"></label><label>荣誉类型<select><option>全部类型</option><option>比赛奖项</option><option>优秀作品</option><option>内部称号</option></select></label><label>审核状态<select><option>待审核</option><option>已通过</option><option>已退回</option></select></label><label>公开意愿<select><option>全部</option><option>选择公开</option><option>不公开</option></select></label></div>
      <div class="admin-table-scroll"><table aria-label="荣誉审核名单"><thead><tr><th>成员</th><th>荣誉名称</th><th>类型</th><th>证明材料</th><th>公开意愿</th><th>状态</th><th>提交时间</th><th><span class="sr-only">操作</span></th></tr></thead><tbody><tr v-for="item in HONOR_REVIEW_RECORDS" :key="item.id"><td><strong>{{ item.member }}</strong></td><td>{{ item.title }}</td><td>{{ item.type }}</td><td>{{ item.proof }}</td><td>{{ item.consent ? "选择公开" : "不公开" }}</td><td><AdminStatusPill :status="item.status"/></td><td>{{ item.submittedAt }}</td><td><button @click="selected = item">审核</button></td></tr></tbody></table></div>
    </section>
    <div v-if="selected" class="admin-drawer-backdrop" @click.self="selected = null"><aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="荣誉审核详情"><header class="admin-drawer__header"><div><span>Honor Review</span><h2>{{ selected.member }}</h2><p>{{ selected.type }} · {{ selected.submittedAt }}</p></div><button aria-label="关闭荣誉审核" @click="selected = null">×</button></header><div class="admin-drawer__body"><section><header><span>01</span><h3>荣誉信息</h3></header><h2>{{ selected.title }}</h2><p class="admin-inline-note">证明材料仅管理员可见，公开页面不得输出文件地址。</p></section><section><header><span>02</span><h3>审核决定</h3></header><div class="admin-form-grid"><label>审核结果<select><option>审核通过</option><option>退回补充</option></select></label><label>公开状态<select><option>{{ selected.consent ? "允许公开" : "成员未选择公开" }}</option></select></label><label class="is-wide">审核说明<textarea rows="4" placeholder="填写退回原因或内部核验说明"></textarea></label></div></section></div><footer class="admin-drawer__footer"><span>Mock 原型，不写入真实荣誉记录</span><button class="button button--ghost" @click="selected = null">取消</button><button class="button" @click="selected = null">保存审核</button></footer></aside></div>
  </div>
</template>
