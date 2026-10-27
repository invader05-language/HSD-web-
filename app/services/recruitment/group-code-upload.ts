import type { AdminGroupCodeReferenceDto, GroupCodeListDto, GroupCodeReferenceDto, UploadIntentResponseDto, UploadResponseDto } from '../../../packages/api-client/src';
import { sha256File } from '../../utils/sha256';

export type GroupCodeUploadPhase = 'validating' | 'uploading' | 'checking' | 'saving' | 'confirming' | 'saved';
export interface GroupCodeUploadTask {
  batchId: string; centerId: string; round: number; expectedVersion: number;
  uploadId: string; uploadVersion: number; etag: string;
}
export interface GroupCodeUploadOptions {
  signal?: AbortSignal;
  onProgress?: (event: { phase: GroupCodeUploadPhase; uploadId?: string }) => void;
}
export class GroupCodeUploadError extends Error {
  constructor(readonly code: string, message: string, readonly status = 0, readonly task?: GroupCodeUploadTask) { super(message); }
}
export interface GroupCodeUploadClient {
  apiBase: string;
  fetcher: typeof fetch;
  intent(batchId: string, centerId: string, round: number, body: unknown, signal: AbortSignal): Promise<UploadIntentResponseDto>;
  complete(task: GroupCodeUploadTask, signal: AbortSignal): Promise<UploadResponseDto>;
  status(uploadId: string, signal: AbortSignal): Promise<UploadResponseDto>;
  configuration(batchId: string, signal: AbortSignal): Promise<GroupCodeListDto>;
  bind(task: GroupCodeUploadTask, signal: AbortSignal): Promise<GroupCodeReferenceDto>;
}
const statusOf = (cause: unknown) => (cause as { status?: number })?.status ?? 0;
const uncertain = (cause: unknown) => !statusOf(cause) || statusOf(cause) >= 500;
function signal(options: GroupCodeUploadOptions) {
  return options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
}
function progress(options: GroupCodeUploadOptions, phase: GroupCodeUploadPhase, task?: GroupCodeUploadTask) {
  options.signal?.throwIfAborted(); options.onProgress?.({ phase, ...(task ? { uploadId: task.uploadId } : {}) });
}
function pending(task: GroupCodeUploadTask) { return new GroupCodeUploadError('GROUP_CODE_SAVE_PENDING', '保存状态待确认，请点击“检查保存状态”；无需重新选择图片。', 0, task); }
function wait(options: GroupCodeUploadOptions) {
  return new Promise<void>((resolve, reject) => {
    options.signal?.throwIfAborted();
    const timer = setTimeout(() => { options.signal?.removeEventListener('abort', abort); resolve(); }, 1000);
    const abort = () => { clearTimeout(timer); reject(options.signal?.reason); };
    options.signal?.addEventListener('abort', abort, { once: true });
  });
}
function assertTerminal(current: UploadResponseDto) {
  if (current.status === 'failed' || current.status === 'expired') throw new GroupCodeUploadError(current.failureCode || 'UPLOAD_PROCESSING_FAILED', '图片处理失败，请重新选择图片。', 422);
}
async function ready(client: GroupCodeUploadClient, task: GroupCodeUploadTask, options: GroupCodeUploadOptions, current?: UploadResponseDto) {
  const deadline = Date.now() + 60000;
  for (;;) {
    options.signal?.throwIfAborted();
    if (!current) {
      try { current = await client.status(task.uploadId, signal(options)); }
      catch (cause) { if (!uncertain(cause)) throw cause; throw pending(task); }
    }
    assertTerminal(current);
    if (current.status === 'ready') return;
    if (current.status === 'uploading' || Date.now() >= deadline) throw pending(task);
    await wait(options); current = undefined;
  }
}
async function configured(client: GroupCodeUploadClient, task: GroupCodeUploadTask, options: GroupCodeUploadOptions): Promise<AdminGroupCodeReferenceDto | undefined> {
  let data: GroupCodeListDto;
  try { data = await client.configuration(task.batchId, signal(options)); }
  catch (cause) { if (!uncertain(cause)) throw cause; throw pending(task); }
  const code = data.centers.find(c => c.id === task.centerId)?.rounds.find(c => c.round === task.round);
  if (code?.status === 'READY' && code.uploadId === task.uploadId) return code;
  if (!code || code.version !== task.expectedVersion) throw new GroupCodeUploadError('GROUP_CODE_VERSION_CONFLICT', '配置已由其他管理员更新，请刷新后重新确认。', 409);
}
async function save(client: GroupCodeUploadClient, task: GroupCodeUploadTask, options: GroupCodeUploadOptions) {
  progress(options, 'saving', task);
  try { await client.bind(task, signal(options)); }
  catch (cause) { if (!uncertain(cause)) throw cause; }
  progress(options, 'confirming', task);
  const code = await configured(client, task, options);
  if (!code) throw pending(task);
  progress(options, 'saved', task); return code;
}
export async function resumeGroupCodeUpload(client: GroupCodeUploadClient, task: GroupCodeUploadTask, options: GroupCodeUploadOptions = {}) {
  progress(options, 'confirming', task);
  const saved = await configured(client, task, options);
  if (saved) { progress(options, 'saved', task); return saved; }
  progress(options, 'checking', task);
  let current: UploadResponseDto | undefined;
  try { current = await client.status(task.uploadId, signal(options)); }
  catch (cause) { if (!uncertain(cause)) throw cause; throw pending(task); }
  assertTerminal(current);
  if (current.status === 'uploading') {
    try { current = await client.complete(task, signal(options)); }
    catch (cause) { if (!uncertain(cause) && statusOf(cause) !== 409) throw cause; current = undefined; }
  }
  await ready(client, task, options, current);
  return save(client, task, options);
}
export async function uploadGroupCode(client: GroupCodeUploadClient, batchId: string, centerId: string, round: number, expectedVersion: number, file: File, options: GroupCodeUploadOptions = {}) {
  progress(options, 'validating');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size < 1) throw new GroupCodeUploadError('GROUP_CODE_FILE_INVALID', '请选择不超过5MiB的PNG、JPEG或WebP图片。', 422);
  const checksum = await sha256File(file);
  const intent = await client.intent(batchId, centerId, round, { expectedVersion: 0, fileName: file.name, kind: 'image', mimeType: file.type, byteSize: file.size, checksumSha256: checksum }, signal(options));
  let destination: URL;
  try { destination = new URL(intent.upload.url, client.apiBase || globalThis.location?.origin); }
  catch { throw new GroupCodeUploadError('GROUP_CODE_UPLOAD_DESTINATION_INVALID', '上传入口异常，请联系管理员。', 503); }
  if (destination.protocol !== 'https:' && (client.apiBase.startsWith('https:') || globalThis.location?.protocol === 'https:')) throw new GroupCodeUploadError('GROUP_CODE_UPLOAD_HTTPS_REQUIRED', '上传入口未启用HTTPS，请联系管理员修复。', 503);
  if (!['http:', 'https:'].includes(destination.protocol)) throw new GroupCodeUploadError('GROUP_CODE_UPLOAD_DESTINATION_INVALID', '上传入口异常，请联系管理员。', 503);
  const task = { batchId, centerId, round, expectedVersion, uploadId: intent.id, uploadVersion: intent.version, etag: '' };
  progress(options, 'uploading', task);
  let storage: Response;
  // Native Window.fetch rejects a custom object as its receiver.
  const fetcher = client.fetcher;
  try { storage = await fetcher(destination.href, { method: 'PUT', body: file, headers: intent.upload.headers, signal: signal(options) }); }
  catch { options.signal?.throwIfAborted(); throw new GroupCodeUploadError('DIRECT_UPLOAD_NETWORK_FAILED', '文件未完成上传，请检查网络后重新上传；持续失败请联系管理员检查上传入口。', 0); }
  if (!storage.ok) throw new GroupCodeUploadError('DIRECT_UPLOAD_FAILED', '存储服务未接收文件，请重试上传。', storage.status);
  task.etag = storage.headers.get('etag') ?? 'direct-upload';
  progress(options, 'checking', task);
  let current: UploadResponseDto | undefined;
  try { current = await client.complete(task, signal(options)); }
  catch (cause) { if (!uncertain(cause) && statusOf(cause) !== 409) throw cause; }
  await ready(client, task, options, current);
  return save(client, task, options);
}
