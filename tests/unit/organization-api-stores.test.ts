import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationGateway } from "../../app/services/organization/organization-gateway";
import { useAdminAccessStore } from "../../app/stores/admin-access";
import { useMemberAdministrationStore } from "../../app/stores/member-administration";
import { useMemberRepository } from "../../app/composables/useMemberRepository";

const personId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const centerId = "33333333-3333-4333-8333-333333333333";
const projectId = "77777777-7777-4777-8777-777777777777";

const center = { id: centerId, slug: "new-media", name: "新媒体中心", active: true };
const publicCenter = { publicSlug: "new-media", name: "新媒体中心", publicMemberCount: 1, publicCoreMemberCount: 0 };
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
  publicProfileEnabled: false,
  version: 1,
  membership: { duty: "REGULAR" as const, version: 4, center: { id: centerId, slug: "new-media", name: "新媒体中心" } },
  account: { id: accountId, username: "2026001001", status: "ENABLED" as const, adminLevel: "MEMBER" as const, adminCenterId: null, mustChangePassword: true, version: 3 },
  coreMember: null,
};
const adminAccount = {
  id: accountId,
  username: "2026001001",
  status: "ENABLED" as const,
  adminLevel: "MEMBER" as const,
  adminCenterId: null,
  mustChangePassword: true,
  lastLoginAt: null,
  version: 3,
  createdAt: "2026-08-09T00:00:00.000Z",
  updatedAt: "2026-08-09T00:00:00.000Z",
  person: { id: personId, name: "陈同学", studentId: "2026001001", grade: "2026", className: "软件工程 1 班" },
  adminCenter: null,
};

function gateway(overrides: Partial<OrganizationGateway> = {}): OrganizationGateway {
  return {
    publicCenters: vi.fn(async () => ({ items: [publicCenter] })),
    listCenters: vi.fn(async () => ({ items: [center] })),
    listManagedMembers: vi.fn(async () => ({ items: [managedMember] })),
    createManagedMember: vi.fn(async () => ({ personId, accountId, username: "2026001001", mustChangePassword: true })),
    promoteMemberToFormal: vi.fn(),
    createMembership: vi.fn(),
    updateMembership: vi.fn(),
    retireMembership: vi.fn(),
    listAccounts: vi.fn(async () => ({ page: 1, pageSize: 20, total: 1, items: [adminAccount] })),
    appointAllianceOwner: vi.fn(async () => ({
      id: "44444444-4444-4444-8444-444444444444",
      personId,
      type: "ALLIANCE_OWNER" as const,
      centerId: null,
      projectId: null,
      version: 4,
    })),
    revokeAllianceOwner: vi.fn(),
    appointCenterMinister: vi.fn(async () => ({
      id: "44444444-4444-4444-8444-444444444444",
      personId,
      type: "CENTER_MINISTER" as const,
      centerId,
      version: 4,
    })),
    revokeCenterMinister: vi.fn(),
    handoverCenterMinister: vi.fn(),
    setCoreMembership: vi.fn(async () => ({ ...managedMember.membership, duty: "CORE" as const, version: 5 })),
    grantProjectLead: vi.fn(),
    revokeProjectLead: vi.fn(),
    dryRunImport: vi.fn(),
    commitImport: vi.fn(),
    ...overrides,
  } as OrganizationGateway;
}

describe("organization production Pinia gateways", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("loads authoritative members and updates membership core level with the server version", async () => {
    const organization = gateway();
    const store = useMemberAdministrationStore();
    store.activateApiMode();

    await store.refreshFromApi(organization);
    const result = await store.promoteFormalMemberToCoreFromApi(personId, organization);

    expect(result).toEqual({ status: "success" });
    expect(organization.setCoreMembership).toHaveBeenCalledWith(personId, {
      core: true,
      expectedMembershipVersion: 4,
    });
    expect(store.apiModeActive).toBe(true);
    expect(store.apiManagedMembers).toEqual([managedMember]);
    expect(store.apiLoading).toBe(false);
    expect(store.apiError).toBeNull();
  });

  it("projects organizational positions from center records instead of deriving a minister role from admin level", async () => {
    const ministerPosition = {
      id: "55555555-5555-4555-8555-555555555555",
      personId,
      type: "CENTER_MINISTER" as const,
      centerId,
      version: 6,
      appointedAt: "2026-08-14T00:00:00.000Z",
      revokedAt: null,
    };
    const ownerPosition = {
      id: "66666666-6666-4666-8666-666666666666",
      personId,
      type: "ALLIANCE_OWNER" as const,
      centerId: null,
      projectId,
      version: 7,
      appointedAt: "2026-08-14T00:00:00.000Z",
      revokedAt: null,
    };
    const adminWithoutPosition = {
      ...managedMember,
      account: { ...managedMember.account, adminLevel: "ADMIN" as const, adminCenterId: centerId },
    };
    const organization = gateway({
      listManagedMembers: vi.fn(async () => ({ items: [adminWithoutPosition] })),
      listCenters: vi.fn(async () => ({ items: [{ ...center, positions: [ministerPosition, ownerPosition] }] })),
    });
    const store = useMemberAdministrationStore();
    store.activateApiMode();

    await store.refreshFromApi(organization);

    expect(store.apiAdminMembers).toMatchObject([{
      id: personId,
      memberDuty: "普通成员",
      isCore: false,
      organizationPositions: ["CENTER_MINISTER", "ALLIANCE_OWNER"],
    }]);
    expect(store.apiAdminMembers[0]).not.toHaveProperty("centerLeadership");
  });

  it("uses the managed-member authority projection for centerless alliance-owner and project-lead positions", async () => {
    const ownerPosition = {
      id: "66666666-6666-4666-8666-666666666666",
      personId,
      type: "ALLIANCE_OWNER" as const,
      centerId: null,
      version: 7,
      appointedAt: "2026-08-14T00:00:00.000Z",
    };
    const projectLeadPosition = {
      id: "77777777-7777-4777-8777-777777777777",
      personId,
      type: "PROJECT_LEAD" as const,
      centerId: null,
      projectId,
      version: 8,
      appointedAt: "2026-08-14T00:00:00.000Z",
    };
    const organization = gateway({
      listManagedMembers: vi.fn(async () => ({ items: [{ ...managedMember, positions: [ownerPosition, projectLeadPosition] }] })),
      listCenters: vi.fn(async () => ({ items: [{ ...center, positions: [] }] })),
      revokeAllianceOwner: vi.fn(async () => ownerPosition),
      revokeProjectLead: vi.fn(async () => projectLeadPosition),
    });
    const store = useMemberAdministrationStore();
    store.activateApiMode();

    await store.refreshFromApi(organization);

    expect(store.positionsForPerson(personId)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: ownerPosition.id, type: "ALLIANCE_OWNER", centerId: null }),
      expect.objectContaining({ id: projectLeadPosition.id, type: "PROJECT_LEAD", centerId: null }),
    ]));
    expect(store.apiAdminMembers).toMatchObject([{
      id: personId,
      organizationPositions: ["ALLIANCE_OWNER", "PROJECT_LEAD"],
    }]);

    await store.revokeAllianceOwnerFromApi(personId, ownerPosition.version, organization);
    await store.revokeProjectLeadFromApi(personId, projectId, projectLeadPosition.version, organization);

    expect(organization.revokeAllianceOwner).toHaveBeenCalledWith(personId, { expectedPositionVersion: 7 });
    expect(organization.revokeProjectLead).toHaveBeenCalledWith(projectId, personId, { expectedPositionVersion: 8 });
  });

  it("resolves a managed-member center-minister position through its centerId before revoking it", async () => {
    const ministerPosition = {
      id: "88888888-8888-4888-8888-888888888888",
      personId,
      type: "CENTER_MINISTER" as const,
      centerId,
      version: 9,
      appointedAt: "2026-08-14T00:00:00.000Z",
    };
    const organization = gateway({
      listManagedMembers: vi.fn(async () => ({ items: [{ ...managedMember, positions: [ministerPosition] }] })),
      listCenters: vi.fn(async () => ({ items: [{ ...center, positions: [] }] })),
      revokeCenterMinister: vi.fn(async () => ministerPosition),
    });
    const store = useMemberAdministrationStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);

    const result = await store.revokeCenterMinisterFromApi(personId, ministerPosition.version, organization);

    expect(result).toBe(true);
    expect(organization.revokeCenterMinister).toHaveBeenCalledWith(centerId, personId, { expectedPositionVersion: 9 });
  });

  it("uses the active membership version even when legacy core data exists", async () => {
    const retiredCore = {
      id: "44444444-4444-4444-8444-444444444444",
      personId,
      roleTitle: "原负责人",
      sortOrder: 7,
      version: 2,
      retiredAt: "2026-08-09T01:00:00.000Z",
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T01:00:00.000Z",
    };
    const retiredMember = { ...managedMember, membership: { ...managedMember.membership, version: 5 }, coreMember: retiredCore };
    const organization = gateway({ listManagedMembers: vi.fn(async () => ({ items: [retiredMember] })) });
    const store = useMemberAdministrationStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);

    const result = await store.promoteFormalMemberToCoreFromApi(personId, organization);

    expect(result).toEqual({ status: "success" });
    expect(organization.setCoreMembership).toHaveBeenCalledWith(personId, {
      core: true,
      expectedMembershipVersion: 5,
    });
  });

  it("uses authoritative account, membership, and position versions for OWNER personnel commands", async () => {
    const ownerPosition = {
      id: "55555555-5555-4555-8555-555555555555",
      personId,
      type: "ALLIANCE_OWNER" as const,
      centerId: null,
      projectId: null,
      version: 8,
      appointedAt: "2026-08-14T00:00:00.000Z",
    };
    const projectLeadPosition = {
      id: "66666666-6666-4666-8666-666666666666",
      personId,
      type: "PROJECT_LEAD" as const,
      centerId: null,
      projectId,
      version: 9,
      appointedAt: "2026-08-14T00:00:00.000Z",
    };
    const organization = gateway({
      listCenters: vi.fn(async () => ({ items: [{ ...center, positions: [ownerPosition, projectLeadPosition] }] })),
      appointAllianceOwner: vi.fn(async () => ownerPosition),
      revokeAllianceOwner: vi.fn(async () => ownerPosition),
      grantProjectLead: vi.fn(async () => projectLeadPosition),
      revokeProjectLead: vi.fn(async () => projectLeadPosition),
      setCoreMembership: vi.fn(async () => ({ ...managedMember.membership, duty: "REGULAR" as const, version: 5 })),
    });
    const store = useMemberAdministrationStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);

    await store.appointAllianceOwnerFromApi(personId, organization);
    await store.revokeAllianceOwnerFromApi(personId, ownerPosition.version, organization);
    await store.grantProjectLeadFromApi(personId, projectId, organization);
    await store.revokeProjectLeadFromApi(personId, projectId, projectLeadPosition.version, organization);
    await store.setCoreMembershipFromApi(personId, false, organization);

    expect(organization.appointAllianceOwner).toHaveBeenCalledWith(personId, {
      expectedAccountVersion: adminAccount.version,
      expectedMembershipVersion: managedMember.membership.version,
    });
    expect(organization.revokeAllianceOwner).toHaveBeenCalledWith(personId, {
      expectedPositionVersion: ownerPosition.version,
    });
    expect(organization.grantProjectLead).toHaveBeenCalledWith(projectId, personId, {
      expectedAccountVersion: adminAccount.version,
      expectedMembershipVersion: managedMember.membership.version,
    });
    expect(organization.revokeProjectLead).toHaveBeenCalledWith(projectId, personId, {
      expectedPositionVersion: projectLeadPosition.version,
    });
    expect(organization.setCoreMembership).toHaveBeenCalledWith(personId, {
      core: false,
      expectedMembershipVersion: managedMember.membership.version,
    });
    expect(organization.listAccounts).not.toHaveBeenCalled();
  });

  it("provisions a formal member through the selected authoritative center instead of browser storage", async () => {
    const organization = gateway();
    const store = useMemberAdministrationStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);

    const result = await store.createFormalMemberFromApi({
      name: "林同学",
      studentId: "2026002001",
      grade: "2026",
      className: "软件工程 2 班",
      center: "新媒体中心",
      memberDuty: "普通成员",
      bio: "",
    }, organization);

    expect(result).toMatchObject({ status: "success", memberId: personId, accountId });
    expect(organization.createManagedMember).toHaveBeenCalledWith({
      name: "林同学",
      studentId: "2026002001",
      grade: "2026",
      className: "软件工程 2 班",
      identity: "formal-member",
      centerId,
      duty: "REGULAR",
    });
  });

  it("promotes a preparatory member with the live person version, refreshes, and never falls back to localStorage", async () => {
    const preparatory = { ...managedMember, status: "PREPARATORY" as const, version: 7, membership: null };
    const listManagedMembers = vi.fn()
      .mockResolvedValueOnce({ items: [preparatory] })
      .mockResolvedValue({ items: [{ ...managedMember, version: 8 }] });
    const organization = gateway({
      listManagedMembers,
      promoteMemberToFormal: vi.fn(async () => ({ ...managedMember, version: 8 })),
    });
    const store = useMemberAdministrationStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");

    const result = await store.promoteMemberToFormalFromApi(personId, {
      centerId,
      duty: "CORE",
    }, organization);

    expect(result).toEqual({ status: "success" });
    expect(organization.promoteMemberToFormal).toHaveBeenCalledWith(personId, {
      confirmed: true,
      expectedVersion: 7,
      centerId,
      duty: "CORE",
    });
    expect(listManagedMembers).toHaveBeenCalledTimes(2);
    expect(store.apiManagedMembers[0]).toMatchObject({ status: "FORMAL_MEMBER", version: 8 });
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it("projects only API-loaded members after production mode is activated", async () => {
    const store = useMemberAdministrationStore();
    store.activateApiMode();
    await store.refreshFromApi(gateway());

    expect(useMemberRepository().adminMembers.value).toEqual([
      expect.objectContaining({
        id: personId,
        name: "陈同学",
        studentId: "2026001001",
        center: "新媒体中心",
        identity: "正式成员",
        memberDuty: "普通成员",
      }),
    ]);
  });

  it("appoints a center minister with account and membership versions rather than using legacy leadership", async () => {
    const organization = gateway({
      listCenters: vi.fn()
        .mockResolvedValueOnce({ items: [{ ...center, positions: [] }] })
        .mockResolvedValueOnce({ items: [{
          ...center,
          positions: [{ id: "44444444-4444-4444-8444-444444444444", personId, type: "CENTER_MINISTER", centerId, version: 4, appointedAt: "2026-08-14T00:00:00.000Z" }],
        }] }),
    });
    const store = useAdminAccessStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);

    const result = await store.assignAdminCenterRoleFromApi("2026001001", "新媒体中心负责人", organization);

    expect(result).toEqual({ status: "success" });
    expect(organization.appointCenterMinister).toHaveBeenCalledWith(centerId, personId, {
      expectedAccountVersion: 3,
      expectedMembershipVersion: 4,
    });
    expect(store.apiCenters.find((candidate) => candidate.id === centerId)?.positions).toEqual(expect.arrayContaining([
      expect.objectContaining({ personId, type: "CENTER_MINISTER", centerId, version: 4 }),
    ]));
    expect(store.apiError).toBeNull();
  });

  it("appoints an alliance owner with authoritative account and membership versions, then refreshes every projection", async () => {
    const ownerAccount = { ...adminAccount, adminLevel: "OWNER" as const, version: 4 };
    const ownerMember = {
      ...managedMember,
      account: { ...managedMember.account, adminLevel: "OWNER" as const, version: 4 },
      positions: [{
        id: "99999999-9999-4999-8999-999999999999",
        personId,
        type: "ALLIANCE_OWNER" as const,
        centerId: null,
        projectId: null,
        version: 5,
        appointedAt: "2026-08-24T00:00:00.000Z",
      }],
    };
    const organization = gateway({
      listAccounts: vi.fn()
        .mockResolvedValueOnce({ page: 1, pageSize: 20, total: 1, items: [adminAccount] })
        .mockResolvedValueOnce({ page: 1, pageSize: 20, total: 1, items: [ownerAccount] }),
      listManagedMembers: vi.fn()
        .mockResolvedValueOnce({ items: [managedMember] })
        .mockResolvedValueOnce({ items: [ownerMember] }),
    });
    const store = useAdminAccessStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");

    const result = await store.appointAllianceOwnerFromApi("2026001001", organization);

    expect(result).toEqual({ status: "success" });
    expect(organization.appointAllianceOwner).toHaveBeenCalledWith(personId, {
      expectedAccountVersion: 3,
      expectedMembershipVersion: 4,
    });
    expect(organization.listAccounts).toHaveBeenCalledTimes(2);
    expect(organization.listCenters).toHaveBeenCalledTimes(2);
    expect(organization.listManagedMembers).toHaveBeenCalledTimes(2);
    expect(store.accounts).toEqual([expect.objectContaining({ account: "2026001001", adminLevel: "owner" })]);
    expect(store.apiError).toBeNull();
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it("revokes an alliance owner with the authoritative position version from the managed-member projection", async () => {
    const ownerPosition = {
      id: "99999999-9999-4999-8999-999999999999",
      personId,
      type: "ALLIANCE_OWNER" as const,
      centerId: null,
      projectId: null,
      version: 8,
      appointedAt: "2026-08-24T00:00:00.000Z",
    };
    const ownerAccount = { ...adminAccount, adminLevel: "OWNER" as const };
    const ownerMember = {
      ...managedMember,
      account: { ...managedMember.account, adminLevel: "OWNER" as const },
      positions: [ownerPosition],
    };
    const organization = gateway({
      listAccounts: vi.fn(async () => ({ page: 1, pageSize: 20, total: 1, items: [ownerAccount] })),
      listManagedMembers: vi.fn(async () => ({ items: [ownerMember] })),
      revokeAllianceOwner: vi.fn(async () => ownerPosition),
    });
    const store = useAdminAccessStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);

    const result = await store.revokeAllianceOwnerFromApi("2026001001", organization);

    expect(result).toEqual({ status: "success" });
    expect(organization.revokeAllianceOwner).toHaveBeenCalledWith(personId, { expectedPositionVersion: 8 });
  });

  it("revokes a center administrator with the authoritative center-minister position version", async () => {
    const ministerPosition = {
      id: "88888888-8888-4888-8888-888888888888",
      personId,
      type: "CENTER_MINISTER" as const,
      centerId,
      projectId: null,
      version: 9,
      appointedAt: "2026-08-24T00:00:00.000Z",
    };
    const administrator = {
      ...adminAccount,
      adminLevel: "ADMIN" as const,
      adminCenterId: centerId,
      adminCenter: center,
    };
    const administratorMember = {
      ...managedMember,
      account: { ...managedMember.account, adminLevel: "ADMIN" as const, adminCenterId: centerId },
      positions: [ministerPosition],
    };
    const organization = gateway({
      listAccounts: vi.fn(async () => ({ page: 1, pageSize: 20, total: 1, items: [administrator] })),
      listManagedMembers: vi.fn(async () => ({ items: [administratorMember] })),
      revokeCenterMinister: vi.fn(async () => ministerPosition),
    });
    const store = useAdminAccessStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);

    const result = await store.revokeAdminCenterRoleFromApi("2026001001", organization);

    expect(result).toEqual({ status: "success" });
    expect(organization.revokeCenterMinister).toHaveBeenCalledWith(centerId, personId, { expectedPositionVersion: 9 });
  });

  it.each([
    {
      label: "403 owner appointment",
      status: 403,
      code: "OWNER_SCOPE_FORBIDDEN",
      configure: () => ({ appointAllianceOwner: vi.fn(async () => { throw Object.assign(new Error("scope denied"), { status: 403, code: "OWNER_SCOPE_FORBIDDEN", requestId: "owner-denied" }); }) }),
      run: (store: ReturnType<typeof useAdminAccessStore>, organization: OrganizationGateway) => store.appointAllianceOwnerFromApi("2026001001", organization),
    },
    {
      label: "409 owner revocation",
      status: 409,
      code: "POSITION_VERSION_CONFLICT",
      configure: () => ({
        listAccounts: vi.fn(async () => ({ page: 1, pageSize: 20, total: 1, items: [{ ...adminAccount, adminLevel: "OWNER" as const }] })),
        listManagedMembers: vi.fn(async () => ({ items: [{ ...managedMember, positions: [{ id: "owner-position", personId, type: "ALLIANCE_OWNER" as const, centerId: null, projectId: null, version: 8, appointedAt: "2026-08-24T00:00:00.000Z" }] }] })),
        revokeAllianceOwner: vi.fn(async () => { throw Object.assign(new Error("version conflict"), { status: 409, code: "POSITION_VERSION_CONFLICT", requestId: "owner-conflict" }); }),
      }),
      run: (store: ReturnType<typeof useAdminAccessStore>, organization: OrganizationGateway) => store.revokeAllianceOwnerFromApi("2026001001", organization),
    },
    {
      label: "network center-role revocation",
      status: undefined,
      code: "ORGANIZATION_API_REQUEST_FAILED",
      configure: () => ({
        listAccounts: vi.fn(async () => ({ page: 1, pageSize: 20, total: 1, items: [{ ...adminAccount, adminLevel: "ADMIN" as const, adminCenterId: centerId, adminCenter: center }] })),
        listManagedMembers: vi.fn(async () => ({ items: [{ ...managedMember, positions: [{ id: "minister-position", personId, type: "CENTER_MINISTER" as const, centerId, projectId: null, version: 9, appointedAt: "2026-08-24T00:00:00.000Z" }] }] })),
        revokeCenterMinister: vi.fn(async () => { throw new Error("network unavailable"); }),
      }),
      run: (store: ReturnType<typeof useAdminAccessStore>, organization: OrganizationGateway) => store.revokeAdminCenterRoleFromApi("2026001001", organization),
    },
  ])("keeps $label visible without mutating canonical rows or localStorage", async ({ status, code, configure, run }) => {
    const organization = gateway(configure());
    const store = useAdminAccessStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);
    const before = JSON.parse(JSON.stringify(store.accounts));
    const storageWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("localStorage must not be used"); });

    const result = await run(store, organization);

    expect(result).toEqual({ status: "api_error" });
    expect(store.accounts).toEqual(before);
    expect(store.apiError).toMatchObject({ ...(status === undefined ? {} : { status }), code });
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it("reports refresh failure after a successful owner command and retains the last canonical rows", async () => {
    const refreshFailure = Object.assign(new Error("refresh unavailable"), { status: 503, code: "ORGANIZATION_REFRESH_FAILED", requestId: "refresh-failed" });
    const organization = gateway({
      listAccounts: vi.fn()
        .mockResolvedValueOnce({ page: 1, pageSize: 20, total: 1, items: [adminAccount] })
        .mockRejectedValueOnce(refreshFailure),
    });
    const store = useAdminAccessStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);
    const before = JSON.parse(JSON.stringify(store.accounts));

    const result = await store.appointAllianceOwnerFromApi("2026001001", organization);

    expect(organization.appointAllianceOwner).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: "api_error" });
    expect(store.accounts).toEqual(before);
    expect(store.apiError).toMatchObject({ status: 503, code: "ORGANIZATION_REFRESH_FAILED", requestId: "refresh-failed" });
  });

  it("keeps API failures visible and never falls back to localStorage mutation", async () => {
    const denied = Object.assign(new Error("scope denied"), { status: 403, code: "CENTER_SCOPE_FORBIDDEN", requestId: "scope-denied" });
    const organization = gateway({ appointCenterMinister: vi.fn(async () => { throw denied; }) });
    const store = useAdminAccessStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);
    const before = JSON.parse(JSON.stringify(store.accounts));
    const storageWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("localStorage must not be used"); });

    const result = await store.assignAdminCenterRoleFromApi("2026001001", "新媒体中心负责人", organization);

    expect(result).toEqual({ status: "api_error" });
    expect(store.accounts).toEqual(before);
    expect(store.apiError).toMatchObject({ status: 403, code: "CENTER_SCOPE_FORBIDDEN", requestId: "scope-denied" });
    expect(storageWrite).not.toHaveBeenCalled();
  });
});
