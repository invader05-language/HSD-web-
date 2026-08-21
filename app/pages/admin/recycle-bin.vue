<script setup lang="ts">
import type { RecycleItemResponseDto } from '../../../packages/api-client/src'
import { useRecycleGateway } from '~/composables/useRecycleGateway'
import { useRecycleStore } from '~/stores/recycle'
import { useSessionStore } from '~/stores/session'
definePageMeta({ layout: 'admin' })
useHead({ title: '回收站｜HSD 管理台' })
const gateway = useRecycleGateway(); const store = useRecycleStore(); const session = useSessionStore()
const isOwner = computed(() => session.currentAccount?.adminLevel === 'owner')
if (gateway) void store.refresh(gateway)
const formatDate = (value: string) => value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-'
async function restore(item: RecycleItemResponseDto) { if (gateway) await store.restore(gateway, item) }
async function purge(item: RecycleItemResponseDto) { if (!gateway || !confirm(`永久删除“${item.title}”？此操作不可恢复。`)) return; await store.hardDelete(gateway, item, true) }
</script>
<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Recycle Bin" title="回收站" description="Honor 软删除记录保留 30 天；恢复会重新验证中心和成员关系。到期不会自动允许永久删除。" />
    <p v-if="store.loading" role="status">正在加载回收记录…</p>
    <p v-else-if="store.error" role="alert">{{ store.error.message }}<small v-if="store.error.requestId"> 请求 ID：{{ store.error.requestId }}</small></p>
    <section v-else class="admin-list-card">
      <header><div><span>Recoverable Honors</span><h2>可恢复记录</h2></div><p>永久删除仅限联盟 owner 明确确认后执行</p></header>
      <p v-if="store.items.length === 0">暂无可恢复记录</p>
      <div v-else class="admin-table-scroll"><table aria-label="回收站记录"><thead><tr><th>名称</th><th>类型</th><th>中心</th><th>移除时间</th><th>保留期限</th><th>操作</th></tr></thead><tbody>
        <tr v-for="item in store.items" :key="item.id"><td><strong>{{ item.title }}</strong><small>{{ item.id }}</small></td><td>荣誉记录</td><td>{{ item.centerName }}</td><td>{{ formatDate(item.deletedAt) }}</td><td>{{ formatDate(item.retentionEndsAt) }}</td><td>
          <button type="button" :disabled="!item.restoreEligible || store.mutatingId === item.id" @click="restore(item)">恢复</button>
          <button v-if="isOwner" type="button" :disabled="store.mutatingId === item.id" @click="purge(item)">永久删除</button>
        </td></tr>
      </tbody></table></div>
    </section>
  </div>
</template>
