import { sha256File } from "../../utils/sha256";

export interface MemberAvatarUploadIntent {
  id: string;
  version: number;
  upload?: { url: string; headers: Record<string, string> };
}

export interface MemberAvatarUploadResult {
  assetId: string;
}

export interface MemberAvatarGateway {
  upload(file: File, centerId?: string): Promise<MemberAvatarUploadResult>;
  remove(): Promise<unknown>;
}

export interface ApiMemberAvatarGatewayOptions {
  apiBase: string;
  fetcher?: typeof globalThis.fetch;
  readCookie?: (name: string) => string | undefined;
  checksumSha256?: (file: File) => Promise<string>;
  createRequestId?: () => string;
}

export class MemberAvatarApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly requestId?: string) {
    super(message);
    this.name = "MemberAvatarApiError";
  }
}

const readBrowserCookie = (name: string) => {
  if (typeof document === "undefined") return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
};

const requestId = () => globalThis.crypto?.randomUUID?.() ?? `member-avatar-${Date.now()}`;
const defaultChecksum = sha256File;

function isError(value: unknown): value is { code: string; message: string; requestId?: string } {
  return Boolean(value && typeof value === "object" && typeof (value as { code?: unknown }).code === "string" && typeof (value as { message?: unknown }).message === "string");
}

export function createApiMemberAvatarGateway(options: ApiMemberAvatarGatewayOptions): MemberAvatarGateway {
  const apiBase = options.apiBase.replace(/\/+$/, "");
  const fetcher = options.fetcher ?? globalThis.fetch;
  const readCookie = options.readCookie ?? readBrowserCookie;
  const checksumSha256 = options.checksumSha256 ?? defaultChecksum;
  const createRequestId = options.createRequestId ?? requestId;

  async function request<T>(path: string, method: "POST" | "DELETE", body?: unknown): Promise<T> {
    const csrf = readCookie("hsd_csrf");
    if (!csrf) throw new MemberAvatarApiError(403, "MEMBER_AVATAR_CSRF_TOKEN_MISSING", "头像请求无法完成安全校验");
    const response = await fetcher(`${apiBase}${path}`, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": decodeURIComponent(csrf),
        "X-Request-ID": createRequestId(),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload: unknown = await response.json();
    if (!response.ok) throw new MemberAvatarApiError(
      response.status,
      isError(payload) ? payload.code : "MEMBER_AVATAR_API_REQUEST_FAILED",
      isError(payload) ? payload.message : "头像请求失败",
      isError(payload) ? payload.requestId : undefined,
    );
    return payload as T;
  }

  return {
    async upload(file: File, centerId?: string): Promise<MemberAvatarUploadResult> {
      let checksum: string;
      try {
        checksum = await checksumSha256(file);
      } catch (error) {
        throw new MemberAvatarApiError(422, "MEMBER_AVATAR_CHECKSUM_FAILED", error instanceof Error ? error.message : "Unable to calculate file checksum");
      }
      const intent = await request<MemberAvatarUploadIntent>("/api/v1/members/me/avatar/uploads/intents", "POST", {
        expectedVersion: 0,
        ...(centerId ? { centerId } : {}),
        fileName: file.name,
        mimeType: file.type,
        byteSize: file.size,
        checksumSha256: checksum,
        kind: "image",
      });
      if (!intent.upload?.url) throw new MemberAvatarApiError(503, "UPLOAD_DESTINATION_MISSING", "头像上传地址暂不可用");
      const storageResponse = await fetcher(intent.upload.url, {
        method: "PUT",
        body: file,
        headers: intent.upload.headers,
      });
      if (!storageResponse.ok) throw new MemberAvatarApiError(storageResponse.status, "DIRECT_UPLOAD_FAILED", "头像文件上传失败");
      return request<MemberAvatarUploadResult>(
        `/api/v1/members/me/avatar/uploads/${encodeURIComponent(intent.id)}/complete`,
        "POST",
        { expectedVersion: intent.version, parts: [{ partNumber: 1, etag: storageResponse.headers.get("etag") ?? "direct-upload" }] },
      );
    },
    remove(): Promise<unknown> {
      return request("/api/v1/members/me/avatar", "DELETE");
    },
  };
}
