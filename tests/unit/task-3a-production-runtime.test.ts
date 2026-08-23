import { describe, expect, it, vi } from "vitest";
import type {
  AdminRecruitmentBatchDto,
  MemberProfileResponseDto,
} from "../../packages/api-client/src";
import {
  createPublicContentGatewayForRuntime,
} from "../../app/composables/usePublicContentGateway";
import {
  ContentApiError,
  createApiPublicContentGateway,
} from "../../app/services/content/api-public-content.gateway";
import {
  createProductionMemberProfileController,
} from "../../app/composables/useProductionMemberProfile";
import {
  createProductionRecruitmentBatchController,
} from "../../app/composables/useProductionRecruitmentBatch";
import {
  mapAdminRecruitmentBatch,
} from "../../app/services/recruitment/recruitment-view-models";

const baseProfile: MemberProfileResponseDto = {
  id: "person-api-only",
  name: "API 陈同学",
  studentId: "20260088",
  grade: "2026 级",
  className: "软件工程 1 班",
  contact: "13800000000",
  bio: "初始简介",
  biography: null,
  status: "PREPARATORY",
  baizeDirection: null,
  avatar: { kind: "asset", publicToken: "avatar-token" },
  publicProfileEnabled: false,
  version: 3,
  membership: null,
};

const apiBatch: AdminRecruitmentBatchDto = {
  id: "batch-api-only",
  name: "API 2026 秋季招新",
  startAt: "2026-09-01T00:00:00.000Z",
  endAt: "2026-09-20T00:00:00.000Z",
  timezone: "Asia/Shanghai",
  lifecycleStatus: "PUBLISHED",
  manualOverride: "PAUSED",
  effectiveStatus: "paused",
  effectiveStatusReason: "paused",
  version: 9,
  publishedAt: "2026-08-30T00:00:00.000Z",
  actualOpenedAt: "2026-09-01T00:00:00.000Z",
  closedAt: null,
  archivedAt: null,
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
  applicationCount: 17,
  openCenters: [
    { id: "center-active", slug: "active", name: "开放中心", active: true },
    { id: "center-inactive", slug: "inactive", name: "已停用中心", active: false },
  ],
  responsibleAccounts: [
    { id: "account-1", username: "owner", status: "ENABLED", adminLevel: "OWNER", person: { id: "person-1", name: "总负责人" } },
    { id: "account-2", username: "backup", status: "DISABLED", adminLevel: "ADMIN", person: { id: "person-2", name: "协作负责人" } },
  ],
};

describe("Task 3A production member profile", () => {
  it("loads, patches with the API version, and reloads the persisted API profile", async () => {
    const getCurrentProfile = vi.fn()
      .mockResolvedValueOnce(baseProfile)
      .mockResolvedValueOnce({ ...baseProfile, name: "持久化姓名", bio: "持久化简介", version: 4 });
    const updateCurrentProfile = vi.fn().mockResolvedValue({ ...baseProfile, name: "持久化姓名", version: 4 });
    const controller = createProductionMemberProfileController({
      gateway: { getCurrentProfile, updateCurrentProfile },
      apiBase: "https://api.example.test",
    });

    await controller.load();
    expect(controller.profile.value?.name).toBe("API 陈同学");
    expect(controller.avatarSource.value).toBe("https://api.example.test/api/v1/public/media/avatar-token");
    controller.draft.name = "持久化姓名";
    controller.draft.bio = "持久化简介";

    await controller.save();

    expect(updateCurrentProfile).toHaveBeenCalledWith({
      expectedVersion: 3,
      name: "持久化姓名",
      grade: "2026 级",
      className: "软件工程 1 班",
      bio: "持久化简介",
      contact: "13800000000",
    });
    expect(getCurrentProfile).toHaveBeenCalledTimes(2);
    expect(controller.profile.value).toMatchObject({ name: "持久化姓名", bio: "持久化简介", version: 4 });
    expect(controller.status.value).toBe("success");
  });

  it("preserves the draft and authoritative profile on a 409 conflict", async () => {
    const conflict = Object.assign(new Error("Version conflict"), {
      name: "RecruitmentApiError",
      status: 409,
      code: "MEMBER_PROFILE_VERSION_CONFLICT",
      requestId: "request-conflict",
    });
    const controller = createProductionMemberProfileController({
      gateway: {
        getCurrentProfile: vi.fn().mockResolvedValue(baseProfile),
        updateCurrentProfile: vi.fn().mockRejectedValue(conflict),
      },
      apiBase: "",
    });
    await controller.load();
    controller.draft.name = "尚未保存的姓名";

    await controller.save();

    expect(controller.profile.value?.name).toBe("API 陈同学");
    expect(controller.draft.name).toBe("尚未保存的姓名");
    expect(controller.status.value).toBe("conflict");
    expect(controller.error.value).toContain("重新加载");
  });
});

describe("Task 3A public content gateway", () => {
  it("requests an encoded public slug with credentials and a request id", async () => {
    const payload = {
      slug: "api-only/news",
      kind: "article",
      title: "API 独有动态",
      summary: "仅来自接口",
      tag: "新闻",
      expiresAt: null,
      blocks: [{ type: "paragraph", text: "正文" }],
      publishedAt: "2026-08-23T00:00:00.000Z",
    } as const;
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const gateway = createApiPublicContentGateway({
      apiBase: "https://api.example.test/",
      fetcher,
      createRequestId: () => "request-public-content",
    });

    await expect(gateway.getBySlug("api-only/news")).resolves.toEqual(payload);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/public/content/api-only%2Fnews",
      {
        method: "GET",
        credentials: "include",
        headers: { "X-Request-ID": "request-public-content" },
      },
    );
  });

  it("surfaces 404 and contract failures without a local content fallback", async () => {
    const notFoundFetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
      code: "CONTENT_NOT_FOUND",
      message: "Content not found",
      requestId: "request-404",
    }), { status: 404, headers: { "Content-Type": "application/json" } }));
    const missingGateway = createApiPublicContentGateway({ apiBase: "", fetcher: notFoundFetcher });

    await expect(missingGateway.getBySlug("project-team")).rejects.toMatchObject<Partial<ContentApiError>>({
      status: 404,
      code: "CONTENT_NOT_FOUND",
      requestId: "request-404",
    });

    const invalidGateway = createApiPublicContentGateway({
      apiBase: "",
      fetcher: vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({
        slug: "project-team",
        kind: "draft",
        title: "不安全状态",
      }), { status: 200, headers: { "Content-Type": "application/json" } })),
    });
    await expect(invalidGateway.getBySlug("project-team")).rejects.toThrow("PUBLIC_CONTENT_RESPONSE_CONTRACT_MISMATCH");
  });

  it("keeps mock mode explicit instead of constructing an API gateway", () => {
    expect(createPublicContentGatewayForRuntime({ apiBase: "", useMockApi: true })).toBeUndefined();
    expect(createPublicContentGatewayForRuntime({ apiBase: "https://api.example.test", useMockApi: false })).toBeDefined();
  });
});

describe("Task 3A production admin batch detail", () => {
  it("maps every authoritative detail field without deriving fixture data", () => {
    expect(mapAdminRecruitmentBatch(apiBatch)).toEqual({
      id: "batch-api-only",
      name: "API 2026 秋季招新",
      startAt: "2026-09-01T00:00:00.000Z",
      endAt: "2026-09-20T00:00:00.000Z",
      timezone: "Asia/Shanghai",
      effectiveStatus: "paused",
      effectiveStatusReason: "paused",
      lifecycleStatus: "published",
      manualOverride: "paused",
      version: 9,
      applicants: 17,
      applicationCount: 17,
      publishedAt: "2026-08-30T00:00:00.000Z",
      actualOpenedAt: "2026-09-01T00:00:00.000Z",
      closedAt: null,
      archivedAt: null,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-09-05T00:00:00.000Z",
      openCenterIds: ["center-active", "center-inactive"],
      openCenters: apiBatch.openCenters,
      owner: "总负责人",
      responsibleAccounts: apiBatch.responsibleAccounts,
    });
  });

  it("leaves owner unassigned for zero or blank accounts and uses the first trimmed responsible identity", () => {
    expect(mapAdminRecruitmentBatch({ ...apiBatch, responsibleAccounts: [] }).owner).toBeUndefined();

    expect(mapAdminRecruitmentBatch({
      ...apiBatch,
      responsibleAccounts: [{
        id: "account-blank-name",
        username: "  fallback-owner  ",
        status: "ENABLED",
        adminLevel: "OWNER",
        person: { id: "person-blank-name", name: "   " },
      }],
    }).owner).toBe("fallback-owner");

    expect(mapAdminRecruitmentBatch({
      ...apiBatch,
      responsibleAccounts: [
        { id: "account-first", username: "first", status: "ENABLED", adminLevel: "OWNER", person: { id: "person-first", name: "  第一负责人  " } },
        { id: "account-second", username: "second", status: "ENABLED", adminLevel: "ADMIN", person: { id: "person-second", name: "第二负责人" } },
      ],
    })).toMatchObject({
      owner: "第一负责人",
      responsibleAccounts: [
        expect.objectContaining({ id: "account-first" }),
        expect.objectContaining({ id: "account-second" }),
      ],
    });

    expect(mapAdminRecruitmentBatch({
      ...apiBatch,
      responsibleAccounts: [{
        id: "account-all-blank",
        username: "  ",
        status: "DISABLED",
        adminLevel: "ADMIN",
        person: { id: "person-all-blank", name: "  " },
      }],
    }).owner).toBeUndefined();
  });

  it("loads API-only detail and leaves data empty for 404 rather than using a fixture", async () => {
    const getAdminBatch = vi.fn().mockResolvedValue(apiBatch);
    const controller = createProductionRecruitmentBatchController({ getAdminBatch });
    await controller.load("batch-api-only");
    expect(controller.batch.value).toMatchObject({ id: "batch-api-only", applicationCount: 17, owner: "总负责人" });

    getAdminBatch.mockRejectedValueOnce(Object.assign(new Error("Not found"), {
      name: "RecruitmentApiError",
      status: 404,
      code: "RECRUITMENT_BATCH_NOT_FOUND",
    }));
    await controller.load("fixture-batch-2026");
    expect(controller.batch.value).toBeUndefined();
    expect(controller.notFound.value).toBe(true);
  });
});
