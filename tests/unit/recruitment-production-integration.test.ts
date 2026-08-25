import { describe, expect, it } from "vitest";
import {
  createHsdApiClient,
  type ApiRequest,
} from "../../packages/api-client/src";
import {
  mapMemberProfileResponse,
  mapAdminRecruitmentBatch,
  mapPublicRecruitmentBatch,
  mapRecruitmentApplicationDraft,
  mapRecruitmentApplicationResponse,
  isRecruitmentApplicantEligible,
  getRecruitmentCenterOptions,
} from "../../app/services/recruitment/recruitment-view-models";

describe("production recruitment integration", () => {
  it("passes admin batch pagination through the generated client", async () => {
    const requests: ApiRequest[] = [];
    const response = { page: 2, pageSize: 20, total: 21, items: [] };
    const client = createHsdApiClient(async (request) => {
      requests.push(request);
      return response;
    });

    await expect(client.recruitment.listAdminBatches(2, 20)).resolves.toEqual(response);

    expect(requests).toEqual([{
      method: "GET",
      path: "/api/v1/admin/recruitment/batches?page=2&pageSize=20",
    }]);
  });

  it("exposes profile and recruitment application operations through the generated client", async () => {
    const requests: ApiRequest[] = [];
    const client = createHsdApiClient(async (request) => {
      requests.push(request);
      if (request.path === "/api/v1/members/me") {
        return {
          id: "person-1",
          name: "陈同学",
          studentId: "20260001",
          grade: "2026 级",
          className: "软件工程 1 班",
          contact: null,
          bio: null,
          biography: null,
          status: "PREPARATORY",
          baizeDirection: null,
          avatar: { kind: "default" },
          publicProfileEnabled: false,
          version: 1,
          membership: null,
        };
      }
      if (request.path.endsWith("/my-application")) return { application: null };
      if (request.path.endsWith("/applications")) return {
        id: "application-1",
        batchId: "batch-1",
        contact: "13800000000",
        baizeDirection: null,
        acceptsAdjustment: true,
        status: "SUBMITTED",
        version: 1,
        submittedAt: "2026-08-23T00:00:00.000Z",
        withdrawnAt: null,
        locked: false,
        preferences: [],
      };
      return {
        id: "application-1",
        batchId: "batch-1",
        contact: "13800000000",
        baizeDirection: null,
        acceptsAdjustment: true,
        status: "WITHDRAWN",
        version: 2,
        submittedAt: "2026-08-23T00:00:00.000Z",
        withdrawnAt: "2026-08-23T01:00:00.000Z",
        locked: false,
        preferences: [],
      };
    });

    await client.members.updateCurrentProfile({ expectedVersion: 1, name: "陈同学" });
    await client.recruitment.myApplication("batch-1");
    await client.recruitment.submitApplication("batch-1", {
      contact: "13800000000",
      preferences: [{ rank: 1, centerId: "new-media" }],
      acceptsAdjustment: true,
    });
    await client.recruitment.updateApplication("batch-1", "application-1", {
      expectedVersion: 1,
      contact: "13800000001",
      preferences: [{ rank: 1, centerId: "new-media" }],
      acceptsAdjustment: true,
    });
    await client.recruitment.withdrawApplication("batch-1", "application-1", { expectedVersion: 2 });

    expect(requests.map(({ method, path, body }) => ({ method, path, body }))).toEqual([
      { method: "PATCH", path: "/api/v1/members/me", body: { expectedVersion: 1, name: "陈同学" } },
      { method: "GET", path: "/api/v1/recruitment/batches/batch-1/my-application", body: undefined },
      {
        method: "POST",
        path: "/api/v1/recruitment/batches/batch-1/applications",
        body: { contact: "13800000000", preferences: [{ rank: 1, centerId: "new-media" }], acceptsAdjustment: true },
      },
      {
        method: "PATCH",
        path: "/api/v1/recruitment/batches/batch-1/applications/application-1",
        body: { expectedVersion: 1, contact: "13800000001", preferences: [{ rank: 1, centerId: "new-media" }], acceptsAdjustment: true },
      },
      { method: "POST", path: "/api/v1/recruitment/batches/batch-1/applications/application-1/withdraw", body: { expectedVersion: 2 } },
    ]);
  });

  it("maps public production batches without inventing local batch data", () => {
    expect(mapPublicRecruitmentBatch({
      id: "batch-1",
      name: "2026 秋季招新",
      startAt: "2026-09-01T00:00:00.000Z",
      endAt: "2026-09-20T00:00:00.000Z",
      timezone: "Asia/Shanghai",
      effectiveStatus: "open",
      effectiveStatusReason: "within-window",
      openCenters: [{ slug: "new-media", name: "新媒体中心" }],
    })).toEqual({
      id: "batch-1",
      name: "2026 秋季招新",
      startAt: "2026-09-01T00:00:00.000Z",
      endAt: "2026-09-20T00:00:00.000Z",
      timezone: "Asia/Shanghai",
      effectiveStatus: "open",
      effectiveStatusReason: "within-window",
      openCenterIds: ["new-media"],
      openCenters: [{ id: "new-media", name: "新媒体中心" }],
    });
  });

  it("derives application center options from the current batch open-center projection", () => {
    expect(getRecruitmentCenterOptions({
      openCenters: [
        { id: "new-media", name: "新媒体中心" },
        { id: "talent-development", name: "人才发展中心" },
      ],
    })).toEqual([
      ["new-media", "新媒体中心"],
      ["talent-development", "人才发展中心"],
    ]);
  });

  it("maps a real UUID profile and API application into form-safe values", () => {
    const profile = mapMemberProfileResponse({
      id: "person-uuid",
      name: "陈同学",
      studentId: "20260001",
      grade: "2026 级",
      className: "软件工程 1 班",
      contact: "13800000000",
      bio: "简介",
      biography: null,
      status: "PREPARATORY",
      baizeDirection: null,
      avatar: { kind: "default" },
      publicProfileEnabled: false,
      version: 3,
      membership: null,
    });
    expect(profile).toMatchObject({
      id: "person-uuid",
      identity: "预备成员",
      center: "待确定",
      memberDuty: "普通成员",
      version: 3,
      contact: "13800000000",
    });
    expect(isRecruitmentApplicantEligible(profile)).toBe(true);
    expect(isRecruitmentApplicantEligible({ ...profile, status: "FORMAL_MEMBER" })).toBe(false);

    expect(mapRecruitmentApplicationDraft({
      contact: "13800000000",
      firstChoice: "新媒体中心",
      secondChoice: undefined,
      thirdChoice: undefined,
      baizeDirection: undefined,
      acceptsAdjustment: true,
    })).toEqual({
      contact: "13800000000",
      preferences: [{ rank: 1, centerId: "new-media" }],
      acceptsAdjustment: true,
    });

    expect(mapRecruitmentApplicationResponse({
      id: "application-1",
      batchId: "batch-1",
      contact: "13800000000",
      baizeDirection: null,
      acceptsAdjustment: true,
      status: "SUBMITTED",
      version: 4,
      submittedAt: "2026-08-23T00:00:00.000Z",
      withdrawnAt: null,
      locked: false,
      preferences: [{ rank: 1, center: { id: "new-media", slug: "new-media", name: "新媒体中心" } }],
    }, profile, mapPublicRecruitmentBatch({
      id: "batch-1",
      name: "2026 秋季招新",
      startAt: "2026-09-01T00:00:00.000Z",
      endAt: "2026-09-20T00:00:00.000Z",
      timezone: "Asia/Shanghai",
      effectiveStatus: "open",
      effectiveStatusReason: "within-window",
      openCenters: [{ slug: "new-media", name: "新媒体中心" }],
    }))).toMatchObject({
      id: "application-1",
      batchId: "batch-1",
      status: "submitted",
      firstChoice: "新媒体中心",
      secondChoice: undefined,
    });
  });

  it("maps an empty production admin batch list without a fixture fallback", () => {
    expect([].map(mapAdminRecruitmentBatch)).toEqual([]);
    expect(mapAdminRecruitmentBatch({
      id: "batch-1",
      name: "2026 秋季招新",
      startAt: "2026-09-01T00:00:00.000Z",
      endAt: "2026-09-20T00:00:00.000Z",
      timezone: "Asia/Shanghai",
      lifecycleStatus: "PUBLISHED",
      manualOverride: "NONE",
      effectiveStatus: "open",
      effectiveStatusReason: "within-window",
      version: 2,
      publishedAt: "2026-08-30T00:00:00.000Z",
      actualOpenedAt: null,
      closedAt: null,
      archivedAt: null,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-30T00:00:00.000Z",
      applicationCount: 4,
      openCenters: [{ id: "new-media", slug: "new-media", name: "新媒体中心", active: true }],
      responsibleAccounts: [{ id: "account-1", username: "owner", status: "ENABLED", adminLevel: "OWNER", person: { id: "person-1", name: "总负责人" } }],
    })).toMatchObject({
      id: "batch-1",
      name: "2026 秋季招新",
      effectiveStatus: "open",
      lifecycleStatus: "published",
      manualOverride: "none",
      applicants: 4,
      openCenterIds: ["new-media"],
      owner: "总负责人",
    });
  });

});
