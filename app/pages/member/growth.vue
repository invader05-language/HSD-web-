<script setup lang="ts">
import { useGrowthGateway } from '~/composables/useGrowthGateway'
import { useGrowthStore } from '~/stores/growth'

useHead({ title: '我的成长记录｜成员空间' })
const gateway = useGrowthGateway()
const store = useGrowthStore()
const form = reactive({ title: '', category: '', reflection: '', occurredOn: '' })
const editing = ref<{ id: string; version: number } | null>(null)
if (gateway) await useAsyncData('member-growth-records', () => store.refresh(gateway))

async function submit() {
  if (!gateway) return
  const saved = editing.value
    ? await store.update(gateway, editing.value.id, { expectedVersion: editing.value.version, ...form })
    : await store.create(gateway, { expectedVersion: 0, ...form })
  if (saved) resetForm()
}
function edit(item: typeof store.items[number]) { editing.value = { id: item.id, version: item.version }; Object.assign(form, { title: item.title, category: item.category, reflection: item.reflection, occurredOn: item.occurredOn }) }
function resetForm() { editing.value = null; Object.assign(form, { title: '', category: '', reflection: '', occurredOn: '' }) }
async function remove(item: typeof store.items[number]) { if (gateway) await store.remove(gateway, item.id, item.version) }
</script>

<template>
  <main class="section">
    <div class="shell">
      <p class="eyebrow">个人成长</p>
      <h1>我的成长记录</h1>
      <p>这里的内容始终仅你本人可见，管理员也不能查看。</p>
      <p v-if="store.apiLoading" role="status">正在同步成长记录…</p>
      <p v-if="store.apiError" role="alert">{{ store.apiError.message }}</p>

      <form data-testid="growth-record-form" @submit.prevent="submit">
        <label>标题<input v-model="form.title" required></label>
        <label>类别<input v-model="form.category" required></label>
        <label>发生日期<input v-model="form.occurredOn" type="date" required></label>
        <label>成长复盘<textarea v-model="form.reflection" /></label>
        <button class="button" :disabled="store.apiLoading">{{ editing ? '保存修改' : '保存记录' }}</button>
        <button v-if="editing" type="button" :disabled="store.apiLoading" @click="resetForm">取消编辑</button>
      </form>

      <div v-if="store.items.length">
        <article v-for="item in store.items" :key="item.id">
          <h2>{{ item.title }}</h2>
          <p>{{ item.category }} · {{ item.occurredOn }}</p>
          <p>{{ item.reflection }}</p>
          <button type="button" :disabled="store.apiLoading" @click="edit(item)">编辑</button>
          <button type="button" :disabled="store.apiLoading" @click="remove(item)">删除</button>
        </article>
      </div>
      <EmptyState v-else-if="!store.apiLoading && !store.apiError" title="暂无成长记录" />
    </div>
  </main>
</template>
