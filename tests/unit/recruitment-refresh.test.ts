import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { useRecruitmentRefresh } from "../../app/composables/useRecruitmentRefresh";

describe("useRecruitmentRefresh", () => {
  afterEach(() => vi.useRealTimers());

  it("loads on mount, refreshes at the interval and clears the timer on unmount", async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => {});
    const wrapper = mount(defineComponent({
      setup() { return useRecruitmentRefresh(load, { intervalMs: 15_000 }); },
      template: "<div />",
    }));
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15_000);
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(load).toHaveBeenCalledTimes(2);
    await nextTick();
  });

  it("merges focus and visibility refreshes and retains the last success on failure", async () => {
    vi.useFakeTimers();
    let rejectNext = false;
    const load = vi.fn(async () => {
      if (rejectNext) throw new Error("offline");
    });
    let state!: ReturnType<typeof useRecruitmentRefresh>;
    const wrapper = mount(defineComponent({
      setup() { state = useRecruitmentRefresh(load); return () => null; },
    }));
    await flushPromises();
    const successfulTime = state.lastUpdatedAt.value;
    expect(successfulTime).toBeInstanceOf(Date);
    rejectNext = true;
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(2);
    expect(state.refreshError.value).toBe("offline");
    expect(state.lastUpdatedAt.value).toEqual(successfulTime);
    wrapper.unmount();
  });
});
