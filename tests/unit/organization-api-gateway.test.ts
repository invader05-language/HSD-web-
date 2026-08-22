import { describe, expect, it, vi } from "vitest";
import {
  OrganizationApiError,
  createApiOrganizationGateway,
} from "../../app/services/organization/api-organization.gateway";
import { createOrganizationGatewayForRuntime } from "../../app/composables/useOrganizationGateway";

const personId = "11111111-1111-4111-8111-111111111111";
const centerId = "22222222-2222-4222-8222-222222222222";
const projectId = "66666666-6666-4666-8666-666666666666";

const membership = {
  id: "33333333-3333-4333-8333-333333333333",
  personId,
  centerId,
  duty: "CORE" as const,
  source: "DIRECT_ENTRY" as const,
  version: 2,
  joinedAt: "2026-08-09T00:00:00.000Z",
  endedAt: null,
  center: { id: centerId, slug: "new-media", name: "新媒体中心" },
};

const core = {
  id: "44444444-4444-4444-8444-444444444444",
  personId,
  roleTitle: "项目负责人",
  sortOrder: 7,
  version: 1,
  retiredAt: null,
  createdAt: "2026-08-09T00:00:00.000Z",
  updatedAt: "2026-08-09T00:00:00.000Z",
};

const managedMember = {
  id: personId,
  name: "陈同学",
  studentId: "2026001001",
  grade: "2026",
  className: "软件工程 1 班",
  contact: null,
  bio: null,
  biography: null,
  status: "FORMAL_MEMBER" as const,
  baizeDirection: null,
  avatar: { kind: "default" as const, variant: "white-hsd" as const },
  publicProfileEnabled: true,
  version: 8,
  membership,
  account: null,
  coreMember: null,
  positions: [],
};

describe("organization API gateway", () => {
  it("preserves local mock behavior only when useMockApi is explicitly enabled", () => {
    expect(createOrganizationGatewayForRuntime({ apiBase: "", useMockApi: true })).toBeUndefined();
    expect(createOrganizationGatewayForRuntime({ apiBase: "https://api.example.test", useMockApi: false })).toBeDefined();
  });

  it("does not expose deprecated core-member or leadership mutations", () => {
    const gateway = createApiOrganizationGateway({
      apiBase: "https://api.example.test/",
      fetcher: vi.fn() as typeof fetch,
      readCookie: () => "csrf%20token",
      createRequestId: () => "m4-request",
    });

    expect(gateway).not.toHaveProperty("createCoreMember");
    expect(gateway).not.toHaveProperty("updateCoreMember");
    expect(gateway).not.toHaveProperty("retireCoreMember");
    expect(gateway).not.toHaveProperty("assignLeadership");
    expect(gateway).not.toHaveProperty("revokeLeadership");
    expect(gateway).not.toHaveProperty("grantAdmin");
    expect(gateway).not.toHaveProperty("revokeAdmin");
    expect(gateway).not.toHaveProperty("enableAccount");
    expect(gateway).not.toHaveProperty("disableAccount");
    expect(gateway).not.toHaveProperty("promoteOwner");
    expect(gateway).not.toHaveProperty("demoteOwner");
  });

  it("sends CSRF-protected versioned membership and organization-position mutations", async () => {
    const position = {
      id: "55555555-5555-4555-8555-555555555555",
      personId,
      type: "ALLIANCE_OWNER" as const,
      centerId: null,
      projectId: null,
      version: 2,
      appointedAt: "2026-08-14T00:00:00.000Z",
    };
    const responses = [membership, position, { ...position, type: "PROJECT_LEAD" as const, projectId }];
    const fetcher = vi.fn(async () => new Response(JSON.stringify(responses.shift()), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const gateway = createApiOrganizationGateway({
      apiBase: "https://api.example.test/",
      fetcher: fetcher as typeof fetch,
      readCookie: () => "csrf%20token",
      createRequestId: () => "m4-request",
    });

    await gateway.updateMembership(personId, { expectedVersion: 1, duty: "CORE" });
    await gateway.appointAllianceOwner(personId, { expectedAccountVersion: 2, expectedMembershipVersion: 3 });
    await gateway.grantProjectLead(projectId, personId, { expectedAccountVersion: 4, expectedMembershipVersion: 5 });

    expect(fetcher.mock.calls.map(([url, options]) => ({
      url,
      method: options?.method,
      csrf: (options?.headers as Record<string, string>)["X-CSRF-Token"],
      requestId: (options?.headers as Record<string, string>)["X-Request-ID"],
    }))).toEqual([
      { url: `https://api.example.test/api/v1/admin/organization/memberships/${personId}`, method: "PATCH", csrf: "csrf token", requestId: "m4-request" },
      { url: `https://api.example.test/api/v1/admin/organization/positions/alliance-owners/${personId}`, method: "POST", csrf: "csrf token", requestId: "m4-request" },
      { url: `https://api.example.test/api/v1/admin/organization/positions/projects/${projectId}/leads/${personId}`, method: "POST", csrf: "csrf token", requestId: "m4-request" },
    ]);
  });

  it("surfaces an API center-scope rejection without retrying or falling back", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      code: "CENTER_SCOPE_FORBIDDEN",
      message: "Administrator may manage only the assigned center",
      requestId: "scope-denied",
    }), { status: 403, headers: { "content-type": "application/json" } }));
    const gateway = createApiOrganizationGateway({
      apiBase: "",
      fetcher: fetcher as typeof fetch,
      readCookie: () => "csrf",
      createRequestId: () => "scope-request",
    });

    await expect(gateway.createMembership({
      personId,
      centerId,
      duty: "REGULAR",
      expectedPersonVersion: 1,
    })).rejects.toMatchObject<Partial<OrganizationApiError>>({
      status: 403,
      code: "CENTER_SCOPE_FORBIDDEN",
      requestId: "scope-denied",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("sends an awaited promotion command with the authoritative center and person version", async () => {
    const center = { id: centerId, slug: "new-media", name: "新媒体中心", active: true };
    const responses = [{
      currentPermission: { accountId: "99999999-9999-4999-8999-999999999999", personId, adminLevel: "OWNER", adminCenterId: null, version: 1 },
      items: [{ ...center, positions: [] }],
    }, managedMember];
    const fetcher = vi.fn(async () => new Response(JSON.stringify(responses.shift()), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const gateway = createApiOrganizationGateway({
      apiBase: "https://api.example.test",
      fetcher: fetcher as typeof fetch,
      readCookie: () => "csrf",
      createRequestId: () => "promotion-request",
    });

    await gateway.listCenters();
    await gateway.promoteMemberToFormal(personId, {
      confirmed: true,
      expectedVersion: 7,
      centerId,
      duty: "CORE",
    });

    expect(fetcher.mock.calls.map(([url, options]) => ({
      url,
      method: options?.method,
      body: options?.body,
    }))).toEqual([
      { url: "https://api.example.test/api/v1/admin/organization/centers", method: "GET", body: undefined },
      {
        url: `https://api.example.test/api/v1/admin/members/${personId}/promote`,
        method: "POST",
        body: JSON.stringify({ confirmed: true, expectedVersion: 7, centerId, duty: "CORE" }),
      },
    ]);
  });

  it("sends the fixed OWNER-only center-minister command through the generated position contract", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      id: "55555555-5555-4555-8555-555555555555",
      personId,
      type: "CENTER_MINISTER",
      centerId,
      projectId: null,
      version: 1,
      appointedAt: "2026-08-14T00:00:00.000Z",
    }), { status: 201, headers: { "content-type": "application/json" } }));
    const gateway = createApiOrganizationGateway({
      apiBase: "https://api.example.test",
      fetcher: fetcher as typeof fetch,
      readCookie: () => "csrf",
      createRequestId: () => "position-request",
    });

    await gateway.appointCenterMinister(centerId, personId, {
      expectedAccountVersion: 3,
      expectedMembershipVersion: 4,
    });

    expect(fetcher).toHaveBeenCalledWith(
      `https://api.example.test/api/v1/admin/organization/positions/centers/${centerId}/ministers/${personId}`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ expectedAccountVersion: 3, expectedMembershipVersion: 4 }),
      }),
    );
  });

  it("reads public center details through the generated public organization route", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      publicSlug: "new-media",
      name: "新媒体中心",
      publicMemberCount: 2,
      publicCoreMemberCount: 2,
      ministers: [],
      members: [],
      coreMembers: [],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const gateway = createApiOrganizationGateway({
      apiBase: "https://api.example.test",
      fetcher: fetcher as typeof fetch,
      createRequestId: () => "public-center-request",
    });

    await gateway.publicCenter("new-media");

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/public/centers/new-media",
      expect.objectContaining({ method: "GET" }),
    );
  });
});
