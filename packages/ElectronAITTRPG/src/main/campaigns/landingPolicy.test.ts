import { describe, expect, it } from 'vitest'
import { shouldLandOnHub } from './landingPolicy.js'

describe('campaign landing policy', () => {
  it('lands on the hub when any player character completed onboarding', () => {
    expect(
      shouldLandOnHub([
        { characterId: 'pc-1', phase: 'opening_scene' },
        { characterId: 'pc-2', phase: 'complete' }
      ])
    ).toBe(true)
  })

  it('does not land on the hub for empty or incomplete campaigns', () => {
    expect(shouldLandOnHub([])).toBe(false)
    expect(shouldLandOnHub([{ characterId: 'pc-1', phase: 'guided_identity' }])).toBe(false)
  })
})
