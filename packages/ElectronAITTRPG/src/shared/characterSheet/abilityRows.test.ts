import { describe, expect, it } from 'vitest'
import { buildAbilityRows, formatModifier } from './abilityRows.js'

describe('ability rows', () => {
  it('builds score + modifier rows via injected CharacterEngine modifier', () => {
    const rows = buildAbilityRows(
      { Body: 14, Agility: 12, Mind: 10, Presence: 8 },
      (score) => Math.floor((score - 10) / 2)
    )
    expect(rows).toEqual([
      { ability: 'Body', score: 14, modifier: 2 },
      { ability: 'Agility', score: 12, modifier: 1 },
      { ability: 'Mind', score: 10, modifier: 0 },
      { ability: 'Presence', score: 8, modifier: -1 }
    ])
  })

  it('formats modifiers with an explicit sign', () => {
    expect(formatModifier(2)).toBe('+2')
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(-1)).toBe('-1')
  })
})
