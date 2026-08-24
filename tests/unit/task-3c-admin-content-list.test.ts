import { describe, expect, it, vi } from "vitest";
import type { AdminContentListResponseDto } from "../../packages/api-client/src";
import { ContentApiError } from "../../app/services/content/api-content.gateway";
import {
  createAdminContentListController,
  mapAdminContentSummary,
} from "../../app/services/content/admin-content-list";

const apiResponse: AdminContentListResponseDto = {
  page: 2,
  pageSize: 20,
  total: 41,
  items: [{
    id: "content-api-only",
    publicId: "public-api-only",
    centerId: null,
    slug: "api-only-news",
    kind: "article",
    status: "pending_publication",
    version: 3,
    workingRevisionNumber: 2,
    title: "API 专属内容",
    summary: "只应从服务端列表获得。",
    createdBy: { type: "account", accountId: "account-api", username: "api-owner", displayName: "接口创建人" },
    createdAt: "2026-08-23T00:00:00.000Z",
    updatedAt: "2026-08-23T01:00:00.000Z",
    publishedAt: null,
    offlineAt: null,
  }],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("Task 3C-A real admin content list", () => {
  it("maps the canonical API enum instead of the retired Mock content states", () => {
    // This catches an accidental mapping of `pending_publication` to the old Mock `in-review` state.
    expect(mapAdminContentSummary(apiResponse.items[0]!)).toEqual({
      id: "content-api-only",
      title: "API 专属内容",
      summary: "只应从服务端列表获得。",
      category: "新闻动态",
      status: "待发布",
      owner: "接口创建人",
      updatedAt: "2026-08-23T01:00:00.000Z",
    });
  });

  it("clears prior rows and renders only the server page for a changed filter query", async () => {
    // This catches a browser-side fixture fallback or stale rows surviving a new API request.
    const nextPage = deferred<AdminContentListResponseDto>();
    const list = vi.fn()
      .mockResolvedValueOnce({ ...apiResponse, page: 1, items: [{ ...apiResponse.items[0], title: "第一页 API 内容" }] })
      .mockReturnValueOnce(nextPage.promise);
    const controller = createAdminContentListController({ list });

    await controller.load();
    controller.setFilters({ q: "仅服务端", status: "review", kind: "article", centerId: "center-owner" });
    const loading = controller.load();

    expect(controller.records.value).toEqual([]);
    expect(controller.loading.value).toBe(true);
    expect(list).toHaveBeenLastCalledWith("page=1&pageSize=20&q=%E4%BB%85%E6%9C%8D%E5%8A%A1%E7%AB%AF&status=review&kind=article&centerId=center-owner");

    nextPage.resolve(apiResponse);
    await loading;

    expect(controller.records.value.map((record) => record.title)).toEqual(["API 专属内容"]);
    expect(controller.total.value).toBe(41);
    expect(controller.status.value).toBe("success");
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [503, "error"],
  ] as const)("reports API %s without keeping a successful local page", async (httpStatus, state) => {
    // This catches silently substituting portal-content/localStorage when the live API rejects access.
    const controller = createAdminContentListController({
      list: vi.fn()
        .mockResolvedValueOnce(apiResponse)
        .mockRejectedValueOnce(new ContentApiError(httpStatus, "CONTENT_LIST_FAILED", "live list rejected")),
    });
    await controller.load();

    await controller.load();

    expect(controller.records.value).toEqual([]);
    expect(controller.total.value).toBe(0);
    expect(controller.status.value).toBe(state);
    expect(controller.error.value).toContain("live list rejected");
  });

  it("keeps an explicit empty state when the server returns no items", async () => {
    const controller = createAdminContentListController({
      list: vi.fn().mockResolvedValue({ page: 1, pageSize: 20, total: 0, items: [] }),
    });

    await controller.load();

    expect(controller.status.value).toBe("empty");
    expect(controller.records.value).toEqual([]);
    expect(controller.total.value).toBe(0);
  });

  it("adopts a server-corrected page and page size for the next request", async () => {
    const list = vi.fn()
      .mockResolvedValueOnce({ ...apiResponse, page: 3, pageSize: 7, total: 41 })
      .mockResolvedValueOnce({ ...apiResponse, page: 4, pageSize: 7, total: 41 });
    const controller = createAdminContentListController({ list }, { page: 99, pageSize: 20 });

    await controller.load();
    expect(controller.query.value).toMatchObject({ page: 3, pageSize: 7 });

    controller.setPage(4);
    await controller.load();
    expect(list).toHaveBeenLastCalledWith("page=4&pageSize=7");
  });
});
