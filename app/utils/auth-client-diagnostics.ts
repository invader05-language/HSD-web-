import type { LoginFailureKind, LoginPhase } from "../services/api-session.gateway";

export interface AuthClientDiagnosticInput {
  buildId?: string;
  phase: LoginPhase;
  kind: LoginFailureKind;
  status?: number;
  code?: string;
  attemptId?: string;
  requestId?: string;
  loginRequestId?: string;
  credentialValidated: boolean;
  apiProtocol?: string;
  route?: string;
  navigationType?: string;
}

export interface AuthClientDiagnostic extends AuthClientDiagnosticInput {
  at: string;
  route: string;
}

const MAX_EVENTS = 20;
const events: AuthClientDiagnostic[] = [];

function safeRoute(route: string | undefined): string {
  const path = (route || "/").split(/[?#]/, 1)[0] || "/";
  if (/^\/admin\/recruitment\/batches\/[^/]+\/applications\/[^/]+/.test(path)) {
    return "/admin/recruitment/batches/:batchId/applications/:id";
  }
  return path.replace(/\/([0-9a-f]{8}-[0-9a-f-]{27,})(?=\/|$)/gi, "/:id");
}

export function recordAuthClientDiagnostic(input: AuthClientDiagnosticInput): AuthClientDiagnostic {
  const event: AuthClientDiagnostic = {
    at: new Date().toISOString(),
    buildId: input.buildId,
    phase: input.phase,
    kind: input.kind,
    status: input.status,
    code: input.code,
    attemptId: input.attemptId,
    requestId: input.requestId,
    loginRequestId: input.loginRequestId,
    credentialValidated: input.credentialValidated,
    apiProtocol: input.apiProtocol,
    route: safeRoute(input.route),
    navigationType: input.navigationType,
  };
  events.push(event);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  return event;
}

export function getAuthClientDiagnostics(): AuthClientDiagnostic[] {
  return events.map((event) => ({ ...event }));
}

export function formatAuthClientDiagnostics(): string {
  return JSON.stringify(getAuthClientDiagnostics(), null, 2);
}

export function clearAuthClientDiagnostics(): void {
  events.splice(0, events.length);
}
