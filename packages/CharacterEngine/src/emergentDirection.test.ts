import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearEmergentDirectionStore,
  detectEmergentDirection,
  getArchetypePlayKit,
  recordTaggedPlayPattern
} from './emergentDirection.js'

describe('emergentDirection', () => {
  beforeEach(() => {
    clearEmergentDirectionStore()
  })

  it('exposes archetype play kits used to detect out-of-kit patterns', () => {
    expect(getArchetypePlayKit('Fighter')).toContain('melee')
    expect(getArchetypePlayKit('Mage')).toContain('spell')
  })

  it('returns no emergent direction below the repeat threshold', () => {
    for (let count = 0; count < 4; count += 1) {
      recordTaggedPlayPattern('pc-emergent', 'stealth')
    }
    expect(detectEmergentDirection('pc-emergent', 'Fighter')).toBeUndefined()
  })

  it('returns at most one emergent custom feature when a tag repeats outside the kit', () => {
    for (let count = 0; count < 5; count += 1) {
      recordTaggedPlayPattern('pc-emergent', 'stealth')
    }
    const emergent = detectEmergentDirection('pc-emergent', 'Fighter')
    expect(emergent).toMatchObject({
      templateId: 'emergent.custom_passive',
      kind: 'custom_feature',
      playTag: 'stealth'
    })
    expect(detectEmergentDirection('pc-emergent', 'Fighter')).toEqual(emergent)
  })

  it('ignores in-kit repeated tags', () => {
    for (let count = 0; count < 6; count += 1) {
      recordTaggedPlayPattern('pc-kit', 'melee')
    }
    expect(detectEmergentDirection('pc-kit', 'Fighter')).toBeUndefined()
  })

  it('rejects empty character ids and tags', () => {
    expect(() => recordTaggedPlayPattern('  ', 'stealth')).toThrow(/characterId/i)
    expect(() => recordTaggedPlayPattern('pc-1', '  ')).toThrow(/tag/i)
  })
})
