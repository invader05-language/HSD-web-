import type { RecycleItemResponseDto } from '../../../packages/api-client/src'
const fixtures: RecycleItemResponseDto[] = [{ id: 'hon_mock_recycle_1', type: 'honor', title: 'Mock 可恢复荣誉', centerName: '人才发展中心', deletedAt: '2026-08-10T08:00:00.000Z', retentionEndsAt: '2026-09-09T08:00:00.000Z', version: 2, restoreEligible: true }, { id: 'hon_mock_recycle_2', type: 'honor', title: 'Mock 待永久删除荣誉', centerName: '新媒体中心', deletedAt: '2026-08-09T08:00:00.000Z', retentionEndsAt: '2026-09-08T08:00:00.000Z', version: 4, restoreEligible: true }]
export function createMockRecycleGateway() { let items = fixtures.map((item) => ({ ...item })); return {
  async list() { return { items: items.map((item) => ({ ...item })) } },
  async softDelete() { throw new Error('MOCK_RECYCLE_SOFT_DELETE_UNSUPPORTED') },
  async restore(id: string, version: number) { const item = items.find((record) => record.id === id && record.version === version); if (!item) throw new Error('MOCK_RECYCLE_VERSION_CONFLICT'); items = items.filter((record) => record.id !== id); return { ...item, deletedAt: null, retentionEndsAt: null, version: item.version + 1, restoreEligible: false as const } },
  async hardDelete(id: string, version: number, confirmed: boolean) { if (!confirmed) throw new Error('MOCK_RECYCLE_CONFIRMATION_REQUIRED'); const item = items.find((record) => record.id === id && record.version === version); if (!item) throw new Error('MOCK_RECYCLE_VERSION_CONFLICT'); items = items.filter((record) => record.id !== id); return { deleted: true, id } },
} }
