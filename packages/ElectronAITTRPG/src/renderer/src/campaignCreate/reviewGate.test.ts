import { describe, expect, it } from 'vitest'
import { assertReviewConfirmed, canEnterOnboarding } from './reviewGate.js'

describe('reviewGate', () => {
  it('blocks onboarding until review is explicitly confirmed', () => {
    expect(canEnterOnboarding(false)).toBe(false)
    expect(canEnterOnboarding(true)).toBe(true)
    expect(() => assertReviewConfirmed(false)).toThrow(/confirmed/i)
    expect(() => assertReviewConfirmed(true)).not.toThrow()
  })
})
