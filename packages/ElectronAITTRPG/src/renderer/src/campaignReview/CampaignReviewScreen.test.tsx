import { describe, expect, it } from 'vitest'
import { canEnterOnboarding } from '../campaignCreate/reviewGate'

describe('campaign review flow', () => {
  it('blocks continue until review confirmation', () => {
    expect(canEnterOnboarding(false)).toBe(false)
    expect(canEnterOnboarding(true)).toBe(true)
  })
})
