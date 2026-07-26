import { describe, expect, it } from 'vitest'
import {
  DAMAGE_TYPES,
  applyDamageModifiers,
  isDamageType,
  listDamageTypes
} from './damageTypes.js'

describe('CharacterEngine damage types', () => {
  it('exposes the five canonical damage types', () => {
    expect(listDamageTypes()).toEqual(['Physical', 'Fire', 'Cold', 'Poison', 'Arcane'])
    for (const damageType of DAMAGE_TYPES) {
      expect(isDamageType(damageType)).toBe(true)
    }
    expect(isDamageType('Psychic')).toBe(false)
  })

  it('applies resistance then vulnerability multipliers', () => {
    expect(
      applyDamageModifiers(10, {
        damageType: 'Fire',
        resistances: ['Fire'],
        vulnerabilities: []
      })
    ).toBe(5)

    expect(
      applyDamageModifiers(10, {
        damageType: 'Cold',
        resistances: [],
        vulnerabilities: ['Cold']
      })
    ).toBe(20)

    expect(
      applyDamageModifiers(10, {
        damageType: 'Poison',
        resistances: ['Poison'],
        vulnerabilities: ['Poison']
      })
    ).toBe(10)

    expect(
      applyDamageModifiers(7, {
        damageType: 'Physical',
        resistances: ['Fire'],
        vulnerabilities: ['Arcane']
      })
    ).toBe(7)
  })
})
