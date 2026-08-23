import { describe, expect, it, vi } from "vitest";
import {
  API_OPERATIONS,
  createHsdApiClient,
  isApiResponse,
  type AdminRecruitmentBatchDto,
  type RecruitmentBatchLifecycleEventListDto,
} from "../../packages/api-client/src";
import { createApiRecruitmentGateway } from "../../app/services/recruitment/api-recruitment.gateway";
import { createProductionRecruitmentBatchController } from "../../app/composables/useProductionRecruitmentBatch";

const lifecycleResponse: RecruitmentBatchLifecycleEventListDto = {
  page: 1,
  pageSize: 50,
  total: 1,
  items: [{
    id: "6ef322d6-c7b5-4aa4-959e-891434398e67",
    actor: {
      type: "account",
      accountId: "03dd355b-b32d-4d3a-a2db-1ad9d2f08ece",
      username: "owner",
      displayName: "联盟总负责人",
    },
    action: "recruitment.batch.archived",
    target: { type: "RecruitmentBatch", id: "batch/closed" },
    before: { lifecycleStatus: "CLOSED", version: 9 },
    after: { lifecycleStatus: "ARCHIVED", version: 10 },
    reason: "结果复核完成",
    createdAt: "2026-08-24T08:00:00.000Z",
  }],
};

const archivedBatch: AdminRecruitmentBatchDto = {
  id: "87f88037-eccf-43bf-9c7c-dd2c30131110",
  name: "2026 秋季招新",
  startAt: "2026-09-01T00:00:00.000Z",
  endAt: "2026-09-20T00:00:00.000Z",
  timezone: "Asia/Shanghai",
  lifecycleStatus: "ARCHIVED",
  manualOverride: "FORCE_CLOSED",
  effectiveStatus: "archived",
  effectiveStatusReason: "archived",
  version: 10,
  publishedAt: "2026-08-30T00:00:00.000Z",
  actualOpenedAt: "2026-09-01T00:00:00.000Z",
  closedAt: "2026-09-21T00:00:00.000Z",
  archivedAt: "2026-09-30T00:00:00.000Z",
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-09-30T00:00:00.000Z",
  applicationCount: 17,
  openCenters: [],
  responsibleAccounts: [],
};

describe("Task 3C-G generated recruitment lifecycle client", () => {
  it("declares and validates the reviewed lifecycle GET and archive POST operations", () => {
    // Catches an incomplete browser-contract refresh or wrong archive success status.
    expect(API_OPERATIONS).toMatchObject({
      "GET /api/v1/admin/recruitment/batches/{batchId}/lifecycle-events": {
        method: "GET",
        path: "/api/v1/admin/recruitment/batches/{batchId}/lifecycle-events",
      },
      "POST /api/v1/admin/recruitment/batches/{batchId}/archive": {
        method: "POST",
        path: "/api/v1/admin/recruitment/batches/{batchId}/archive",
      },
    });
    expect(isApiResponse(
      "GET /api/v1/admin/recruitment/batches/{batchId}/lifecycle-events" as never,
      lifecycleResponse,
    )).toBe(true);
    expect(isApiResponse(
      "POST /api/v1/admin/recruitment/batches/{batchId}/archive" as never,
      archivedBatch,
    )).toBe(true);
  });

  it("encodes the batch path and sends the exact pagination and archive body through the generated client", async () => {
    const transport = vi.fn().mockResolvedValueOnce(lifecycleResponse).mockResolvedValueOnce(archivedBatch);
    const client = createHsdApiClient(transport) as ReturnType<typeof createHsdApiClient> & {
      recruitment: {
        listAdminBatchLifecycleEvents(batchId: string, page?: number, pageSize?: number): Promise<RecruitmentBatchLifecycleEventListDto>;
        archiveAdminBatch(batchId: string, payload: { expectedVersion: number; confirmed: true; reason?: string }): Promise<AdminRecruitmentBatchDto>;
      };
    };

    await expect(client.recruitment.listAdminBatchLifecycleEvents("batch/closed")).resolves.toEqual(lifecycleResponse);
    await expect(client.recruitment.archiveAdminBatch("batch/closed", {
      expectedVersion: 9,
      confirmed: true,
      reason: "结果复核完成",
    })).resolves.toEqual(archivedBatch);

    expect(transport).toHaveBeenNthCalledWith(1, {
      method: "GET",
      path: "/api/v1/admin/recruitment/batches/batch%2Fclosed/lifecycle-events?page=1&pageSize=50",
    });
    expect(transport).toHaveBeenNthCalledWith(2, {
      method: "POST",
      path: "/api/v1/admin/recruitment/batches/batch%2Fclosed/archive",
      body: { expectedVersion: 9, confirmed: true, reason: "结果复核完成" },
    });
  });
});

describe("Task 3C-G recruitment lifecycle API gateway", () => {
  it("uses cookie auth and request ids for lifecycle GET, then CSRF and the confirmed version body for archive POST", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(lifecycleResponse), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(archivedBatch), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "https://api.example.test/",
      fetcher,
      readCookie: (name) => name === "hsd_csrf" ? "csrf%2Btoken" : undefined,
      createRequestId: vi.fn().mockReturnValueOnce("lifecycle-request").mockReturnValueOnce("archive-request"),
    }) as ReturnType<typeof createApiRecruitmentGateway> & {
      listAdminBatchLifecycleEvents(batchId: string, page?: number, pageSize?: number): Promise<RecruitmentBatchLifecycleEventListDto>;
      archiveAdminBatch(batchId: string, payload: { expectedVersion: number; confirmed: true; reason?: string }): Promise<AdminRecruitmentBatchDto>;
    };

    await expect(gateway.listAdminBatchLifecycleEvents("batch/closed")).resolves.toEqual(lifecycleResponse);
    await expect(gateway.archiveAdminBatch("batch/closed", {
      expectedVersion: 9,
      confirmed: true,
      reason: "结果复核完成",
    })).resolves.toEqual(archivedBatch);

    expect(fetcher).toHaveBeenNthCalledWith(1,
      "https://api.example.test/api/v1/admin/recruitment/batches/batch%2Fclosed/lifecycle-events?page=1&pageSize=50",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "lifecycle-request" },
      },
    );
    expect(fetcher).toHaveBeenNthCalledWith(2,
      "https://api.example.test/api/v1/admin/recruitment/batches/batch%2Fclosed/archive",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "csrf+token",
          "X-Request-ID": "archive-request",
        },
        body: JSON.stringify({ expectedVersion: 9, confirmed: true, reason: "结果复核完成" }),
      },
    );
  });

  it.each([
    [{ expectedVersion: 1.5, confirmed: true }, "expectedVersion"],
    [{ expectedVersion: 9, confirmed: false }, "confirmed"],
  ])("rejects an invalid archive body before transport: %o", async (payload, expectedMessage) => {
    const fetcher = vi.fn<typeof globalThis.fetch>();
    const gateway = createApiRecruitmentGateway({
      apiBase: "",
      fetcher,
      readCookie: () => "csrf",
    }) as ReturnType<typeof createApiRecruitmentGateway> & {
      archiveAdminBatch(batchId: string, payload: unknown): Promise<AdminRecruitmentBatchDto>;
    };

    await expect(gateway.archiveAdminBatch("batch", payload)).rejects.toThrow(expectedMessage);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("Task 3C-G production recruitment lifecycle controller", () => {
  function closedBatch(version = 9): AdminRecruitmentBatchDto {
    return {
      ...archivedBatch,
      lifecycleStatus: "CLOSED",
      manualOverride: "FORCE_CLOSED",
      effectiveStatus: "closed",
      effectiveStatusReason: "force-closed",
      version,
      archivedAt: null,
    };
  }

  function controllerWith(gateway: {
    getAdminBatch: (batchId: string) => Promise<AdminRecruitmentBatchDto>;
    listAdminBatchLifecycleEvents: (batchId: string, page?: number, pageSize?: number) => Promise<RecruitmentBatchLifecycleEventListDto>;
    archiveAdminBatch: (batchId: string, payload: { expectedVersion: number; confirmed: true; reason?: string }) => Promise<AdminRecruitmentBatchDto>;
  }) {
    return createProductionRecruitmentBatchController(gateway) as ReturnType<typeof createProductionRecruitmentBatchController> & {
      lifecycleEvents: { value: Array<Record<string, unknown>> };
      lifecycleStatus: { value: string };
      lifecycleError: { value: string };
      detailStatus: { value: string };
      archiveStatus: { value: string };
      archiveError: { value: string };
      archive(reason?: string): Promise<boolean>;
    };
  }

  it("loads detail and lifecycle while projecting every event onto the safe generated fields", async () => {
    const unsafeResponse = {
      ...lifecycleResponse,
      items: [{
        ...lifecycleResponse.items[0],
        actor: { ...lifecycleResponse.items[0]!.actor, ipAddress: "198.51.100.9", sessionToken: "actor-token" },
        before: {
          lifecycleStatus: "CLOSED",
          version: 9,
          openCenterIds: ["center-safe"],
          ipAddress: "198.51.100.10",
          nested: { token: "nested-token" },
        },
        after: {
          lifecycleStatus: "ARCHIVED",
          version: 10,
          responsibleAccountIds: ["account-safe"],
          userAgent: "Unsafe UA",
          storageKey: "private/object-key",
        },
        requestId: "private-request-id",
        objectStorage: { bucket: "private" },
      }],
    } as unknown as RecruitmentBatchLifecycleEventListDto;
    const controller = controllerWith({
      getAdminBatch: vi.fn().mockResolvedValue(closedBatch()),
      listAdminBatchLifecycleEvents: vi.fn().mockResolvedValue(unsafeResponse),
      archiveAdminBatch: vi.fn().mockResolvedValue(archivedBatch),
    });

    await controller.load("batch/closed");

    expect(controller.batch.value).toMatchObject({ lifecycleStatus: "closed", version: 9 });
    expect(controller.detailStatus.value).toBe("success");
    expect(controller.lifecycleStatus.value).toBe("success");
    expect(controller.lifecycleEvents.value).toEqual([{
      id: "6ef322d6-c7b5-4aa4-959e-891434398e67",
      actorDisplayName: "联盟总负责人",
      action: "recruitment.batch.archived",
      target: { type: "RecruitmentBatch", id: "batch/closed" },
      before: { lifecycleStatus: "CLOSED", version: 9, openCenterIds: ["center-safe"] },
      after: { lifecycleStatus: "ARCHIVED", version: 10, responsibleAccountIds: ["account-safe"] },
      reason: "结果复核完成",
      createdAt: "2026-08-24T08:00:00.000Z",
    }]);
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "notFound"],
    [503, "error"],
  ])("shows lifecycle %s explicitly and clears events without discarding the current detail", async (status, expectedStatus) => {
    const controller = controllerWith({
      getAdminBatch: vi.fn().mockResolvedValue(closedBatch()),
      listAdminBatchLifecycleEvents: vi.fn().mockRejectedValue(Object.assign(new Error(`lifecycle ${status}`), { status })),
      archiveAdminBatch: vi.fn().mockResolvedValue(archivedBatch),
    });

    await controller.load("batch-closed");

    expect(controller.batch.value?.version).toBe(9);
    expect(controller.lifecycleEvents.value).toEqual([]);
    expect(controller.lifecycleStatus.value).toBe(expectedStatus);
    expect(controller.lifecycleError.value).toContain(`lifecycle ${status}`);
  });

  it("reports a canonical empty lifecycle list", async () => {
    const controller = controllerWith({
      getAdminBatch: vi.fn().mockResolvedValue(closedBatch()),
      listAdminBatchLifecycleEvents: vi.fn().mockResolvedValue({ page: 1, pageSize: 50, total: 0, items: [] }),
      archiveAdminBatch: vi.fn().mockResolvedValue(archivedBatch),
    });

    await controller.load("batch-empty");

    expect(controller.lifecycleEvents.value).toEqual([]);
    expect(controller.lifecycleStatus.value).toBe("empty");
  });

  it("clears old detail and events immediately and ignores slower responses for the previous route", async () => {
    let resolveOldDetail!: (value: AdminRecruitmentBatchDto) => void;
    let resolveOldLifecycle!: (value: RecruitmentBatchLifecycleEventListDto) => void;
    let resolveNewDetail!: (value: AdminRecruitmentBatchDto) => void;
    let resolveNewLifecycle!: (value: RecruitmentBatchLifecycleEventListDto) => void;
    const getAdminBatch = vi.fn()
      .mockImplementationOnce(() => new Promise<AdminRecruitmentBatchDto>((resolve) => { resolveOldDetail = resolve; }))
      .mockImplementationOnce(() => new Promise<AdminRecruitmentBatchDto>((resolve) => { resolveNewDetail = resolve; }));
    const listAdminBatchLifecycleEvents = vi.fn()
      .mockImplementationOnce(() => new Promise<RecruitmentBatchLifecycleEventListDto>((resolve) => { resolveOldLifecycle = resolve; }))
      .mockImplementationOnce(() => new Promise<RecruitmentBatchLifecycleEventListDto>((resolve) => { resolveNewLifecycle = resolve; }));
    const controller = controllerWith({
      getAdminBatch,
      listAdminBatchLifecycleEvents,
      archiveAdminBatch: vi.fn().mockResolvedValue(archivedBatch),
    });

    const oldLoad = controller.load("batch-old");
    const newLoad = controller.load("batch-new");
    expect(controller.batch.value).toBeUndefined();
    expect(controller.lifecycleEvents.value).toEqual([]);

    resolveNewDetail({ ...closedBatch(12), id: "batch-new", name: "新批次" });
    resolveNewLifecycle({ ...lifecycleResponse, items: [{ ...lifecycleResponse.items[0]!, target: { type: "RecruitmentBatch", id: "batch-new" } }] });
    await newLoad;
    resolveOldDetail({ ...closedBatch(4), id: "batch-old", name: "旧批次" });
    resolveOldLifecycle({ ...lifecycleResponse, items: [{ ...lifecycleResponse.items[0]!, target: { type: "RecruitmentBatch", id: "batch-old" } }] });
    await oldLoad;

    expect(controller.batch.value).toMatchObject({ id: "batch-new", version: 12 });
    expect(controller.lifecycleEvents.value[0]?.target).toEqual({ type: "RecruitmentBatch", id: "batch-new" });
  });

  it("archives with the current detail version, maps the response, and refreshes lifecycle", async () => {
    const archiveAdminBatch = vi.fn().mockResolvedValue(archivedBatch);
    const listAdminBatchLifecycleEvents = vi.fn()
      .mockResolvedValueOnce({ ...lifecycleResponse, total: 0, items: [] })
      .mockResolvedValueOnce(lifecycleResponse);
    const controller = controllerWith({
      getAdminBatch: vi.fn().mockResolvedValue(closedBatch()),
      listAdminBatchLifecycleEvents,
      archiveAdminBatch,
    });
    await controller.load("batch/closed");

    await expect(controller.archive("  结果复核完成  ")).resolves.toBe(true);

    expect(archiveAdminBatch).toHaveBeenCalledWith("batch/closed", {
      expectedVersion: 9,
      confirmed: true,
      reason: "结果复核完成",
    });
    expect(controller.batch.value).toMatchObject({ lifecycleStatus: "archived", version: 10 });
    expect(controller.archiveStatus.value).toBe("success");
    expect(controller.lifecycleEvents.value[0]?.action).toBe("recruitment.batch.archived");
  });

  it("keeps the batch closed on 403 and never reports archive success", async () => {
    const controller = controllerWith({
      getAdminBatch: vi.fn().mockResolvedValue(closedBatch()),
      listAdminBatchLifecycleEvents: vi.fn().mockResolvedValue(lifecycleResponse),
      archiveAdminBatch: vi.fn().mockRejectedValue(Object.assign(new Error("Owner only"), { status: 403 })),
    });
    await controller.load("batch-closed");

    await expect(controller.archive("not allowed")).resolves.toBe(false);

    expect(controller.batch.value).toMatchObject({ lifecycleStatus: "closed", version: 9 });
    expect(controller.archiveStatus.value).toBe("forbidden");
    expect(controller.archiveError.value).toContain("Owner only");
  });

  it("refreshes detail and lifecycle after 409, preserving conflict state until a new-version confirmation", async () => {
    const getAdminBatch = vi.fn()
      .mockResolvedValueOnce(closedBatch(9))
      .mockResolvedValueOnce(closedBatch(10));
    const listAdminBatchLifecycleEvents = vi.fn()
      .mockResolvedValueOnce(lifecycleResponse)
      .mockResolvedValueOnce({ ...lifecycleResponse, items: [{ ...lifecycleResponse.items[0]!, before: { version: 9 }, after: { version: 10 } }] })
      .mockResolvedValueOnce(lifecycleResponse);
    const archiveAdminBatch = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("Version conflict"), { status: 409, code: "RECRUITMENT_BATCH_VERSION_CONFLICT" }))
      .mockResolvedValueOnce(archivedBatch);
    const controller = controllerWith({ getAdminBatch, listAdminBatchLifecycleEvents, archiveAdminBatch });
    await controller.load("batch-closed");

    await expect(controller.archive("保留的原因")).resolves.toBe(false);

    expect(controller.archiveStatus.value).toBe("conflict");
    expect(controller.archiveError.value).toContain("版本");
    expect(controller.batch.value?.version).toBe(10);
    expect(controller.lifecycleEvents.value[0]?.after).toEqual({ version: 10 });

    await expect(controller.archive("保留的原因")).resolves.toBe(true);
    expect(archiveAdminBatch).toHaveBeenNthCalledWith(2, "batch-closed", {
      expectedVersion: 10,
      confirmed: true,
      reason: "保留的原因",
    });
  });
});
