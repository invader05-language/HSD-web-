import { afterEach, describe, expect, it, vi } from "vitest";
import { useAdminToast } from "../../app/composables/useAdminToast";

describe("admin toast", () => {
  afterEach(() => {
    vi.useRealTimers();
    useAdminToast().dismiss();
  });

  it("replaces the previous message and expires the replacement on its own timer", () => {
    vi.useFakeTimers();
    const toast = useAdminToast();

    toast.success("旧提示");
    toast.warning("新提示");
    expect(toast.toast.value).toMatchObject({ kind: "warning", message: "新提示" });

    vi.advanceTimersByTime(3999);
    expect(toast.toast.value?.message).toBe("新提示");
    vi.advanceTimersByTime(1);
    expect(toast.toast.value).toBeNull();
  });
});
