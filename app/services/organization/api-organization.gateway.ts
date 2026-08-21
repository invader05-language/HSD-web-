import {
  createHsdApiClient,
  type ApiRequest,
  type ApiTransport,
  type ErrorResponse,
} from "../../../packages/api-client/src";
import type { OrganizationGateway } from "./organization-gateway";

export interface ApiOrganizationGatewayOptions {
  apiBase: string;
  fetcher?: typeof globalThis.fetch;
  readCookie?: (name: string) => string | undefined;
  createRequestId?: () => string;
}

export class OrganizationApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(input: { status: number; code: string; message: string; requestId?: string }) {
    super(input.message);
    this.name = "OrganizationApiError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
  }
}

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readBrowserCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const encodedName = `${encodeURIComponent(name)}=`;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName))
    ?.slice(encodedName.length);
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === "object"
    && value !== null
    && typeof (value as ErrorResponse).code === "string"
    && typeof (value as ErrorResponse).message === "string"
    && typeof (value as ErrorResponse).requestId === "string";
}

export function createApiOrganizationGateway(options: ApiOrganizationGatewayOptions): OrganizationGateway {
  const apiBase = options.apiBase.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? globalThis.fetch;
  const readCookie = options.readCookie ?? readBrowserCookie;
  const createRequestId = options.createRequestId ?? requestId;

  const transport: ApiTransport = async (request: ApiRequest) => {
    const headers: Record<string, string> = { "X-Request-ID": createRequestId() };
    if (request.method !== "GET") {
      const csrfToken = readCookie("hsd_csrf");
      if (!csrfToken) {
        throw new OrganizationApiError({
          status: 403,
          code: "ORGANIZATION_CSRF_TOKEN_MISSING",
          message: "Organization request could not be verified",
        });
      }
      headers["Content-Type"] = "application/json";
      headers["X-CSRF-Token"] = decodeURIComponent(csrfToken);
    }
    const response = await fetcher(`${apiBase}${request.path}`, {
      method: request.method,
      credentials: "include",
      headers,
      ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new OrganizationApiError({
        status: response.status,
        code: isErrorResponse(payload) ? payload.code : "ORGANIZATION_API_REQUEST_FAILED",
        message: isErrorResponse(payload) ? payload.message : "Organization API request failed",
        ...(isErrorResponse(payload) ? { requestId: payload.requestId } : {}),
      });
    }
    return payload;
  };
  const client = createHsdApiClient(transport);

  return {
    publicCenters: client.organization.publicCenters,
    publicCenter: client.organization.publicCenter,
    listCenters: client.organization.centers,
    listManagedMembers: client.members.managed,
    createManagedMember: client.members.createManaged,
    promoteMemberToFormal: client.members.promoteManaged,
    createMembership: client.organization.createMembership,
    updateMembership: client.organization.updateMembership,
    retireMembership: client.organization.retireMembership,
    listAccounts: client.adminAccess.accounts,
    dryRunImport: client.imports.dryRun,
    commitImport: client.imports.commit,
    appointAllianceOwner: client.organization.appointAllianceOwner,
    revokeAllianceOwner: client.organization.revokeAllianceOwner,
    appointCenterMinister: client.organization.appointCenterMinister,
    revokeCenterMinister: client.organization.revokeCenterMinister,
    handoverCenterMinister: client.organization.handoverCenterMinister,
    setCoreMembership: client.organization.setCoreMembership,
    grantProjectLead: client.organization.grantProjectLead,
    revokeProjectLead: client.organization.revokeProjectLead,
  };
}
