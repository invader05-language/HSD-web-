<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

export type OrganizationPositionAction = "ALLIANCE_OWNER" | "CENTER_MINISTER" | "PROJECT_LEAD";

export interface ProjectActionOption {
  id: string;
  title: string;
  status: string;
  lead: { personId: string; name: string; positionVersion: number } | null;
}

const props = withDefaults(defineProps<{
  open: boolean;
  action: OrganizationPositionAction;
  memberName: string;
  projects?: ProjectActionOption[];
  busy?: boolean;
  error?: string;
  projectsError?: string;
}>(), {
  projects: () => [],
  busy: false,
  error: "",
  projectsError: "",
});

const emit = defineEmits<{
  close: [];
  confirm: [{ projectId?: string }];
  retryProjects: [];
}>();

const selectedProjectId = ref("");
const dialog = ref<HTMLElement | null>(null);
const projectSelect = ref<HTMLSelectElement | null>(null);
const confirmButton = ref<HTMLButtonElement | null>(null);
let returnFocus: HTMLElement | null = null;

const actionLabel: Record<OrganizationPositionAction, string> = {
  ALLIANCE_OWNER: "联盟负责人",
  CENTER_MINISTER: "部长",
  PROJECT_LEAD: "项目负责人",
};

function focusDialog() {
  void nextTick(() => {
    if (props.action === "PROJECT_LEAD") projectSelect.value?.focus();
    else confirmButton.value?.focus();
  });
}

function openDialog() {
  if (typeof document !== "undefined") returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  selectedProjectId.value = "";
  focusDialog();
}

function closeDialog() {
  if (props.busy) return;
  emit("close");
  void nextTick(() => returnFocus?.focus());
}

function submit() {
  if (props.busy || (props.action === "PROJECT_LEAD" && !selectedProjectId.value)) return;
  emit("confirm", props.action === "PROJECT_LEAD" ? { projectId: selectedProjectId.value } : {});
}

function onKeydown(event: KeyboardEvent) {
  if (!props.open) return;
  if (event.key === "Escape" && !props.busy) {
    event.preventDefault();
    closeDialog();
    return;
  }
  if (event.key !== "Tab") return;

  const focusable = Array.from(dialog.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  ) ?? []);
  if (!focusable.length) {
    event.preventDefault();
    dialog.value?.focus();
    return;
  }

  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(() => props.open, (open) => {
  if (open) openDialog();
});

onMounted(() => {
  if (props.open) openDialog();
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div v-if="open" class="admin-modal-backdrop" @click.self="closeDialog">
    <section ref="dialog" role="dialog" aria-modal="true" aria-labelledby="organization-position-title" aria-describedby="organization-position-description" tabindex="-1">
      <h2 id="organization-position-title">任命{{ actionLabel[action] }}</h2>
      <p id="organization-position-description">确认将{{ actionLabel[action] }}授予 {{ memberName }}？任命成功后会按组织规则自动成为核心成员。</p>

      <form @submit.prevent="submit">
        <label v-if="action === 'PROJECT_LEAD'" class="admin-position-project-select">
          选择项目
          <select ref="projectSelect" v-model="selectedProjectId" :disabled="busy" required>
            <option value="">请选择项目</option>
            <option v-for="project in projects" :key="project.id" :value="project.id" :disabled="Boolean(project.lead) || project.status === 'offline'">
              {{ project.title }}{{ project.lead ? `（当前负责人：${project.lead.name}）` : project.status === "offline" ? "（已下线，不可任命）" : "" }}
            </option>
          </select>
        </label>
        <div v-if="action === 'PROJECT_LEAD' && projectsError" class="admin-position-dialog__empty" role="alert">
          <span>{{ projectsError }}</span>
          <button type="button" class="button button--ghost" :disabled="busy" @click="emit('retryProjects')">重新加载项目目录</button>
        </div>
        <p v-if="action === 'PROJECT_LEAD' && !projects.length && !projectsError" class="admin-position-dialog__empty">暂无可任命项目，请先创建或刷新项目目录。</p>
        <p v-if="error" class="member-profile-error" role="alert">{{ error }}</p>

        <div class="admin-position-dialog__actions">
          <button type="button" class="button button--ghost" :disabled="busy" @click="closeDialog">取消</button>
          <button ref="confirmButton" type="submit" class="button" :disabled="busy || (action === 'PROJECT_LEAD' && !selectedProjectId)">
            {{ busy ? "提交中…" : "确认任命" }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
