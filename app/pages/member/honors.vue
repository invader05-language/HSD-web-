<script setup lang="ts">
import { useHonorsGateway } from '~/composables/useHonorsGateway'
import { useMemberHonorsStore } from '~/stores/member-honors'
useHead({ title: '我的荣誉｜成员空间' })
const gateway = useHonorsGateway(); const store = useMemberHonorsStore()
const form = reactive({ title: '', type: '', description: '', awardedAt: '', proofReference: '' })
if (gateway) await useAsyncData('member-honors', () => store.refresh(gateway))
async function submit() { if (!gateway) return; const created = await store.submit(gateway, { expectedVersion: 0, ...form, publicConsent: false }); if (created) Object.assign(form, { title: '', type: '', description: '', awardedAt: '', proofReference: '' }) }
async function consent(item: typeof store.items[number], value: boolean) { if (gateway) await store.updateConsent(gateway, item.id, item.version, value) }
</script>
<template><main class="section"><div class="shell"><h1>我的荣誉</h1><p v-if="store.apiLoading" role="status">正在同步荣誉…</p><p v-if="store.apiError" role="alert">{{ store.apiError.message }}</p>
  <form data-testid="member-honor-form" @submit.prevent="submit"><label>荣誉名称<input v-model="form.title" required></label><label>类型<input v-model="form.type" required></label><label>获奖日期<input v-model="form.awardedAt" type="date" required></label><label>说明<textarea v-model="form.description" /></label><label>证明材料引用<input v-model="form.proofReference"></label><button class="button" :disabled="store.apiLoading">提交荣誉</button></form>
  <div v-if="store.items.length"><article v-for="item in store.items" :key="item.id"><h2>{{ item.title }}</h2><p>{{ item.status }} · {{ item.awardedDateLabel }}</p><label v-if="item.status === 'approved'"><input :checked="item.publicConsent" type="checkbox" @change="consent(item, ($event.target as HTMLInputElement).checked)">同意公开（可随时撤回）</label><p v-else>审核通过后可设置公开同意。</p></article></div><EmptyState v-else title="暂无荣誉记录" /></div></main></template>
