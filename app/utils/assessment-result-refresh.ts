/** One private request at a time; callers clear their projection on expired sessions. */
export function createResultRefresh(load: () => Promise<unknown>, options: {
  unauthorized: () => void;
  visible: () => boolean;
}) {
  let stopped = true, running = false, failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const schedule = (delay: number) => {
    clear();
    if (!stopped && options.visible()) timer = setTimeout(() => { void tick(); }, delay);
  };
  async function tick() {
    if (stopped || running || !options.visible()) return;
    running = true;
    try { await load(); failures = 0; }
    catch (error) {
      if ((error as { status?: number })?.status === 401) {
        stopped = true; clear(); options.unauthorized(); return;
      }
      failures++;
    } finally { running = false; }
    schedule(failures ? Math.min(120_000, 30_000 * 2 ** (failures - 1)) : 15_000);
  }
  return {
    start() { stopped = false; schedule(0); },
    stop() { stopped = true; clear(); },
    visibilityChanged() { clear(); if (!stopped && options.visible() && !running) schedule(0); },
  };
}
