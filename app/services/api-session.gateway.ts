import {
  isApiResponse,
  type ApiOperation,
  type ApiResponseFor,
  type CurrentSessionResponseDto,
  type ErrorResponse,
  type LoginDto,
} from "../../packages/api-client/src";
import { ApiEndpointConfigurationError, resolveBrowserApiBase } from "../utils/browser-api-base";

export type LoginPhase = "login_post" | "session_get" | "apply_session" | "navigation";
export type LoginFailureKind = "http" | "transport" | "timeout" | "configuration" | "contract" | "client";

export interface LoginRequestContext {
  attemptId?: string;
  phase?: LoginPhase;
  credentialValidated?: boolean;
  loginRequestId?: string;
}

export interface ApiSessionGateway {
  login(input: LoginDto, context?: LoginRequestContext): Promise<CurrentSessionResponseDto>;
  currentSession(context?: LoginRequestContext): Promise<CurrentSessionResponseDto>;
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
  readonly phase?: LoginPhase;
  readonly kind?: LoginFailureKind;
  readonly attemptId?: string;
  readonly clientRequestId?: string;
  readonly loginRequestId?: string;
  readonly credentialValidated: boolean;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    requestId?: string;
    retryAfterSeconds?: number;
    phase?: LoginPhase;
    kind?: LoginFailureKind;
    attemptId?: string;
    clientRequestId?: string;
    loginRequestId?: string;
    credentialValidated?: boolean;
  }) {
    super(input.message);
    this.name = "SessionApiError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.retryAfterSeconds = input.retryAfterSeconds;
    this.phase = input.phase;
    this.kind = input.kind;
    this.attemptId = input.attemptId;
    this.clientRequestId = input.clientRequestId;
    this.loginRequestId = input.loginRequestId;
    this.credentialValidated = input.credentialValidated ?? false;
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

async function responseError(
  response: Response,
  context: LoginRequestContext & { clientRequestId?: string } = {},
): Promise<SessionApiError> {
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
    phase: context.phase,
    kind: "http",
    attemptId: context.attemptId,
    clientRequestId: context.clientRequestId,
    loginRequestId: context.loginRequestId,
    credentialValidated: context.credentialValidated,
  });
}

export function createApiSessionGateway(options: ApiSessionGatewayOptions): ApiSessionGateway {
  let apiBase = "";
  let endpointConfigurationError = false;
  try {
    apiBase = resolveBrowserApiBase(options.apiBase);
  } catch (error) {
    if (!(error instanceof ApiEndpointConfigurationError)) throw error;
    endpointConfigurationError = true;
  }
  const fetcher = options.fetcher ?? globalThis.fetch;
  const readCookie = options.readCookie ?? readBrowserCookie;
  const createRequestId = options.createRequestId ?? requestId;

  async function parseResponse<TOperation extends ApiOperation>(
    operation: TOperation,
    response: Response,
    context: LoginRequestContext & { clientRequestId?: string } = {},
  ): Promise<ApiResponseFor<TOperation>> {
    if (!response.ok) {
      throw await responseError(response, context);
    }
    const payload: unknown = await response.json();
    if (!isApiResponse(operation, payload)) {
      throw new SessionApiError({
        status: response.status,
        code: "SESSION_API_RESPONSE_CONTRACT_MISMATCH",
        message: "Session API response did not match the expected contract",
        phase: context.phase,
        kind: "contract",
        attemptId: context.attemptId,
        clientRequestId: context.clientRequestId,
        loginRequestId: context.loginRequestId,
        credentialValidated: context.credentialValidated,
      });
    }
    return payload;
  }

  async function fetchWithContext(
    url: string,
    init: RequestInit,
    context: LoginRequestContext,
  ): Promise<{ response: Response; clientRequestId: string }> {
    const clientRequestId = createRequestId();
    if (endpointConfigurationError) {
      throw new SessionApiError({
        status: 0,
        code: "API_ENDPOINT_CONFIGURATION_INVALID",
        message: "The browser API endpoint configuration is invalid",
        phase: context.phase,
        kind: "configuration",
        attemptId: context.attemptId,
        clientRequestId,
        loginRequestId: context.loginRequestId,
        credentialValidated: context.credentialValidated,
      });
    }
    const headers = {
      ...(init.headers && !(init.headers instanceof Headers) ? init.headers as Record<string, string> : {}),
      "X-Request-ID": clientRequestId,
    };
    try {
      return {
        response: await fetcher(url, { ...init, headers }),
        clientRequestId,
      };
    } catch (cause) {
      const isTimeout = cause instanceof DOMException && (cause.name === "TimeoutError" || cause.name === "AbortError");
      throw new SessionApiError({
        status: 0,
        code: isTimeout ? "SESSION_API_TIMEOUT" : "SESSION_API_TRANSPORT_FAILED",
        message: isTimeout ? "Session API request timed out" : "Session API request could not be completed",
        phase: context.phase,
        kind: isTimeout ? "timeout" : "transport",
        attemptId: context.attemptId,
        clientRequestId,
        loginRequestId: context.loginRequestId,
        credentialValidated: context.credentialValidated,
      });
    }
  }

  async function currentSession(context: LoginRequestContext = {}): Promise<CurrentSessionResponseDto> {
    const requestContext = { ...context, phase: context.phase ?? "session_get" as const };
    const { response, clientRequestId } = await fetchWithContext(`${apiBase}/api/v1/auth/session`, {
      method: "GET",
      credentials: "include",
    }, requestContext);
    return parseResponse("GET /api/v1/auth/session", response, { ...requestContext, clientRequestId });
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

  async function throwResponseError(response: Response, context: LoginRequestContext & { clientRequestId?: string } = {}): Promise<never> {
    throw await responseError(response, context);
  }

  return {
    async login(input, context = {}) {
      const requestContext = { ...context, phase: "login_post" as const, attemptId: context.attemptId ?? requestId() };
      const { response, clientRequestId } = await fetchWithContext(`${apiBase}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      }, requestContext);
      await parseResponse("POST /api/v1/auth/login", response, { ...requestContext, clientRequestId });
      return currentSession({
        attemptId: requestContext.attemptId,
        phase: "session_get",
        credentialValidated: true,
        loginRequestId: clientRequestId,
      });
    },
    async changePassword(newPassword) {
      const csrfToken = requireCsrfToken("Password change");
      const { response, clientRequestId } = await fetchWithContext(`${apiBase}/api/v1/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ newPassword }),
      }, { phase: "session_get" });
      await parseResponse("POST /api/v1/auth/change-password", response, { phase: "session_get", clientRequestId });
      return currentSession({ credentialValidated: true });
    },
    async logout() {
      const csrfToken = requireCsrfToken("Logout");
      const { response, clientRequestId } = await fetchWithContext(`${apiBase}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      }, { phase: "session_get" });
      if (!response.ok) await throwResponseError(response, { phase: "session_get", clientRequestId });
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
