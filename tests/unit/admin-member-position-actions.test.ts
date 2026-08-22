import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import OrganizationPositionActionDialog from "../../app/components/admin/OrganizationPositionActionDialog.vue";
import type { OrganizationGateway } from "../../app/services/organization/organization-gateway";
import { useMemberAdministrationStore } from "../../app/stores/member-administration";

const personId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const centerId = "44444444-4444-4444-8444-444444444444";

const member = {
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
  membership: { duty: "CORE" as const, version: 4, center: { id: centerId, slug: "new-media", name: "新媒体中心" } },
  account: { id: accountId, username: "2026001001", status: "ENABLED" as const, adminLevel: "MEMBER" as const, adminCenterId: null, mustChangePassword: true, version: 2 },
  coreMember: null,
  positions: [],
};

function gateway(overrides: Partial<OrganizationGateway> = {}): OrganizationGateway {
  return {
    publicCenters: vi.fn(async () => ({ items: [] })),
    publicCenter: vi.fn(),
    listCenters: vi.fn(async () => ({ items: [] })),
    listManagedMembers: vi.fn(async () => ({ items: [member] })),
    createManagedMember: vi.fn(),
    promoteMemberToFormal: vi.fn(),
    createMembership: vi.fn(),
    updateMembership: vi.fn(),
    retireMembership: vi.fn(),
    listAccounts: vi.fn(async () => ({ page: 1, pageSize: 20, total: 1, items: [{
      id: accountId, username: member.studentId, status: "ENABLED" as const, adminLevel: "MEMBER" as const,
      adminCenterId: null, mustChangePassword: true, lastLoginAt: null, version: 2,
      createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
      person: { id: personId, name: member.name, studentId: member.studentId, grade: member.grade, className: member.className }, adminCenter: null,
    }] })),
    dryRunImport: vi.fn(),
    commitImport: vi.fn(),
    appointAllianceOwner: vi.fn(),
    revokeAllianceOwner: vi.fn(),
    appointCenterMinister: vi.fn(),
    revokeCenterMinister: vi.fn(),
    handoverCenterMinister: vi.fn(),
    setCoreMembership: vi.fn(),
    grantProjectLead: vi.fn(async () => ({ id: "55555555-5555-4555-8555-555555555555", personId, type: "PROJECT_LEAD" as const, centerId: null, projectId, version: 1, appointedAt: "2026-08-01T00:00:00.000Z" })),
    revokeProjectLead: vi.fn(),
    listAdminProjects: vi.fn(async () => ({ items: [] })),
    ...overrides,
  } as OrganizationGateway;
}

describe("member position actions", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("requires a project id and sends the selected project to the project-lead command", async () => {
    const organization = gateway();
    const store = useMemberAdministrationStore();
    store.activateApiMode();
    await store.refreshFromApi(organization);

    await store.grantProjectLeadFromApi(personId, projectId, organization);

    expect(organization.grantProjectLead).toHaveBeenCalledWith(projectId, personId, {
      expectedAccountVersion: 2,
      expectedMembershipVersion: 4,
    });
  });

  it("renders a keyboard-accessible project selection dialog and emits the selected project", async () => {
    const wrapper = mount(OrganizationPositionActionDialog, {
      props: {
        open: true,
        action: "PROJECT_LEAD",
        memberName: "陈同学",
        projects: [{ id: projectId, title: "智巡先锋", status: "published", lead: null }],
      },
      attachTo: document.body,
    });

    expect(wrapper.get('[role="dialog"]').attributes("aria-modal")).toBe("true");
    await nextTick();
    expect(wrapper.get("select").element).toBe(document.activeElement);
    await wrapper.get("select").setValue(projectId);
    await wrapper.get("form").trigger("submit");
    expect(wrapper.emitted("confirm")?.[0]).toEqual([{ projectId }]);

    await wrapper.trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("keeps keyboard focus inside the dialog and blocks backdrop close while busy", async () => {
    const wrapper = mount(OrganizationPositionActionDialog, {
      props: {
        open: true,
        action: "PROJECT_LEAD",
        memberName: "陈同学",
        projects: [{ id: projectId, title: "智巡先锋", status: "published", lead: null }],
        busy: false,
      },
      attachTo: document.body,
    });

    const select = wrapper.get("select").element;
    const confirm = wrapper.get("button[type=submit]").element;
    await wrapper.get("select").setValue(projectId);
    confirm.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(select);

    select.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(confirm);

    await wrapper.setProps({ busy: true });
    await wrapper.get(".admin-modal-backdrop").trigger("click");
    await wrapper.trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("close")).toBeUndefined();
    wrapper.unmount();
  });
});
