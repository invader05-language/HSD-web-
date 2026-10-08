import { onBeforeUnmount, onMounted, readonly, ref } from "vue";

export interface RecruitmentRefreshOptions {
  intervalMs?: number;
}

export function useRecruitmentRefresh(load: () => Promise<void>, options: RecruitmentRefreshOptions = {}) {
  const intervalMs = options.intervalMs ?? 15_000;
  const refreshing = ref(false);
  const lastUpdatedAt = ref<Date>();
  const refreshError = ref("");
  let mounted = false;
  let queued = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = undefined;
  }

  function schedule(delay: number) {
    clearTimer();
    if (!mounted || typeof document === "undefined" || document.visibilityState === "hidden") return;
    timer = setTimeout(() => void refresh(), delay);
  }

  async function refresh(): Promise<void> {
    if (refreshing.value) {
      queued = true;
      return;
    }
    refreshing.value = true;
    refreshError.value = "";
    try {
      await load();
      lastUpdatedAt.value = new Date();
      failures = 0;
    } catch (error) {
      failures += 1;
      refreshError.value = error instanceof Error ? error.message : "数据读取失败，请重试。";
    } finally {
      refreshing.value = false;
      const runQueued = queued;
      queued = false;
      schedule(runQueued ? 0 : Math.min(intervalMs * 2 ** Math.max(0, failures - 1), 60_000));
      if (runQueued) setTimeout(() => void refresh(), 0);
    }
  }

  function onVisible() {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    clearTimer();
    void refresh();
  }

  onMounted(() => {
    mounted = true;
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    void refresh();
  });

  onBeforeUnmount(() => {
    mounted = false;
    clearTimer();
    window.removeEventListener("focus", onVisible);
    document.removeEventListener("visibilitychange", onVisible);
  });

  return { refresh, refreshing: readonly(refreshing), lastUpdatedAt: readonly(lastUpdatedAt), refreshError: readonly(refreshError) };
}
