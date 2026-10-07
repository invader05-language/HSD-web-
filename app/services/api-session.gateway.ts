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
  readonly retryAfterSeconds?: number;

  constructor(input: { status: number; code: string; message: string; requestId?: string; retryAfterSeconds?: number }) {
    super(input.message);
    this.name = "SessionApiError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.retryAfterSeconds = input.retryAfterSeconds;
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

function retryAfterSeconds(response: Response, payload: unknown): number | undefined {
  if (typeof payload === "object" && payload !== null && "retryAfterSeconds" in payload) {
    const seconds = (payload as { retryAfterSeconds?: unknown }).retryAfterSeconds;
    if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  }
  const header = response.headers.get("Retry-After");
  if (!header) return undefined;
  if (/^\d+$/.test(header.trim())) return Number(header.trim());
  const timestamp = Date.parse(header);
  return Number.isNaN(timestamp) ? undefined : Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

async function responseError(response: Response): Promise<SessionApiError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  const error = isErrorResponse(payload) ? payload : undefined;
  const retrySeconds = retryAfterSeconds(response, payload);
  return new SessionApiError({
    status: response.status,
    code: error?.code ?? "SESSION_API_REQUEST_FAILED",
    message: error?.message ?? "Session API request failed",
    ...(error?.requestId ? { requestId: error.requestId } : {}),
    ...(retrySeconds === undefined ? {} : { retryAfterSeconds: retrySeconds }),
  });
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
    if (!response.ok) {
      throw await responseError(response);
    }
    const payload: unknown = await response.json();
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
    throw await responseError(response);
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
      if (response.status !== 204) {
        throw new SessionApiError({
          status: response.status,
          code: "SESSION_API_RESPONSE_CONTRACT_MISMATCH",
          message: "Logout response did not prove session revocation",
        });
      }
    },
    currentSession,
  };
}
