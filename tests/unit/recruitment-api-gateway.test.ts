import { describe, expect, it, vi } from "vitest";
import {
  RecruitmentApiError,
  createApiRecruitmentGateway,
} from "../../app/services/recruitment/api-recruitment.gateway";
import { createRecruitmentGatewayForRuntime } from "../../app/composables/useRecruitmentGateway";

describe("recruitment API gateway", () => {
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
        currentRound: 1,
        status: "ASSESSING",
        version: 3,
        publishedAt: null,
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
