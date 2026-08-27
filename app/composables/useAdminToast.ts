import { ref } from "vue";

export type AdminToastKind = "success" | "warning" | "error";

export interface AdminToast {
  id: number;
  kind: AdminToastKind;
  message: string;
}

const toast = ref<AdminToast | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;

const durations: Record<AdminToastKind, number> = { success: 3000, warning: 4000, error: 6000 };

function dismiss(): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
  toast.value = null;
}

function show(message: string, kind: AdminToastKind = "success", duration = durations[kind]): void {
  if (!message.trim()) return;
  dismiss();
  const id = ++sequence;
  toast.value = { id, kind, message };
  timer = setTimeout(() => {
    if (toast.value?.id === id) dismiss();
  }, duration);
}

export function useAdminToast() {
  return {
    toast,
    show,
    dismiss,
    success: (message: string, duration?: number) => show(message, "success", duration),
    warning: (message: string, duration?: number) => show(message, "warning", duration),
    error: (message: string, duration?: number) => show(message, "error", duration),
  };
}
