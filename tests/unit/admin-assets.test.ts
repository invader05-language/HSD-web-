import { describe, expect, it } from "vitest";
import {
  ADMIN_ASSETS,
  ADMIN_UPLOAD_TASKS,
  canSelectAsset,
  filterAdminAssetsByOwnerCenter,
  filterAdminAssets,
  filterAdminUploadTasksByOwnerCenter,
  getAdminAssetSummary,
  getResourceAccessLabel
} from "../../app/data/admin-assets";

describe("administration media and resource rules", () => {
  it("only allows ready and approved assets to be selected for public use", () => {
    expect(
      canSelectAsset({ processingStatus: "ready", reviewStatus: "approved" })
    ).toBe(true);
    expect(
      canSelectAsset({ processingStatus: "processing", reviewStatus: "pending" })
    ).toBe(false);
    expect(
      canSelectAsset({ processingStatus: "ready", reviewStatus: "rejected" })
    ).toBe(false);
  });

  it("maps resource access scopes to explicit Chinese labels", () => {
    expect(getResourceAccessLabel("public")).toBe("公开访问");
    expect(getResourceAccessLabel("member")).toBe("登录成员");
    expect(getResourceAccessLabel("center")).toBe("指定中心");
  });

  it("filters assets by search, type and readiness", () => {
    expect(
      filterAdminAssets(ADMIN_ASSETS, {
        query: "招新",
        type: "图片",
        state: "可使用"
      }).map((asset) => asset.name)
    ).toEqual(["2026 招新首页主视觉"]);
  });

  it("keeps asset overview, list and upload queue inside one owner center scope", () => {
    const assets = filterAdminAssetsByOwnerCenter(ADMIN_ASSETS, "new-media");
    const tasks = filterAdminUploadTasksByOwnerCenter(ADMIN_UPLOAD_TASKS, "new-media");
    const summary = getAdminAssetSummary(assets);

    expect(assets).toHaveLength(4);
    expect(assets.every((asset) => asset.ownerCenterId === "new-media")).toBe(true);
    expect(tasks).toHaveLength(2);
    expect(tasks.every((task) => task.ownerCenterId === "new-media")).toBe(true);
    expect(summary).toMatchObject({ total: 4, imageCount: 3, videoCount: 1, processing: 1, reviewPending: 2 });
    expect(filterAdminAssetsByOwnerCenter(ADMIN_ASSETS)).toHaveLength(ADMIN_ASSETS.length);
  });
});
