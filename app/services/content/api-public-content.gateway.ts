import type {
  PublicContentListResponseDto,
  PublicContentResponseDto,
} from "../../../packages/api-client/src";

export interface PublicContentGateway {
  list(): Promise<PublicContentListResponseDto>;
  getBySlug(slug: string): Promise<PublicContentResponseDto>;
}

export interface ApiPublicContentGatewayOptions {
  apiBase: string;
  fetcher?: typeof globalThis.fetch;
  createRequestId?: () => string;
}

export class ContentApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(input: { status: number; code: string; message: string; requestId?: string }) {
    super(input.message);
    this.name = "ContentApiError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
  }
}

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPublicContent(value: unknown): value is PublicContentResponseDto {
  if (!isRecord(value)) return false;
  if (typeof value.slug !== "string" || !["flash", "article", "notice"].includes(String(value.kind))) return false;
  if (typeof value.title !== "string" || !Array.isArray(value.blocks)) return false;
  if (value.summary !== null && typeof value.summary !== "string") return false;
  if (value.tag !== null && typeof value.tag !== "string") return false;
  if (value.expiresAt !== null && typeof value.expiresAt !== "string") return false;
  if (value.publishedAt !== null && typeof value.publishedAt !== "string") return false;
  return value.blocks.every((block) => {
    if (!isRecord(block) || !["heading", "paragraph", "image"].includes(String(block.type))) return false;
    if (block.type === "heading") return [2, 3].includes(Number(block.level)) && typeof block.text === "string";
    if (block.type === "paragraph") return typeof block.text === "string";
    return typeof block.url === "string" && typeof block.alt === "string"
      && (block.caption === undefined || typeof block.caption === "string");
  });
}

function isErrorPayload(value: unknown): value is { code: string; message: string; requestId?: string } {
  return isRecord(value) && typeof value.code === "string" && typeof value.message === "string"
    && (value.requestId === undefined || typeof value.requestId === "string");
}

export function createApiPublicContentGateway(options: ApiPublicContentGatewayOptions): PublicContentGateway {
  const apiBase = options.apiBase.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? globalThis.fetch;
  const createRequestId = options.createRequestId ?? requestId;

  async function read(path: string): Promise<unknown> {
    const response = await fetcher(`${apiBase}${path}`, {
      method: "GET",
      credentials: "include",
      headers: { "X-Request-ID": createRequestId() },
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new ContentApiError({
        status: response.status,
        code: isErrorPayload(payload) ? payload.code : "PUBLIC_CONTENT_REQUEST_FAILED",
        message: isErrorPayload(payload) ? payload.message : "Public content request failed",
        ...(isErrorPayload(payload) && payload.requestId ? { requestId: payload.requestId } : {}),
      });
    }
    return payload;
  }

  return {
    async list() {
      const payload = await read("/api/v1/public/content");
      if (!isRecord(payload) || !Array.isArray(payload.items) || !payload.items.every(isPublicContent)) {
        throw new Error("PUBLIC_CONTENT_LIST_RESPONSE_CONTRACT_MISMATCH");
      }
      return payload as PublicContentListResponseDto;
    },
    async getBySlug(slug) {
      const payload = await read(`/api/v1/public/content/${encodeURIComponent(slug)}`);
      if (!isPublicContent(payload)) throw new Error("PUBLIC_CONTENT_RESPONSE_CONTRACT_MISMATCH");
      return payload;
    },
  };
}
