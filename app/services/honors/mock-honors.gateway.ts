import { HONOR_REVIEW_RECORDS } from '../../data/admin-members'

type HonorStatus = 'pending' | 'approved' | 'rejected'

export interface MockHonorRecord {
  id: string
  publicId: string
  personId: string
  centerId: string
  memberName: string
  title: string
  type: string
  description: string
  awardedAt: string
  awardedDatePrecision: 'day' | 'month' | 'year' | 'unknown'
  awardedDateLabel: string
  proofReference: string
  publicConsent: boolean
  status: HonorStatus
  version: number
  submittedAt: string
}

function cloneRecords(): MockHonorRecord[] {
  return HONOR_REVIEW_RECORDS.map((record, index) => ({
    id: String(record.id),
    publicId: `mock-honor-${String(record.id)}`,
    personId: `mock-person-${index + 1}`,
    centerId: `mock-center-${index + 1}`,
    memberName: record.member,
    title: record.title,
    type: record.type,
    description: '',
    awardedAt: '2026-08-01',
    awardedDatePrecision: 'day',
    awardedDateLabel: '2026年8月1日',
    proofReference: record.proof,
    publicConsent: record.consent,
    status: record.status === '已通过' ? 'approved' : 'pending',
    version: 1,
    submittedAt: record.submittedAt,
  }))
}

function conflict(): never {
  throw new Error('MOCK_HONORS_VERSION_CONFLICT')
}

export function createMockHonorsGateway() {
  const records = cloneRecords()
  const memberId = records[0]?.personId

  const find = (id: string) => records.find((record) => record.id === id)
  const assertVersion = (record: MockHonorRecord | undefined, expectedVersion: number) => {
    if (!record || record.version !== expectedVersion) conflict()
    return record
  }

  return {
    async listAdmin() { return { items: records.map((record) => ({ ...record })) } },
    async listMine() { return { items: records.filter((record) => record.personId === memberId).map((record) => ({ ...record })) } },
    async approve(id: string, expectedVersion: number) {
      const record = assertVersion(find(id), expectedVersion)
      record.status = 'approved'
      record.version += 1
      return { ...record }
    },
    async softDelete(publicId: string, expectedVersion: number) {
      const index = records.findIndex((record) => record.publicId === publicId)
      const record = assertVersion(records[index], expectedVersion)
      records.splice(index, 1)
      return { id: record.id, type: 'honor', title: record.title, version: record.version + 1 }
    },
    async submit(input: Omit<MockHonorRecord, 'id' | 'publicId' | 'personId' | 'centerId' | 'memberName' | 'status' | 'version' | 'submittedAt' | 'awardedDatePrecision' | 'awardedDateLabel'> & { expectedVersion: number }) {
      if (input.expectedVersion !== 0) conflict()
      const next = records.length + 1
      const record: MockHonorRecord = {
        id: `mock-honor-${next}`,
        publicId: `mock-honor-${next}`,
        personId: memberId ?? 'mock-person-member',
        centerId: 'mock-center-member',
        memberName: '模拟成员',
        title: input.title,
        type: input.type,
        description: input.description,
        awardedAt: input.awardedAt,
        awardedDatePrecision: 'day',
        awardedDateLabel: '2026年8月1日',
        proofReference: input.proofReference,
        publicConsent: input.publicConsent,
        status: 'pending',
        version: 1,
        submittedAt: new Date().toISOString(),
      }
      records.push(record)
      return { ...record }
    },
    async updateConsent(id: string, expectedVersion: number, publicConsent: boolean) {
      const record = assertVersion(find(id), expectedVersion)
      if (record.personId !== memberId) throw new Error('FORBIDDEN')
      record.publicConsent = publicConsent
      record.version += 1
      return { ...record }
    },
  }
}
