<script setup lang="ts">
import type { AdminHonorResponseDto } from '../../../packages/api-client/src'
import { useHonorsGateway } from '~/composables/useHonorsGateway'
import { useHonorsStore } from '~/stores/honors'

definePageMeta({ layout: 'admin' })
useHead({ title: '荣誉审核｜HSD 管理台' })
const honorsStore = useHonorsStore()
const gateway = useHonorsGateway()
const selected = ref<AdminHonorResponseDto | null>(null)
if (gateway) await useAsyncData('admin-honors', () => honorsStore.refresh(gateway))

async function approveSelected() {
  if (!gateway || !selected.value) return
  const updated = await honorsStore.approve(gateway, selected.value.id, selected.value.version)
  if (updated) selected.value = updated
}
async function recycleSelected() {
  if (!gateway || !selected.value || !confirm(`将“${selected.value.title}”移入回收站？`)) return
  if (await honorsStore.softDelete(gateway, selected.value.id, selected.value.publicId, selected.value.version, true)) selected.value = null
}
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Honor Review" title="荣誉审核" description="管理员核验证明材料；只有审核通过且成员当前同意公开的荣誉才进入公开成员资料。" />
    <p v-if="honorsStore.apiLoading" role="status">正在加载荣誉审核队列…</p>
    <p v-else-if="honorsStore.apiError" role="alert">{{ honorsStore.apiError.message }}（{{ honorsStore.apiError.code }}）</p>
    <section v-else class="admin-list-card">
      <header><div><span>Review Queue</span><h2>荣誉记录</h2></div><p>{{ honorsStore.items.length }} 条</p></header>
      <div v-if="honorsStore.items.length" class="admin-table-scroll">
        <table aria-label="荣誉审核名单"><thead><tr><th>成员</th><th>荣誉名称</th><th>类型</th><th>证明材料</th><th>公开意愿</th><th>状态</th><th>提交时间</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody><tr v-for="item in honorsStore.items" :key="item.id"><td><strong>{{ item.memberName }}</strong></td><td>{{ item.title }}</td><td>{{ item.type }}</td><td>{{ item.proofReference || '未提供' }}</td><td>{{ item.publicConsent ? '选择公开' : '不公开' }}</td><td><AdminStatusPill :status="item.status" /></td><td>{{ item.submittedAt.slice(0, 10) }}</td><td><button type="button" @click="selected = item">审核</button></td></tr></tbody>
        </table>
      </div>
      <EmptyState v-else />
    </section>
    <div v-if="selected" class="admin-drawer-backdrop" @click.self="selected = null"><aside class="admin-candidate-drawer" role="dialog" aria-modal="true" aria-label="荣誉审核详情"><header class="admin-drawer__header"><div><span>Honor Review</span><h2>{{ selected.memberName }}</h2><p>{{ selected.type }} · {{ selected.awardedAt }}</p></div><button type="button" aria-label="关闭荣誉审核" @click="selected = null">×</button></header><div class="admin-drawer__body"><section><header><span>01</span><h3>荣誉信息</h3></header><h2>{{ selected.title }}</h2><p>{{ selected.description }}</p><p class="admin-inline-note">证明材料仅管理员可见；公开成员页面只展示去标识的已发布信息，不提供排名。</p></section></div><footer class="admin-drawer__footer"><span>{{ selected.publicConsent ? '成员同意公开' : '成员未同意公开' }}</span><button type="button" class="button button--ghost" @click="selected = null">关闭</button><button type="button" class="button button--ghost" :disabled="honorsStore.apiLoading" @click="recycleSelected">移入回收站</button><button v-if="selected.status === 'pending'" type="button" class="button" :disabled="honorsStore.apiLoading" @click="approveSelected">审核通过</button></footer></aside></div>
  </div>
</template>
