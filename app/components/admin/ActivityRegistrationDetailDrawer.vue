<script setup lang="ts">
import { computed } from "vue";
import type { ActivityRegistrationField } from "~/types/activity-registration";

interface RegistrationDetail {
  memberName?: string;
  studentId?: string;
  status: string;
  version: number;
  createdAt: string;
  decidedAt?: string | null;
  cancelledAt?: string | null;
  decisionReason?: string | null;
  answers: Record<string, unknown>;
  templateRevisionId: string;
}

const props = defineProps<{
  open: boolean;
  registration?: RegistrationDetail;
  fields: ActivityRegistrationField[];
  loading?: boolean;
  error?: string;
}>();
const emit = defineEmits<{ close: [] }>();
const orderedFields = computed(() => [...props.fields].sort((left, right) => left.order - right.order));
const statusLabels: Record<string, string> = { registered: "待审核", accepted: "已录取", rejected: "未录取", cancelled: "已取消" };

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "未填写";
  if (value === true) return "已确认";
  if (value === false) return "未确认";
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join("、");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function close(event?: KeyboardEvent) {
  if (event?.key === "Escape") emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="admin-drawer-backdrop" @click.self="emit('close')" @keydown="close">
      <aside class="admin-candidate-drawer activity-registration-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="activity-registration-detail-title">
        <header class="admin-drawer__header">
          <div>
            <span>REGISTRATION DETAIL</span>
            <h2 id="activity-registration-detail-title">{{ registration?.memberName || "报名详情" }}</h2>
            <p v-if="registration">{{ registration.studentId || "未提供学号" }} · {{ statusLabels[registration.status] ?? registration.status }}</p>
          </div>
          <button type="button" aria-label="关闭报名详情" @click="emit('close')">×</button>
        </header>
        <div class="admin-drawer__body">
          <p v-if="loading" role="status">正在读取报名详情…</p>
          <p v-else-if="error" role="alert">{{ error }}</p>
          <template v-else-if="registration">
            <section>
              <header><span>01</span><h3>报名身份</h3></header>
              <dl class="admin-detail-grid">
                <div><dt>姓名</dt><dd>{{ registration.memberName || "未记录" }}</dd></div>
                <div><dt>学号</dt><dd>{{ registration.studentId || "未记录" }}</dd></div>
                <div><dt>报名时间</dt><dd>{{ registration.createdAt.slice(0, 16).replace("T", " ") }}</dd></div>
                <div><dt>模板修订</dt><dd>{{ registration.templateRevisionId }}</dd></div>
              </dl>
            </section>
            <section>
              <header><span>02</span><h3>动态报名字段</h3></header>
              <dl v-if="orderedFields.length" class="activity-registration-detail-fields">
                <div v-for="field in orderedFields" :key="field.id">
                  <dt>{{ field.label }}</dt>
                  <dd>{{ formatValue(registration.answers[field.id]) }}</dd>
                </div>
              </dl>
              <p v-else class="admin-inline-note">本次报名使用空模板，没有动态字段。</p>
            </section>
            <section v-if="registration.decisionReason">
              <header><span>03</span><h3>审核备注</h3></header>
              <p>{{ registration.decisionReason }}</p>
            </section>
          </template>
        </div>
        <footer class="admin-drawer__footer"><button type="button" class="button" @click="emit('close')">关闭</button></footer>
      </aside>
    </div>
  </Teleport>
</template>
