import { describe, expect, it } from 'vitest'
import { canPlayFromReview } from './reviewGate'
import type { VnStoryReviewSnapshot } from '../../../shared/story/types'

describe('canPlayFromReview', () => {
  it('requires ready status and explicit confirmation', () => {
    expect(canPlayFromReview(base({ confirmed: false }))).toBe(false)
    expect(canPlayFromReview(base({ status: 'generating', confirmed: true }))).toBe(false)
    expect(canPlayFromReview(base({ confirmed: true }))).toBe(true)
  })
})

function base(overrides: Partial<VnStoryReviewSnapshot>): VnStoryReviewSnapshot {
  return {
    campaignId: 'vn-1',
    status: 'ready',
    confirmed: false,
    premiseSummary: 'x',
    mainCharacter: { name: 'Ryn', personality: 'stubborn', appearance: 'coat' },
    acts: [],
    cast: [],
    openingBeat: '',
    overviewProse: '',
    actCount: 3,
    ...overrides
  }
}
