import { describe, expect, it } from "vitest";
import {
  ADMIN_DASHBOARD_PATH,
  API_V1_PATHS,
  createHsdApiClient,
  isApiResponse,
  type ApiTransport,
} from "../../packages/api-client/src";
import openapiSnapshot from "../../packages/api-client/openapi.snapshot.json";

describe("generated browser API client", () => {
  it("exposes private member Growth CRUD only through generated self-service operations", () => {
    expect(API_V1_PATHS).toMatchObject({
      memberGrowthRecords: "/api/v1/members/me/growth-records",
      memberGrowthRecord: "/api/v1/members/me/growth-records/{id}",
      memberGrowthRecordCreate: "/api/v1/members/me/growth-records",
      memberGrowthRecordUpdate: "/api/v1/members/me/growth-records/{id}",
      memberGrowthRecordDelete: "/api/v1/members/me/growth-records/{id}",
    });
    const forbiddenGrowthPaths = Object.keys(openapiSnapshot.paths).filter((path) => /^\/api\/v1\/(?:admin|public)\/.*growth/i.test(path));
    expect(forbiddenGrowthPaths).toEqual([]);

    const schemas = openapiSnapshot.components.schemas as Record<string, { properties?: Record<string, Record<string, unknown>> }>;
    for (const dto of ["CreateGrowthRecordDto", "UpdateGrowthRecordDto"]) {
      expect(schemas[dto]?.properties?.title, dto).toMatchObject({ type: "string", maxLength: 60 });
      expect(schemas[dto]?.properties?.category, dto).toMatchObject({ type: "string", maxLength: 30 });
      expect(schemas[dto]?.properties?.reflection, dto).toMatchObject({ type: "string", maxLength: 1000 });
    }
  });

  it("accepts positive optimistic versions in project and activity update contracts", () => {
    const schemas = openapiSnapshot.components.schemas as Record<string, { properties?: Record<string, Record<string, unknown>> }>;
    for (const name of ["UpdateProjectDto", "UpdateActivityDto"]) {
      const expectedVersion = schemas[name]?.properties?.expectedVersion;
      expect(expectedVersion, name).toMatchObject({ type: "number", minimum: 1 });
      expect(expectedVersion, name).not.toHaveProperty("maximum");
    }
  });

  it("models organization membership updates as duty-only and never exposes center transfer", () => {
    const schemas = openapiSnapshot.components.schemas as Record<string, { properties?: Record<string, Record<string, unknown>> }>;
    expect(schemas.UpdateMembershipDto?.properties?.expectedVersion).toMatchObject({ type: "number", minimum: 1 });
    expect(schemas.UpdateMembershipDto?.properties?.duty?.enum).toEqual(["REGULAR", "CORE"]);
    expect(schemas.UpdateMembershipDto?.properties).not.toHaveProperty("centerId");
  });

  it("models Gallery admin-only team text and gallery media ownership in the generated contract", () => {
    const schemas = openapiSnapshot.components.schemas as Record<string, { properties?: Record<string, Record<string, unknown>> }>;
    expect(schemas.AdminGalleryResponseDto?.properties?.team).toMatchObject({ type: "string", nullable: true });
    expect(schemas.PublicGalleryResponseDto?.properties?.team).toBeUndefined();
    expect(schemas.MediaAttachmentResponseDto?.properties?.ownerType?.enum).toContain("gallery");
  });

  it("accepts an independent cover role in public gallery media responses", () => {
    const media = { kind: "image", role: "cover", title: "Cover", caption: "", alt: "Cover", aspect: "wide", sortOrder: 0, url: "/cover", thumbnailUrl: "/cover-thumbnail" };
    const gallery = { slug: "public-gallery", title: "Public gallery", category: "event_documentary", year: "2025", description: "Description", cover: media, details: [{ ...media, role: "detail" }], available: true };
    const schema = openapiSnapshot.components.schemas.PublicGalleryMediaResponseDto as {
      properties?: Record<string, { type?: string }>;
      required?: string[];
    };

    expect(isApiResponse("GET /api/v1/public/galleries", { items: [gallery] })).toBe(true);
    expect(isApiResponse("GET /api/v1/public/galleries/{slug}", gallery)).toBe(true);
    expect(schema.properties?.thumbnailUrl).toMatchObject({ type: "string" });
    expect(schema.required).not.toContain("thumbnailUrl");
  });

  it("exposes versioned Resource operations and keeps public variants free of internal identifiers", () => {
    expect(API_V1_PATHS).toMatchObject({
      adminResourceCreate: "/api/v1/admin/resources",
      adminResourceVersionCreate: "/api/v1/admin/resources/{id}/versions",
      adminResourceVersions: "/api/v1/admin/resources/{id}/versions",
      adminResourcePublish: "/api/v1/admin/resources/{id}/publish",
      adminResourceOffline: "/api/v1/admin/resources/{id}/offline",
      publicResource: "/api/v1/public/resources/{slug}",
      publicResourceVersion: "/api/v1/public/resources/{slug}/versions/{versionLabel}",
    });
    const schemas = openapiSnapshot.components.schemas as Record<string, { properties?: Record<string, Record<string, unknown>> }>;
    expect(schemas.PublicResourceResponseDto?.properties).toMatchObject({ slug: { type: "string" }, content: { type: "string" } });
    expect(schemas.PublicResourceResponseDto?.properties).not.toHaveProperty("id");
    expect(schemas.PublicResourceResponseDto?.properties).not.toHaveProperty("centerId");
    expect(openapiSnapshot.paths).toHaveProperty("/api/v1/public/resources/{slug}/versions/{versionLabel}/variant");
  });

  it("generates parameterless public Resource lists like the existing public project list", () => {
    expect(API_V1_PATHS.publicProjects).toBe("/api/v1/public/projects");
    expect(API_V1_PATHS).toHaveProperty("publicResources", "/api/v1/public/resources");
  });

  it("dispatches generated Resource operations through the runtime client", async () => {
    const requests: Array<{ path: string; method: string }> = [];
    const client = createHsdApiClient(async (request) => {
      requests.push({ path: request.path, method: request.method });
      return { slug: "safe-resource", title: "Safe resource", summary: "Safe summary", kind: "article", format: "web", versionLabel: "v1.0", access: "public", content: "Safe content" };
    });

    await client.resources.public("safe-resource");
    await client.resources.publicVersion("safe-resource", "v1.0");
    expect(client.resources.memberVariantUrl("safe-resource", "v1.0")).toBe("/api/v1/public/resources/safe-resource/versions/v1.0/variant");
    expect(requests).toEqual([
      { path: "/api/v1/public/resources/safe-resource", method: "GET" },
      { path: "/api/v1/public/resources/safe-resource/versions/v1.0", method: "GET" },
    ]);
  });

  it("accepts non-null resource attachment IDs from append, version history, and publish responses", async () => {
    const resourceId = "11111111-1111-4111-8111-111111111111";
    const attachmentId = "22222222-2222-4222-8222-222222222222";
    const version = {
      versionLabel: "v1.1",
      access: "public",
      availability: "available",
      content: "",
      attachmentId,
      revisionNumber: 2,
      createdAt: "2026-08-11T00:00:00.000Z",
    };
    const resource = {
      id: resourceId,
      centerId: "33333333-3333-4333-8333-333333333333",
      slug: "safe-pdf",
      status: "published",
      version: 2,
      publishedAt: "2026-08-11T00:00:00.000Z",
      title: "Safe PDF",
      summary: "Published through a safe media variant.",
      kind: "pdf",
      format: "pdf",
      versionLabel: version.versionLabel,
      access: version.access,
      availability: version.availability,
      content: version.content,
      attachmentId: version.attachmentId,
      revisionNumber: version.revisionNumber,
      createdBy: { id: "44444444-4444-4444-8444-444444444444", username: "owner", displayName: "Owner" },
      createdAt: "2026-08-11T00:00:00.000Z",
      updatedAt: "2026-08-11T00:00:00.000Z",
      offlineAt: null,
      offlineReason: null,
    };
    const client = createHsdApiClient(async (request) => {
      if (request.path.endsWith("/versions")) return request.method === "GET" ? { items: [version] } : version;
      return resource;
    });

    await expect(client.resources.appendVersion(resourceId, {
      expectedVersion: 1,
      versionLabel: "v1.1",
      content: "",
      access: "PUBLIC",
      availability: "AVAILABLE",
      attachmentId,
    })).resolves.toMatchObject({ attachmentId });
    await expect(client.resources.versions(resourceId)).resolves.toMatchObject({ items: [{ attachmentId }] });
    await expect(client.resources.publish(resourceId, { expectedVersion: 2, confirmed: true })).resolves.toMatchObject({ attachmentId });
  });

  it("keeps deprecated organization mutations out of the generated browser client and exposes position commands", () => {
    const paths = API_V1_PATHS as Record<string, string>;

    expect(paths).toMatchObject({
      adminMemberCreate: "/api/v1/admin/members",
      adminMembers: "/api/v1/admin/members",
      adminAccounts: "/api/v1/admin/accounts",
      organizationMembershipCreate: "/api/v1/admin/organization/memberships",
      organizationMembershipUpdate: "/api/v1/admin/organization/memberships/{personId}",
      organizationMembershipRetire: "/api/v1/admin/organization/memberships/{personId}/retire",
      organizationPositionAppointAllianceOwner: "/api/v1/admin/organization/positions/alliance-owners/{personId}",
      organizationPositionRevokeAllianceOwner: "/api/v1/admin/organization/positions/alliance-owners/{personId}/revoke",
      organizationPositionAppointCenterMinister: "/api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}",
      organizationPositionRevokeCenterMinister: "/api/v1/admin/organization/positions/centers/{centerId}/ministers/{personId}/revoke",
      organizationPositionHandoverCenterMinister: "/api/v1/admin/organization/positions/centers/{centerId}/ministers/{outgoingPersonId}/handover/{incomingPersonId}",
      organizationPositionSetCoreMembership: "/api/v1/admin/organization/positions/core-members/{personId}",
      organizationPositionGrantProjectLead: "/api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}",
      organizationPositionRevokeProjectLead: "/api/v1/admin/organization/positions/projects/{projectId}/leads/{personId}/revoke",
    });
    for (const deprecated of [
      "organizationCoreMembers",
      "organizationCoreMemberCreate",
      "organizationCoreMemberUpdate",
      "organizationCoreMemberRetire",
      "centerLeadershipAssign",
      "centerLeadershipRevoke",
      "adminAccountGrant",
      "adminAccountRevoke",
      "adminAccountEnable",
      "adminAccountDisable",
      "adminOwnerPromote",
      "adminOwnerDemote",
    ]) expect(paths).not.toHaveProperty(deprecated);
  });

  it("dispatches parameterized organization-position mutations with generated response validation", async () => {
    const personId = "11111111-1111-4111-8111-111111111111";
    const centerId = "22222222-2222-4222-8222-222222222222";
    const requests: Array<{ path: string; method: string; body?: unknown }> = [];
    const transport: ApiTransport = async (request) => {
      requests.push(request);
      if (request.path.includes("positions")) {
        return {
          id: "33333333-3333-4333-8333-333333333333",
          personId,
          type: request.path.includes("alliance-owners") ? "ALLIANCE_OWNER" : "CENTER_MINISTER",
          centerId: request.path.includes("ministers") ? centerId : null,
          projectId: null,
          version: 2,
          appointedAt: "2026-08-14T00:00:00.000Z",
        };
      }
      return {
        id: "55555555-5555-4555-8555-555555555555",
        personId,
        centerId,
        duty: "CORE",
        source: "DIRECT_ENTRY",
        version: 2,
        joinedAt: "2026-08-09T00:00:00.000Z",
        endedAt: null,
        center: { id: centerId, slug: "new-media", name: "新媒体中心" },
      };
    };
    const client = createHsdApiClient(transport);

    await client.organization.updateMembership(personId, { expectedVersion: 1, duty: "CORE" });
    await client.organization.appointAllianceOwner(personId, { expectedAccountVersion: 2, expectedMembershipVersion: 3 });
    await client.organization.appointCenterMinister(centerId, personId, { expectedAccountVersion: 4, expectedMembershipVersion: 5 });

    expect(requests).toEqual([
      { path: `/api/v1/admin/organization/memberships/${personId}`, method: "PATCH", body: { expectedVersion: 1, duty: "CORE" } },
      { path: `/api/v1/admin/organization/positions/alliance-owners/${personId}`, method: "POST", body: { expectedAccountVersion: 2, expectedMembershipVersion: 3 } },
      { path: `/api/v1/admin/organization/positions/centers/${centerId}/ministers/${personId}`, method: "POST", body: { expectedAccountVersion: 4, expectedMembershipVersion: 5 } },
    ]);
  });

  it("dispatches server-side activity registration filters and pagination", async () => {
    const requests: Array<{ path: string; method: string }> = [];
    const client = createHsdApiClient(async (request) => {
      requests.push({ path: request.path, method: request.method });
      return { page: 2, pageSize: 50, total: 51, totalPages: 2, items: [] };
    });

    await client.registrations.listAllAdmin({
      activityId: "11111111-1111-4111-8111-111111111111",
      search: "张三",
      status: "registered",
      page: 2,
      pageSize: 50,
    });

    expect(requests).toEqual([{
      method: "GET",
      path: "/api/v1/admin/registrations?activityId=11111111-1111-4111-8111-111111111111&search=%E5%BC%A0%E4%B8%89&status=registered&page=2&pageSize=50",
    }]);
  });

  it("addresses every browser domain through the versioned API prefix", async () => {
    const requests: Array<{ path: string; method: string }> = [];
    const transport: ApiTransport = async (request) => {
      requests.push({ path: request.path, method: request.method });
      if (request.path === API_V1_PATHS.authSession) {
        return {
          account: { id: "account-id", adminLevel: "MEMBER", adminCenterId: null, capabilities: [] },
          person: { id: "person-id", name: "陈同学", status: "PREPARATORY" },
          mustChangePassword: false,
        };
      }
      if (request.path === API_V1_PATHS.memberProfile) {
        return {
          id: "person-id", name: "陈同学", studentId: "2026001001", grade: "2026", className: "软件工程 1 班",
          contact: null, bio: null, biography: null, status: "PREPARATORY", baizeDirection: null,
          avatar: { kind: "default" }, publicProfileEnabled: false, version: 1, membership: null,
        };
      }
      if (request.path === API_V1_PATHS.recruitmentCurrent) return { batch: null };
      if (request.path === API_V1_PATHS.recruitmentResults) return { items: [] };
      return {};
    };
    const client = createHsdApiClient(transport);

    await client.auth.currentSession();
    await client.members.currentProfile();
    await client.recruitment.currentBatch();
    await client.recruitment.results();
    await client.admin.dashboard();

    expect(requests).toEqual([
      { path: "/api/v1/auth/session", method: "GET" },
      { path: "/api/v1/members/me", method: "GET" },
      { path: "/api/v1/recruitment/current", method: "GET" },
      { path: "/api/v1/recruitment/results/me", method: "GET" },
      { path: ADMIN_DASHBOARD_PATH, method: "GET" },
    ]);
    expect(Object.values(API_V1_PATHS).every((path) => path.startsWith("/api/v1/"))).toBe(true);
    expect(ADMIN_DASHBOARD_PATH.startsWith("/api/v1/")).toBe(true);
  });

  it("accepts the generated current-session shape and rejects undocumented fields", () => {
    const session = {
      account: {
        id: "c4c9eab9a7f14655a4c3b32dd12ba66f",
        adminLevel: "MEMBER",
        adminCenterId: null,
        capabilities: [],
      },
      person: {
        id: "0c9515b3-72a1-440f-965d-e3b2b5023005",
        name: "陈同学",
        status: "PREPARATORY",
      },
      mustChangePassword: false,
    };

    expect(isApiResponse("GET /api/v1/auth/session", session)).toBe(true);
    expect(isApiResponse("GET /api/v1/auth/session", {
      ...session,
      csrfToken: "not-documented-on-session-response",
    })).toBe(false);
  });

  it("logs in through the versioned browser contract before using the authoritative session projection", async () => {
    const requests: Array<{ path: string; method: string; body?: unknown }> = [];
    const transport: ApiTransport = async (request) => {
      requests.push({ path: request.path, method: request.method, body: request.body });
      if (request.path === "/api/v1/auth/login") {
        return {
          mustChangePassword: false,
          csrfToken: "cookie-bootstrap-only",
          expiresAt: "2026-08-08T00:00:00.000Z",
        };
      }
      return {
        account: {
          id: "account-owner",
          adminLevel: "OWNER",
          adminCenterId: null,
          capabilities: ["recruitment.assessment.edit", "recruitment.result.publish"],
        },
        person: { id: "person-owner", name: "总负责人", status: "FORMAL_MEMBER" },
        mustChangePassword: false,
      };
    };
    const client = createHsdApiClient(transport);

    await client.auth.login({ account: "20260001", password: "safe-password", rememberMe: true });
    await client.auth.currentSession();

    expect(requests).toEqual([
      {
        path: "/api/v1/auth/login",
        method: "POST",
        body: { account: "20260001", password: "safe-password", rememberMe: true },
      },
      { path: "/api/v1/auth/session", method: "GET", body: undefined },
    ]);
    expect(API_V1_PATHS.authLogin).toBe("/api/v1/auth/login");
  });

  it("requires discovery responses to include the generated batch dates, status, timezone, and centers", () => {
    const discovery = {
      batch: {
        id: "dd4c4060-051f-4b30-b7d9-e0aa3f5f498c",
        name: "2026 秋季招新",
        startAt: "2026-09-01T00:00:00.000Z",
        endAt: "2026-09-20T00:00:00.000Z",
        timezone: "Asia/Shanghai",
        effectiveStatus: "open",
        effectiveStatusReason: "within-window",
        openCenters: [{ slug: "new-media", name: "New Media" }],
      },
    };

    expect(isApiResponse("GET /api/v1/recruitment/current", discovery)).toBe(true);
    expect(isApiResponse("GET /api/v1/recruitment/current", {
      batch: { ...discovery.batch, openCenters: undefined },
    })).toBe(false);
    const schemas = openapiSnapshot.components.schemas as Record<string, { properties?: Record<string, Record<string, unknown>> }>;
    expect(schemas.PublicRecruitmentBatchDto?.properties?.id).not.toHaveProperty("format", "uuid");
    expect(schemas.PublicRecruitmentCenterDto?.properties).toEqual({
      slug: { type: "string" },
      name: { type: "string" },
    });
  });

  it("generates assessment operations and a private-field-free own-result contract", () => {
    expect(API_V1_PATHS).toMatchObject({
      assessmentBatch: "/api/v1/admin/recruitment/batches/{batchId}/assessments",
      recruitmentResults: "/api/v1/recruitment/results/me",
      recruitmentResponsibleContact: "/api/v1/recruitment/results/me/{resultId}/responsible-contacts/{contactPersonId}",
    });
    const result = {
      items: [{
        id: "dd4c4060-051f-4b30-b7d9-e0aa3f5f498c",
        batch: { id: "0c9515b3-72a1-440f-965d-e3b2b5023005", name: "2026 Autumn" },
        decision: "NOT_ADMITTED",
        finalCenter: null,
        admissionSource: null,
        baizeDirection: null,
        preferences: [],
        responsibleContacts: [],
        publishedAt: "2026-08-07T12:00:00.000Z",
      }],
    };

    expect(isApiResponse("GET /api/v1/recruitment/results/me", result)).toBe(true);
    expect(isApiResponse("GET /api/v1/recruitment/results/me", {
      items: [{ ...result.items[0], internalNote: "must stay private" }],
    })).toBe(false);
    expect(isApiResponse("GET /api/v1/recruitment/results/me/{resultId}/responsible-contacts/{contactPersonId}", {
      personId: "0c9515b3-72a1-440f-965d-e3b2b5023005",
      contact: "13800000000",
    })).toBe(true);
  });

  it("exposes generated public-organization and preparatory-import operations under the versioned API prefix", () => {
    expect(API_V1_PATHS).toMatchObject({
      publicCenters: "/api/v1/public/centers",
      publicCenterDetail: "/api/v1/public/centers/{publicSlug}",
      adminMemberPromote: "/api/v1/admin/members/{personId}/promote",
      organizationCenters: "/api/v1/admin/organization/centers",
      organizationMembershipCreate: "/api/v1/admin/organization/memberships",
      organizationPositionSetCoreMembership: "/api/v1/admin/organization/positions/core-members/{personId}",
      preparatoryImportDryRun: "/api/v1/admin/imports/preparatory-members/dry-run",
      preparatoryImportCommit: "/api/v1/admin/imports/preparatory-members/commit",
    });
  });

  it("requires public organization positions in public member responses", () => {
    const publicCenters = {
      allianceOwners: [{
        publicId: "owner-public-token",
        name: "Alliance owner",
        grade: "2026",
        className: "Software 1",
        avatar: { kind: "default", variant: "white-hsd" },
        center: { publicSlug: "new-media", name: "New Media" },
        duty: "CORE",
        honors: [],
        positions: [{ type: "ALLIANCE_OWNER" }, { type: "CENTER_MINISTER", centerPublicSlug: "new-media" }],
      }],
      items: [],
    };

    const schemas = openapiSnapshot.components.schemas as Record<string, { properties?: Record<string, unknown>; required?: string[] }>;
    expect(schemas.PublicMemberResponseDto?.properties?.positions).toMatchObject({
      type: "array",
      items: { $ref: "#/components/schemas/PublicOrganizationPositionResponseDto" },
    });
    expect(schemas.PublicMemberResponseDto?.required).toContain("positions");
    expect(isApiResponse("GET /api/v1/public/centers", publicCenters)).toBe(true);
    expect(isApiResponse("GET /api/v1/public/centers", {
      ...publicCenters,
      allianceOwners: [{ ...publicCenters.allianceOwners[0], positions: undefined }],
    })).toBe(false);
  });

  it("generates and dispatches the complete global portal contract", async () => {
    expect(API_V1_PATHS).toMatchObject({
      adminPortalDraft: "/api/v1/admin/portal/configuration/draft",
      adminPortalSaveDraft: "/api/v1/admin/portal/configuration/draft",
      adminPortalPreview: "/api/v1/admin/portal/configuration/preview",
      adminPortalPublish: "/api/v1/admin/portal/configuration/publish",
      publicPortal: "/api/v1/public/portal",
    });

    const requests: Array<{ path: string; method: string; body?: unknown }> = [];
    const transport: ApiTransport = async (request) => {
      requests.push(request);
      if (request.path === API_V1_PATHS.publicPortal) return { publishedAt: null, entries: [] };
      if (request.path === API_V1_PATHS.adminPortalPublish) {
        return { version: 2, entries: [], visuals: {}, publishedAt: "2026-08-10T00:00:00.000Z" };
      }
      return { version: request.method === "PUT" ? 1 : 0, entries: [], visuals: {} };
    };
    const client = createHsdApiClient(transport);

    await client.portal.draft();
    await client.portal.saveDraft({ expectedVersion: 0, entries: [] });
    await client.portal.preview();
    await client.portal.publish({ expectedVersion: 1, confirmed: true });
    await client.portal.publicConfiguration();

    expect(requests).toEqual([
      { path: "/api/v1/admin/portal/configuration/draft", method: "GET" },
      { path: "/api/v1/admin/portal/configuration/draft", method: "PUT", body: { expectedVersion: 0, entries: [] } },
      { path: "/api/v1/admin/portal/configuration/preview", method: "GET" },
      { path: "/api/v1/admin/portal/configuration/publish", method: "POST", body: { expectedVersion: 1, confirmed: true } },
      { path: "/api/v1/public/portal", method: "GET" },
    ]);
  });

  it("accepts public portal entries for every typed catalog snapshot", () => {
    const media = { kind: "image", role: "detail", title: "Cover", caption: "", alt: "Cover", aspect: "wide", sortOrder: 0, url: "/cover" };
    const portal = {
      publishedAt: "2026-08-11T00:00:00.000Z",
      entries: [
        { slot: "flash", position: 1, content: { slug: "flash", kind: "flash", title: "Flash", summary: null, tag: "new", expiresAt: null, blocks: [], publishedAt: "2026-08-11T00:00:00.000Z" } },
        { slot: "news", position: 1, content: { slug: "news", kind: "article", title: "News", summary: "Summary", tag: null, expiresAt: null, blocks: [], publishedAt: "2026-08-11T00:00:00.000Z" } },
        { slot: "projects", position: 1, content: {
          slug: "project",
          title: "Project",
          description: "Summary",
          displayOrder: 1,
          members: [{ name: "Member" }],
          memberCount: 1,
          cover: media,
          details: [media],
        } },
        { slot: "activities", position: 1, content: { slug: "activity", title: "Activity", summary: "Summary", cover: media } },
        { slot: "gallery", position: 1, content: { slug: "gallery", title: "Gallery", description: "Summary", cover: media, details: [media] } },
        { slot: "resources", position: 1, content: { slug: "resource", title: "Resource", summary: "Summary", content: "Details", access: "public" } },
      ],
    };

    expect(isApiResponse("GET /api/v1/public/portal", portal)).toBe(true);
  });

  it("accepts public portal content image blocks with their runtime thumbnail URL", () => {
    const portal = {
      publishedAt: "2026-08-11T00:00:00.000Z",
      entries: [{
        slot: "flash",
        position: 1,
        content: {
          slug: "flash-with-image",
          kind: "flash",
          title: "Flash with image",
          summary: null,
          tag: "new",
          expiresAt: null,
          blocks: [{ type: "image", url: "/flash-image", thumbnailUrl: "/flash-image-thumb", alt: "Flash image" }],
          publishedAt: "2026-08-11T00:00:00.000Z",
        },
      }],
    };

    const adminPortal = { version: 1, entries: portal.entries, visuals: {} };
    expect(isApiResponse("GET /api/v1/admin/portal/configuration/draft", adminPortal), "admin portal draft").toBe(true);
    expect(isApiResponse("GET /api/v1/public/portal", portal), "public portal").toBe(true);
  });

  it("models membership retirement as a true boolean and omits deprecated core-member retirement", () => {
    expect(API_V1_PATHS).toMatchObject({
      organizationMembershipRetire: "/api/v1/admin/organization/memberships/{personId}/retire",
    });
    expect(API_V1_PATHS).not.toHaveProperty("organizationCoreMemberRetire");
    const personId = "dd4c4060-051f-4b30-b7d9-e0aa3f5f498c";
    const center = { id: "0c9515b3-72a1-440f-965d-e3b2b5023005", slug: "new-media", name: "New Media" };
    const membership = {
      id: "178f061f-0ff6-48d4-b9a3-83f9770ca639", personId, centerId: center.id, duty: "REGULAR", source: "DIRECT_ENTRY", version: 2,
      joinedAt: "2026-08-08T00:00:00.000Z", endedAt: "2026-08-08T00:01:00.000Z", center,
    };
    expect(isApiResponse("POST /api/v1/admin/organization/memberships/{personId}/retire" as never, { personId, retired: true, membership })).toBe(true);
  });
});
