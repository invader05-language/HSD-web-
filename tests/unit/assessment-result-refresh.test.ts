import { describe, it, expect, vi } from 'vitest';
import { createResultRefresh } from '../../app/utils/assessment-result-refresh';

describe('private result refresh', () => {
  it('stops on 401 and never overlaps a request', async () => {
    vi.useFakeTimers();
    const load = vi.fn().mockRejectedValue({ status: 401 });
    const unauthorized = vi.fn();
    const refresh = createResultRefresh(load, { unauthorized, visible: () => true });
    refresh.start();
    await vi.advanceTimersByTimeAsync(180_000);
    expect(load).toHaveBeenCalledTimes(1);
    expect(unauthorized).toHaveBeenCalledTimes(1);
    refresh.stop(); vi.useRealTimers();
  });
  it('pauses when hidden and backs off after errors', async () => {
    vi.useFakeTimers(); let visible = true;
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const refresh = createResultRefresh(load, { unauthorized: vi.fn(), visible: () => visible });
    refresh.start(); await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(29_999); expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(load).toHaveBeenCalledTimes(2);
    visible = false; refresh.visibilityChanged();
    await vi.advanceTimersByTimeAsync(60_000); expect(load).toHaveBeenCalledTimes(2);
    visible = true; refresh.visibilityChanged(); await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(3);
    refresh.stop(); vi.useRealTimers();
  });
});
