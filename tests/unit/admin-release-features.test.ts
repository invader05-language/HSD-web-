import { describe, expect, it } from "vitest";
import { RELEASE_FEATURES } from "../../app/config/release-features";
import { getAdminNavigationForAccess } from "../../app/data/admin-platform";
import {
  createReleaseNoticeState,
  RETIRED_MEDIA_LIBRARY_NOTICE,
  resolveDisabledRoute
} from "../../app/utils/admin-release-access";

describe("admin release feature availability", () => {
  it("redirects disabled modules while leaving completed Recycle and upload tasks available", () => {
    expect(resolveDisabledRoute("/admin/logs", RELEASE_FEATURES)).toBeUndefined();
    expect(resolveDisabledRoute("/admin/media", RELEASE_FEATURES)).toEqual({ to: "/admin", notice: RETIRED_MEDIA_LIBRARY_NOTICE });
    expect(resolveDisabledRoute("/admin/uploads", RELEASE_FEATURES)).toBeUndefined();
    expect(resolveDisabledRoute("/admin/recycle-bin", RELEASE_FEATURES)).toBeUndefined();
  });

  it("accepts a new notice after the admin layout has already mounted", () => {
    const state = createReleaseNoticeState();
    expect(state.notice.value).toBeUndefined();
    expect(state.receive("当前版本暂未开放")).toBe(true);
    expect(state.notice.value).toBe("当前版本暂未开放");
    expect(state.receive(undefined)).toBe(false);
    expect(state.notice.value).toBeUndefined();
  });

  it("explains that the retired media library has moved to content editors", () => {
    const state = createReleaseNoticeState();
    expect(state.receive(RETIRED_MEDIA_LIBRARY_NOTICE)).toBe(true);
    expect(state.notice.value).toBe(RETIRED_MEDIA_LIBRARY_NOTICE);
  });

  it("rejects arbitrary query text instead of presenting it as a system notice", () => {
    const state = createReleaseNoticeState();
    expect(state.receive("账号异常，请立即重新登录")).toBe(false);
    expect(state.notice.value).toBeUndefined();
  });

  it("keeps the recruitment batches route available", () => {
    expect(resolveDisabledRoute("/admin/recruitment/batches", RELEASE_FEATURES)).toBeUndefined();
  });

  it("enables Help Center routes and owner navigation after the production API is complete", () => {
    expect(RELEASE_FEATURES.helpCenter).toBe(true);
    expect(resolveDisabledRoute("/help", RELEASE_FEATURES)).toBeUndefined();
    expect(resolveDisabledRoute("/admin/content/help", RELEASE_FEATURES)).toBeUndefined();
    expect(resolveDisabledRoute("/help-center", RELEASE_FEATURES)).toBeUndefined();
    const ids = getAdminNavigationForAccess({ canManageAdminAccounts: true }, RELEASE_FEATURES).flatMap((group) => group.items.map((item) => item.id));
    expect(ids).toContain("help");
    const adminIds = getAdminNavigationForAccess({ canManageAdminAccounts: false, canConfigurePortal: false }, RELEASE_FEATURES).flatMap((group) => group.items.map((item) => item.id));
    expect(adminIds).not.toContain("help");
  });

  it("enables Recycle and the completed read-only upload queue without unrelated unfinished modules", () => {
    const ids = getAdminNavigationForAccess({ canManageAdminAccounts: true }, RELEASE_FEATURES).flatMap((group) => group.items.map((item) => item.id));
    expect(ids).toContain("logs");
    expect(ids).toContain("uploads");
    expect(ids).toContain("recycle-bin");
    expect(ids).toContain("batches");
    expect(ids).toContain("accounts");
    expect(RELEASE_FEATURES.auditLog).toBe(true);
    expect(RELEASE_FEATURES.uploadTasks).toBe(true);
  });
});
