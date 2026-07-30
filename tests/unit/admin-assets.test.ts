import { describe, expect, it } from "vitest";
import {
  ADMIN_ASSETS,
  canSelectAsset,
  filterAdminAssets,
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
});
