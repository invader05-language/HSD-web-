import { describe, expect, it, vi } from "vitest";
import {
  RecruitmentApiError,
  createApiRecruitmentGateway,
} from "../../app/services/recruitment/api-recruitment.gateway";
import { createRecruitmentGatewayForRuntime } from "../../app/composables/useRecruitmentGateway";

describe("recruitment API gateway", () => {
  it("requests the selected admin batch page from the server", async () => {
    const response = { page: 2, pageSize: 20, total: 21, items: [] };
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "https://api.example.test/",
      fetcher,
      createRequestId: () => "request-admin-batches-page-2",
    });

    await expect(gateway.listAdminBatches(2, 20)).resolves.toEqual(response);

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/admin/recruitment/batches?page=2&pageSize=20",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "request-admin-batches-page-2" },
      },
    );
  });

  it("retains the synchronous fixture workflow only for explicit Mock runtime mode", () => {
    expect(createRecruitmentGatewayForRuntime({
      apiBase: "https://api.example.test",
      useMockApi: true,
    })).toBeUndefined();
    expect(createRecruitmentGatewayForRuntime({
      apiBase: "https://api.example.test",
      useMockApi: false,
    })).toBeDefined();
  });

  it("reads production recruitment discovery and the authenticated application without fixture fallback", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ batch: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ batch: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ application: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "https://api.example.test",
      fetcher,
      createRequestId: () => "request-recruitment-read-1",
    });

    await gateway.getCurrentBatch();
    await gateway.getUpcomingBatch();
    await gateway.getMyApplication("batch-1");

    expect(fetcher).toHaveBeenNthCalledWith(1,
      "https://api.example.test/api/v1/recruitment/current",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "request-recruitment-read-1" },
      },
    );
    expect(fetcher).toHaveBeenNthCalledWith(2,
      "https://api.example.test/api/v1/recruitment/upcoming",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "request-recruitment-read-1" },
      },
    );
    expect(fetcher).toHaveBeenNthCalledWith(3,
      "https://api.example.test/api/v1/recruitment/batches/batch-1/my-application",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "request-recruitment-read-1" },
      },
    );
  });

  it("submits a production application through the CSRF-protected API", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: "application-1",
      batchId: "batch-1",
      contact: "applicant@example.com",
      baizeDirection: null,
      acceptsAdjustment: true,
      status: "SUBMITTED",
      version: 1,
      submittedAt: "2026-08-23T04:00:00.000Z",
      withdrawnAt: null,
      locked: false,
      preferences: [],
    }), { status: 201, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "https://api.example.test",
      fetcher,
      readCookie: () => "csrf-token",
      createRequestId: () => "request-recruitment-submit-1",
    });

    await gateway.submitApplication("batch-1", {
      contact: "applicant@example.com",
      preferences: [{ rank: 1, centerId: "new-media" }],
      acceptsAdjustment: true,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/recruitment/batches/batch-1/applications",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "csrf-token",
          "X-Request-ID": "request-recruitment-submit-1",
        },
        body: JSON.stringify({
          contact: "applicant@example.com",
          preferences: [{ rank: 1, centerId: "new-media" }],
          acceptsAdjustment: true,
        }),
      },
    );
  });

  it("uses PATCH for profile and application updates while retaining CSRF protection", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "person-1",
        name: "陈同学",
        studentId: "20260001",
        grade: "2026 级",
        className: "软件工程 1 班",
        contact: "13800000000",
        bio: null,
        biography: null,
        status: "PREPARATORY",
        baizeDirection: null,
        avatar: { kind: "default" },
        publicProfileEnabled: false,
        version: 2,
        membership: null,
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "application-1",
        batchId: "batch-1",
        contact: "13800000000",
        baizeDirection: null,
        acceptsAdjustment: true,
        status: "SUBMITTED",
        version: 2,
        submittedAt: "2026-08-23T04:00:00.000Z",
        withdrawnAt: null,
        locked: false,
        preferences: [],
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "https://api.example.test",
      fetcher,
      readCookie: () => "csrf-token",
      createRequestId: () => "request-patch-1",
    });

    await gateway.updateCurrentProfile({ expectedVersion: 1, name: "陈同学" });
    await gateway.updateApplication("batch-1", "application-1", {
      expectedVersion: 1,
      contact: "13800000000",
      preferences: [],
      acceptsAdjustment: true,
    });

    expect(fetcher).toHaveBeenNthCalledWith(1,
      "https://api.example.test/api/v1/members/me",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(2,
      "https://api.example.test/api/v1/recruitment/batches/batch-1/applications/application-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("sends authenticated assessment mutations with CSRF, request ID, and the generated payload contract", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      version: 8,
      result: {
        round: 1,
        outcome: "PASSED",
        internalNote: "内部记录",
        createdAt: "2026-08-07T09:00:00.000Z",
      },
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "https://api.example.test/",
      fetcher,
      readCookie: (name) => name === "hsd_csrf" ? "csrf-token%2Bvalue" : undefined,
      createRequestId: () => "request-assessment-1",
    });

    await gateway.recordRoundResult("batch/2026", "application 1", {
      expectedVersion: 7,
      round: 1,
      outcome: "PASSED",
      internalNote: "内部记录",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/admin/recruitment/batches/batch%2F2026/assessments/application%201/round-results",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "csrf-token+value",
          "X-Request-ID": "request-assessment-1",
        },
        body: JSON.stringify({
          expectedVersion: 7,
          round: 1,
          outcome: "PASSED",
          internalNote: "内部记录",
        }),
      },
    );
  });

  it("uses the generated roster and private-result paths without mutation headers", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        batch: { id: "batch-2026", name: "2026 招新", lifecycleStatus: "closed" },
        currentRound: 1,
        status: "ASSESSING",
        version: 3,
        publishedAt: null,
        pending: 0,
        adjustmentPending: 0,
        canAdvance: true,
        advanceBlocker: null,
        nextAction: "ADVANCE_ROUND",
        items: [],
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "https://api.example.test",
      fetcher,
      createRequestId: () => "request-read-1",
    });

    await gateway.getAssessmentBatch("batch/2026");
    await gateway.getMyResults();

    expect(fetcher).toHaveBeenNthCalledWith(1,
      "https://api.example.test/api/v1/admin/recruitment/batches/batch%2F2026/assessments",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "request-read-1" },
      },
    );
    expect(fetcher).toHaveBeenNthCalledWith(2,
      "https://api.example.test/api/v1/recruitment/results/me",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "request-read-1" },
      },
    );
  });

  it("reads the authoritative adjustment-target catalog without CSRF and preserves a center absent from the roster", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        id: "center-innovation",
        slug: "innovation-lab",
        name: "创新实验室",
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "https://api.example.test",
      fetcher,
      createRequestId: () => "request-target-catalog",
    });

    await gateway.getAdjustmentTargets("batch/2026");

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/admin/recruitment/batches/batch%2F2026/assessments/adjustment-targets",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "request-target-catalog" },
      },
    );
  });

  it.each([
    {
      name: "adjustment proposal",
      invoke: (gateway: ReturnType<typeof createApiRecruitmentGateway>) => gateway.proposeAdjustment(
        "batch-1",
        "application-1",
        { expectedVersion: 3, targetCenterId: "center-media" },
      ),
      path: "/api/v1/admin/recruitment/batches/batch-1/assessments/application-1/adjustment-proposals",
      body: { expectedVersion: 3, targetCenterId: "center-media" },
      response: {
        version: 4,
        proposal: {
          targetCenter: { id: "center-media", slug: "media", name: "新媒体中心" },
          createdAt: "2026-08-07T09:00:00.000Z",
        },
      },
    },
    {
      name: "adjustment decision",
      invoke: (gateway: ReturnType<typeof createApiRecruitmentGateway>) => gateway.decideAdjustment(
        "batch-1",
        "application-1",
        { expectedVersion: 4, decision: "NOT_ADMITTED" },
      ),
      path: "/api/v1/admin/recruitment/batches/batch-1/assessments/application-1/adjustment-decisions",
      body: { expectedVersion: 4, decision: "NOT_ADMITTED" },
      response: {
        version: 5,
        decision: {
          decision: "NOT_ADMITTED",
          targetCenter: null,
          createdAt: "2026-08-07T09:00:00.000Z",
        },
      },
    },
    {
      name: "round advance",
      invoke: (gateway: ReturnType<typeof createApiRecruitmentGateway>) => gateway.advanceAssessment(
        "batch-1",
        { expectedVersion: 5, confirmed: true, reason: "进入下一轮" },
      ),
      path: "/api/v1/admin/recruitment/batches/batch-1/assessments/advance",
      body: { expectedVersion: 5, confirmed: true, reason: "进入下一轮" },
      response: { currentRound: 2, status: "ASSESSING", version: 6, publishedAt: null },
    },
    {
      name: "batch publication",
      invoke: (gateway: ReturnType<typeof createApiRecruitmentGateway>) => gateway.publishAssessment(
        "batch-1",
        { expectedVersion: 6, confirmed: true, reason: "发布结果" },
      ),
      path: "/api/v1/admin/recruitment/batches/batch-1/assessments/publish",
      body: { expectedVersion: 6, confirmed: true, reason: "发布结果" },
      response: {
        currentRound: 2,
        status: "PUBLISHED",
        version: 7,
        publishedAt: "2026-08-07T09:00:00.000Z",
        summary: { admitted: 2, notAdmitted: 1, total: 3 },
      },
    },
  ])("sends the generated $name operation", async ({ invoke, path, body, response }) => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "https://api.example.test",
      fetcher,
      readCookie: () => "csrf",
      createRequestId: () => "request-mutation-1",
    });

    await invoke(gateway);

    expect(fetcher).toHaveBeenCalledWith(`https://api.example.test${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": "csrf",
        "X-Request-ID": "request-mutation-1",
      },
      body: JSON.stringify(body),
    });
  });

  it("surfaces backend failures without falling back to local recruitment data", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      code: "ASSESSMENT_VERSION_CONFLICT",
      message: "Assessment version conflict",
      requestId: "request-conflict-1",
    }), { status: 409, headers: { "Content-Type": "application/json" } }));
    const gateway = createApiRecruitmentGateway({
      apiBase: "",
      fetcher,
      createRequestId: () => "request-read-error",
    });

    const request = gateway.getAssessmentBatch("batch-1");

    await expect(request).rejects.toMatchObject<Partial<RecruitmentApiError>>({
      name: "RecruitmentApiError",
      status: 409,
      code: "ASSESSMENT_VERSION_CONFLICT",
      requestId: "request-conflict-1",
    });
  });

  it("does not send a mutation when the session CSRF cookie is unavailable", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>();
    const gateway = createApiRecruitmentGateway({
      apiBase: "",
      fetcher,
      readCookie: () => undefined,
    });

    await expect(gateway.advanceAssessment("batch-1", {
      expectedVersion: 1,
      confirmed: true,
    })).rejects.toThrow("RECRUITMENT_CSRF_TOKEN_MISSING");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
