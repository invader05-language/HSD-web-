import { expect, test, type Page, type Route } from "@playwright/test";

const ownerPersonId = "10000000-0000-4000-8000-000000000001";
const ownerAccountId = "10000000-0000-4000-8000-000000000002";
const candidatePersonId = "20000000-0000-4000-8000-000000000001";
const candidateAccountId = "20000000-0000-4000-8000-000000000002";
const adminPersonId = "30000000-0000-4000-8000-000000000001";
const adminAccountId = "30000000-0000-4000-8000-000000000002";
const centerId = "40000000-0000-4000-8000-000000000001";

type Mutation = "appoint-owner" | "revoke-owner" | "revoke-admin";
type Failure = { status: number; code: string; message: string } | "network";

interface ApiScenario {
  failures?: Partial<Record<Mutation, Failure>>;
  requests: Array<{ mutation: Mutation; body: Record<string, unknown> }>;
  readCounts: { accounts: number; centers: number; members: number };
}

async function useProductionApiRuntime(page: Page) {
  await page.route("**/admin/**", async (route) => {
    if (route.request().resourceType() !== "document") {
      await route.fallback();
      return;
    }
    const response = await route.fetch();
    const body = await response.text();
    const rewritten = body.replace("useMockApi:true", "useMockApi:false");
    if (rewritten === body) throw new Error("E2E_RUNTIME_CONFIG_NOT_REWRITTEN");
    await route.fulfill({ response, body: rewritten });
  });
}

function account(
  id: string,
  username: string,
  person: { id: string; name: string; studentId: string },
  adminLevel: "MEMBER" | "ADMIN" | "OWNER",
  version: number,
) {
  return {
    id,
    username,
    status: "ENABLED",
    adminLevel,
    adminCenterId: adminLevel === "ADMIN" ? centerId : null,
    mustChangePassword: false,
    lastLoginAt: null,
    version,
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    person: { ...person, grade: "2026", className: "软件工程 1 班" },
    adminCenter: adminLevel === "ADMIN" ? { id: centerId, slug: "new-media", name: "新媒体中心", active: true, positions: [] } : null,
  };
}

function member(
  person: { id: string; name: string; studentId: string },
  accountId: string,
  adminLevel: "MEMBER" | "ADMIN" | "OWNER",
  accountVersion: number,
  positions: Array<Record<string, unknown>>,
) {
  return {
    id: person.id,
    name: person.name,
    studentId: person.studentId,
    grade: "2026",
    className: "软件工程 1 班",
    contact: null,
    bio: null,
    biography: null,
    status: "FORMAL_MEMBER",
    baizeDirection: null,
    avatar: { kind: "default", variant: "white-hsd" },
    publicProfileEnabled: true,
    version: 1,
    membership: { duty: "REGULAR", version: 14, center: { id: centerId, slug: "new-media", name: "新媒体中心" } },
    account: {
      id: accountId,
      username: person.studentId,
      status: "ENABLED",
      adminLevel,
      adminCenterId: adminLevel === "ADMIN" ? centerId : null,
      mustChangePassword: false,
      version: accountVersion,
    },
    coreMember: null,
    positions,
  };
}

async function fulfillFailure(route: Route, failure: Failure) {
  if (failure === "network") {
    await route.abort("failed");
    return;
  }
  await route.fulfill({
    status: failure.status,
    contentType: "application/json",
    body: JSON.stringify({ code: failure.code, message: failure.message, requestId: `e2e-${failure.code.toLocaleLowerCase()}` }),
  });
}

async function installApiScenario(
  page: Page,
  failures: ApiScenario["failures"] = {},
  initialCandidateOwner = false,
): Promise<ApiScenario> {
  let candidateIsOwner = initialCandidateOwner;
  let adminIsMinister = true;
  const scenario: ApiScenario = {
    failures,
    requests: [],
    readCounts: { accounts: 0, centers: 0, members: 0 },
  };
  const ownerPerson = { id: ownerPersonId, name: "接口负责人", studentId: "qa-owner" };
  const candidatePerson = { id: candidatePersonId, name: "候选同学", studentId: "qa-candidate" };
  const adminPerson = { id: adminPersonId, name: "中心负责人", studentId: "qa-admin" };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/session" && request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        account: { id: ownerAccountId, adminLevel: "OWNER", adminCenterId: null, capabilities: [] },
        person: { id: ownerPersonId, name: "接口负责人", status: "FORMAL_MEMBER" },
        mustChangePassword: false,
      }) });
      return;
    }
    if (pathname === "/api/v1/admin/accounts" && request.method() === "GET") {
      scenario.readCounts.accounts += 1;
      const items = [
        account(ownerAccountId, "qa-owner", ownerPerson, "OWNER", 21),
        account(candidateAccountId, "qa-candidate", candidatePerson, candidateIsOwner ? "OWNER" : "MEMBER", candidateIsOwner ? 32 : 31),
        account(adminAccountId, "qa-admin", adminPerson, adminIsMinister ? "ADMIN" : "MEMBER", adminIsMinister ? 41 : 42),
      ];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, pageSize: 20, total: items.length, items }) });
      return;
    }
    if (pathname === "/api/v1/admin/organization/centers" && request.method() === "GET") {
      scenario.readCounts.centers += 1;
      const positions = adminIsMinister ? [{
        id: "50000000-0000-4000-8000-000000000001",
        personId: adminPersonId,
        type: "CENTER_MINISTER",
        centerId,
        projectId: null,
        version: 53,
        appointedAt: "2026-08-24T00:00:00.000Z",
      }] : [];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        currentPermission: { accountId: ownerAccountId, personId: ownerPersonId, adminLevel: "OWNER", adminCenterId: null, version: 21 },
        items: [{ id: centerId, slug: "new-media", name: "新媒体中心", active: true, positions }],
      }) });
      return;
    }
    if (pathname === "/api/v1/admin/members" && request.method() === "GET") {
      scenario.readCounts.members += 1;
      const ownerPosition = (personId: string, version: number) => ({
        id: `60000000-0000-4000-8000-${personId === ownerPersonId ? "000000000001" : "000000000002"}`,
        personId,
        type: "ALLIANCE_OWNER",
        centerId: null,
        projectId: null,
        version,
        appointedAt: "2026-08-24T00:00:00.000Z",
      });
      const ministerPosition = {
        id: "50000000-0000-4000-8000-000000000001",
        personId: adminPersonId,
        type: "CENTER_MINISTER",
        centerId,
        projectId: null,
        version: 53,
        appointedAt: "2026-08-24T00:00:00.000Z",
      };
      const items = [
        member(ownerPerson, ownerAccountId, "OWNER", 21, [ownerPosition(ownerPersonId, 61)]),
        member(candidatePerson, candidateAccountId, candidateIsOwner ? "OWNER" : "MEMBER", candidateIsOwner ? 32 : 31, candidateIsOwner ? [ownerPosition(candidatePersonId, 62)] : []),
        member(adminPerson, adminAccountId, adminIsMinister ? "ADMIN" : "MEMBER", adminIsMinister ? 41 : 42, adminIsMinister ? [ministerPosition] : []),
      ];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items }) });
      return;
    }

    let mutation: Mutation | undefined;
    if (pathname === `/api/v1/admin/organization/positions/alliance-owners/${candidatePersonId}` && request.method() === "POST") mutation = "appoint-owner";
    if (pathname === `/api/v1/admin/organization/positions/alliance-owners/${candidatePersonId}/revoke` && request.method() === "POST") mutation = "revoke-owner";
    if (pathname === `/api/v1/admin/organization/positions/centers/${centerId}/ministers/${adminPersonId}/revoke` && request.method() === "POST") mutation = "revoke-admin";
    if (mutation) {
      scenario.requests.push({ mutation, body: JSON.parse(request.postData() ?? "{}") as Record<string, unknown> });
      const failure = scenario.failures?.[mutation];
      if (failure) {
        await fulfillFailure(route, failure);
        return;
      }
      if (mutation === "appoint-owner") candidateIsOwner = true;
      if (mutation === "revoke-owner") candidateIsOwner = false;
      if (mutation === "revoke-admin") adminIsMinister = false;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
        id: mutation === "revoke-admin" ? "50000000-0000-4000-8000-000000000001" : "60000000-0000-4000-8000-000000000002",
        personId: mutation === "revoke-admin" ? adminPersonId : candidatePersonId,
        type: mutation === "revoke-admin" ? "CENTER_MINISTER" : "ALLIANCE_OWNER",
        centerId: mutation === "revoke-admin" ? centerId : null,
        projectId: null,
        version: mutation === "revoke-admin" ? 54 : 63,
        appointedAt: "2026-08-24T00:00:00.000Z",
      }) });
      return;
    }

    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "NOT_FOUND", message: "Not found", requestId: "admin-access-e2e" }) });
  });
  return scenario;
}

async function openRealAccounts(
  page: Page,
  failures: ApiScenario["failures"] = {},
  initialCandidateOwner = false,
) {
  await useProductionApiRuntime(page);
  const scenario = await installApiScenario(page, failures, initialCandidateOwner);
  await page.context().addCookies([{ name: "hsd_csrf", value: "admin-access-csrf", domain: "127.0.0.1", path: "/" }]);
  await page.goto("/admin/accounts");
  await expect(page.getByRole("heading", { level: 1, name: "管理员资格配置" })).toBeVisible();
  await expect(page.getByRole("complementary").getByText("接口负责人", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  return scenario;
}

test("real owner qualification actions submit authoritative versions, refresh, and expose enable/disable as unavailable", async ({ page }) => {
  const scenario = await openRealAccounts(page);
  const adminRow = page.getByRole("row").filter({ hasText: "qa-admin" });
  await expect(adminRow.getByRole("button", { name: "启用/停用暂不可用" })).toBeDisabled();
  await adminRow.getByRole("button", { name: "启用/停用暂不可用" }).click({ force: true });
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.getByRole("button", { name: "增设联盟总负责人" }).click();
  const addOwnerDialog = page.getByRole("dialog", { name: "增设联盟总负责人" });
  await addOwnerDialog.getByLabel("搜索平台用户").fill("qa-candidate");
  await addOwnerDialog.getByRole("button", { name: /选择 qa-candidate/ }).click();
  await addOwnerDialog.getByRole("button", { name: "确认添加" }).click();
  await expect(addOwnerDialog).toBeHidden();
  await expect(page.getByText("2/2 个负责人席位")).toBeVisible();

  const candidateOwner = page.getByRole("article").filter({ hasText: "qa-candidate" });
  await candidateOwner.getByRole("button", { name: "撤销负责人" }).click();
  const ownerConfirmation = page.getByRole("alertdialog");
  await ownerConfirmation.getByRole("button", { name: "确认变更" }).click();
  await expect(ownerConfirmation).toBeHidden();
  await expect(page.getByText("1/2 个负责人席位")).toBeVisible();

  await adminRow.getByRole("button", { name: "撤销资格" }).click();
  const adminConfirmation = page.getByRole("alertdialog");
  await adminConfirmation.getByRole("button", { name: "确认变更" }).click();
  await expect(adminConfirmation).toBeHidden();
  await expect(adminRow).toHaveCount(0);

  expect(scenario.requests).toEqual([
    { mutation: "appoint-owner", body: { expectedAccountVersion: 31, expectedMembershipVersion: 14 } },
    { mutation: "revoke-owner", body: { expectedPositionVersion: 62 } },
    { mutation: "revoke-admin", body: { expectedPositionVersion: 53 } },
  ]);
  expect(scenario.readCounts).toEqual({ accounts: 4, centers: 4, members: 4 });
});

test("real owner appointment keeps its dialog open and error visible on 403", async ({ page }) => {
  const scenario = await openRealAccounts(page, {
    "appoint-owner": { status: 403, code: "OWNER_SCOPE_FORBIDDEN", message: "没有联盟负责人任命权限" },
  });
  await page.getByRole("button", { name: "增设联盟总负责人" }).click();
  const dialog = page.getByRole("dialog", { name: "增设联盟总负责人" });
  await dialog.getByLabel("搜索平台用户").fill("qa-candidate");
  await dialog.getByRole("button", { name: /选择 qa-candidate/ }).click();
  await dialog.getByRole("button", { name: "确认添加" }).click();

  await expect(dialog).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("没有联盟负责人任命权限");
  expect(scenario.requests).toEqual([{ mutation: "appoint-owner", body: { expectedAccountVersion: 31, expectedMembershipVersion: 14 } }]);
  expect(scenario.readCounts).toEqual({ accounts: 1, centers: 1, members: 1 });
});

test("real admin revocation keeps confirmation open and canonical row visible on 409", async ({ page }) => {
  const scenario = await openRealAccounts(page, {
    "revoke-admin": { status: 409, code: "POSITION_VERSION_CONFLICT", message: "管理员资格版本已变化" },
  });
  const adminRow = page.getByRole("row").filter({ hasText: "qa-admin" });
  await adminRow.getByRole("button", { name: "撤销资格" }).click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.getByRole("button", { name: "确认变更" }).click();

  await expect(confirmation).toBeVisible();
  await expect(adminRow).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("管理员资格版本已变化");
  expect(scenario.requests).toEqual([{ mutation: "revoke-admin", body: { expectedPositionVersion: 53 } }]);
  expect(scenario.readCounts).toEqual({ accounts: 1, centers: 1, members: 1 });
});

test("real owner revocation keeps confirmation open and canonical owner visible on a network failure", async ({ page }) => {
  const scenario = await openRealAccounts(page, { "revoke-owner": "network" }, true);
  const candidateOwner = page.getByRole("article").filter({ hasText: "qa-candidate" });
  await candidateOwner.getByRole("button", { name: "撤销负责人" }).click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.getByRole("button", { name: "确认变更" }).click();

  await expect(confirmation).toBeVisible();
  await expect(candidateOwner).toBeVisible();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(scenario.requests.at(-1)).toEqual({ mutation: "revoke-owner", body: { expectedPositionVersion: 62 } });
});
