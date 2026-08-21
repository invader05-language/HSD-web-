import {
  isApiResponse,
  type ApiOperation,
  type ApiResponseFor,
  type CurrentSessionResponseDto,
  type ErrorResponse,
  type LoginDto,
} from "../../packages/api-client/src";

export interface ApiSessionGateway {
  login(input: LoginDto): Promise<CurrentSessionResponseDto>;
  currentSession(): Promise<CurrentSessionResponseDto>;
  changePassword(newPassword: string): Promise<CurrentSessionResponseDto>;
  logout(): Promise<void>;
}

export interface ApiSessionGatewayOptions {
  apiBase: string;
  fetcher?: typeof globalThis.fetch;
  readCookie?: (name: string) => string | undefined;
  createRequestId?: () => string;
}

export class SessionApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(input: { status: number; code: string; message: string; requestId?: string }) {
    super(input.message);
    this.name = "SessionApiError";
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

export function createApiSessionGateway(options: ApiSessionGatewayOptions): ApiSessionGateway {
  const apiBase = options.apiBase.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? globalThis.fetch;
  const readCookie = options.readCookie ?? readBrowserCookie;
  const createRequestId = options.createRequestId ?? requestId;

  async function parseResponse<TOperation extends ApiOperation>(
    operation: TOperation,
    response: Response,
  ): Promise<ApiResponseFor<TOperation>> {
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new SessionApiError({
        status: response.status,
        code: isErrorResponse(payload) ? payload.code : "SESSION_API_REQUEST_FAILED",
        message: isErrorResponse(payload) ? payload.message : "Session API request failed",
        ...(isErrorResponse(payload) ? { requestId: payload.requestId } : {}),
      });
    }
    if (!isApiResponse(operation, payload)) {
      throw new Error(`API_RESPONSE_CONTRACT_MISMATCH:${operation}`);
    }
    return payload;
  }

  async function currentSession(): Promise<CurrentSessionResponseDto> {
    const response = await fetcher(`${apiBase}/api/v1/auth/session`, {
      method: "GET",
      credentials: "include",
      headers: { "X-Request-ID": createRequestId() },
    });
    return parseResponse("GET /api/v1/auth/session", response);
  }

  function requireCsrfToken(operation: string): string {
    const csrfToken = readCookie("hsd_csrf");
    if (!csrfToken) {
      throw new SessionApiError({
        status: 403,
        code: "SESSION_CSRF_TOKEN_MISSING",
        message: `${operation} request could not be verified`,
      });
    }
    return decodeURIComponent(csrfToken);
  }

  async function throwResponseError(response: Response): Promise<never> {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    throw new SessionApiError({
      status: response.status,
      code: isErrorResponse(payload) ? payload.code : "SESSION_API_REQUEST_FAILED",
      message: isErrorResponse(payload) ? payload.message : "Session API request failed",
      ...(isErrorResponse(payload) ? { requestId: payload.requestId } : {}),
    });
  }

  return {
    async login(input) {
      const response = await fetcher(`${apiBase}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": createRequestId(),
        },
        body: JSON.stringify(input),
      });
      await parseResponse("POST /api/v1/auth/login", response);
      return currentSession();
    },
    async changePassword(newPassword) {
      const csrfToken = requireCsrfToken("Password change");
      const response = await fetcher(`${apiBase}/api/v1/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
          "X-Request-ID": createRequestId(),
        },
        body: JSON.stringify({ newPassword }),
      });
      await parseResponse("POST /api/v1/auth/change-password", response);
      return currentSession();
    },
    async logout() {
      const csrfToken = requireCsrfToken("Logout");
      const response = await fetcher(`${apiBase}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": csrfToken,
          "X-Request-ID": createRequestId(),
        },
      });
      if (!response.ok) await throwResponseError(response);
    },
    currentSession,
  };
}
