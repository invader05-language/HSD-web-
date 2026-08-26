import { describe, expect, it } from 'vitest'
import { isApiResponse } from '../../packages/api-client/src/generated'

describe('assessment API client contract', () => {
  it('accepts the expanded assessment workflow response without rejecting documented fields', () => {
    expect(isApiResponse('GET /api/v1/admin/recruitment/batches/{batchId}/assessments', {
      batch: { id: 'batch-1', name: 'Assessment batch', lifecycleStatus: 'closed' },
      currentRound: 1,
      status: 'ASSESSING',
      version: 1,
      publishedAt: null,
      pending: 0,
      adjustmentPending: 1,
      canAdvance: false,
      advanceBlocker: { code: 'ASSESSMENT_ADJUSTMENT_PENDING', count: 1 },
      nextAction: 'DECIDE_ADJUSTMENTS',
      items: [],
    })).toBe(true)
  })
})
