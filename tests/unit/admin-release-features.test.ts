import { describe, expect, it } from "vitest";
import { RELEASE_FEATURES } from "../../app/config/release-features";
import { getAdminNavigationForAccess } from "../../app/data/admin-platform";
import {
  createReleaseNoticeState,
  resolveDisabledAdminRoute
} from "../../app/utils/admin-release-access";

describe("admin release feature availability", () => {
  it("redirects disabled admin modules to their approved fallback routes", () => {
    expect(resolveDisabledAdminRoute("/admin/logs", RELEASE_FEATURES)).toEqual({
      to: "/admin",
      notice: "当前版本暂未开放"
    });
    expect(resolveDisabledAdminRoute("/admin/uploads", RELEASE_FEATURES)).toEqual({
      to: "/admin/media",
      notice: "当前版本暂未开放"
    });
    expect(resolveDisabledAdminRoute("/admin/recycle-bin", RELEASE_FEATURES)).toEqual({
      to: "/admin",
      notice: "当前版本暂未开放"
    });
  });

  it("accepts a new notice after the admin layout has already mounted", () => {
    const state = createReleaseNoticeState();
    expect(state.notice.value).toBeUndefined();
    expect(state.receive("当前版本暂未开放")).toBe(true);
    expect(state.notice.value).toBe("当前版本暂未开放");
    expect(state.receive(undefined)).toBe(false);
    expect(state.notice.value).toBeUndefined();
  });

  it("keeps the recruitment batches route available", () => {
    expect(
      resolveDisabledAdminRoute("/admin/recruitment/batches", RELEASE_FEATURES)
    ).toBeUndefined();
  });

  it("removes disabled items while retaining owner-only account access", () => {
    const ids = getAdminNavigationForAccess(
      { canManageAdminAccounts: true },
      RELEASE_FEATURES
    ).flatMap((group) => group.items.map((item) => item.id));

    expect(ids).not.toEqual(expect.arrayContaining(["logs", "recycle-bin", "uploads"]));
    expect(ids).toContain("batches");
    expect(ids).toContain("accounts");
  });
});
