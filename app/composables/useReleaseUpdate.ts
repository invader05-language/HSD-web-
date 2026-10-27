interface ReleaseRuntimeConfig {
  app?: { buildId?: string };
}

interface ReleaseMetadata {
  id?: unknown;
  timestamp?: unknown;
}

export function useReleaseUpdate() {
  const runtime = useRuntimeConfig() as ReleaseRuntimeConfig;
  const currentBuildId = String(runtime.app?.buildId ?? "");
  const updateAvailable = ref(false);
  const checking = ref(false);
  let lastCheckedAt = 0;
  let removeListeners = () => {};

  async function checkForUpdate(force = false): Promise<void> {
    if (import.meta.server || checking.value) return;
    const now = Date.now();
    if (!force && now - lastCheckedAt < 60_000) return;
    lastCheckedAt = now;
    checking.value = true;
    try {
      const response = await fetch("/_nuxt/builds/latest.json", {
        cache: "no-store",
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      const metadata = await response.json() as ReleaseMetadata;
      if (typeof metadata.id === "string" && metadata.id && currentBuildId && metadata.id !== currentBuildId) {
        updateAvailable.value = true;
      }
    } catch {
      // A version check is advisory and cannot block the application.
    } finally {
      checking.value = false;
    }
  }

  function refreshToCurrentRelease(): void {
    const target = new URL(window.location.href);
    target.searchParams.set("__hsd_release_refresh", currentBuildId || String(Date.now()));
    window.location.assign(target.toString());
  }

  onMounted(() => {
    const cleanRefreshMarker = () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("__hsd_release_refresh")) return;
      url.searchParams.delete("__hsd_release_refresh");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    };
    const onPageShow = () => { void checkForUpdate(true); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    cleanRefreshMarker();
    void checkForUpdate(true);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    removeListeners = () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  });
  onUnmounted(() => removeListeners());

  return { currentBuildId, updateAvailable, checking, checkForUpdate, refreshToCurrentRelease };
}
