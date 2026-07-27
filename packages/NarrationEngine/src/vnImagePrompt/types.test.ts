import { describe, expect, it } from 'vitest'
import {
  assertVnCharacterIdentitySeed,
  assertVnExpression,
  assertVnStance,
  validateVnCharacterIdentitySeed,
  VN_EXPRESSIONS,
  VN_STANCES
} from '../index.js'

describe('VN image prompt types', () => {
  it('exports closed stance and expression vocabularies', () => {
    expect(VN_STANCES).toEqual(
      expect.arrayContaining(['Standing', 'Sitting', 'Kneeling', 'Fighting'])
    )
    expect(VN_EXPRESSIONS).toEqual(
      expect.arrayContaining(['Neutral', 'Angry', 'Happy', 'Sad', 'Surprised'])
    )
  })

  it('rejects unknown stance and expression values', () => {
    expect(assertVnStance('Standing')).toBe('Standing')
    expect(assertVnExpression('Angry')).toBe('Angry')
    expect(() => assertVnStance('Floating')).toThrow(/stance/i)
    expect(() => assertVnExpression('Smug')).toThrow(/expression/i)
  })

  it('rejects identity seeds missing stable key, display name, or appearance', () => {
    const result = validateVnCharacterIdentitySeed({
      characterKey: '  ',
      displayName: '',
      appearance: '\t'
    })

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      'characterKey is required',
      'displayName is required',
      'appearance is required'
    ])
    expect(() => assertVnCharacterIdentitySeed(result.identity)).toThrow(/characterKey/i)
  })
})
