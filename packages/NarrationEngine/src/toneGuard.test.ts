import { describe, expect, it } from 'vitest'
import { validateProseTone } from './toneGuard.js'

describe('validateProseTone', () => {
  it('accepts plain fantasy prose with no trademark jargon', () => {
    const result = validateProseTone('Lantern light pools across the cobbles as rain begins.')

    expect(result).toEqual({
      ok: true,
      violations: [],
      rewrites: [],
      prose: 'Lantern light pools across the cobbles as rain begins.'
    })
  })

  it('rewrites known trademark terms and accepts the guarded prose', () => {
    const result = validateProseTone('Your armor class keeps the beholder at bay.')

    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
    expect(result.prose).toBe('Your warding keeps the eye tyrant at bay.')
    expect(result.rewrites).toEqual([
      { from: 'armor class', to: 'warding' },
      { from: 'beholder', to: 'eye tyrant' }
    ])
  })

  it('rejects prose that still contains forbidden tabletop jargon after scrubbing', () => {
    const result = validateProseTone('Roll a d20 for initiative order in this encounter.')

    expect(result.ok).toBe(false)
    expect(result.violations).toEqual(expect.arrayContaining(['d20', 'initiative order']))
  })
})
