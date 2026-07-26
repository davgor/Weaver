import { describe, expect, it } from 'vitest'
import {
  applyDamageModifiers,
  computeMaxHp,
  getAbilityModifier,
  isDamageType,
  listDamageTypes
} from '@weaver/character-engine'
import {
  getBestiaryEntry,
  hydrateBestiaryEntry,
  hydrateCombatantFromFoe
} from '../index.js'

describe('EnemyEngine -> CharacterEngine contract', () => {
  it('hydrates bestiary and combatant HP through the real CharacterEngine formula', () => {
    const entry = requireEntry('skeleton-warrior')
    const hydrated = hydrateBestiaryEntry(entry)
    const combatant = hydrateCombatantFromFoe({
      foeId: 'contract-skeleton-1',
      bestiaryId: entry.bestiaryId
    })

    const expectedHp = computeMaxHp(
      entry.hp.hitDie,
      entry.hp.level,
      getAbilityModifier(entry.abilityScores.Body),
      entry.hp.rolls
    )
    expect(hydrated.hp.max).toBe(expectedHp)
    expect(combatant.hp.max).toBe(expectedHp)
  })

  it('keeps bestiary damage types inside CharacterEngine taxonomy', () => {
    const knownTypes = listDamageTypes()
    const entry = requireEntry('ember-drake-wyrmling')

    expect(entry.damageTypes.dealt.every(isDamageType)).toBe(true)
    expect(entry.damageTypes.resisted.every(isDamageType)).toBe(true)
    expect(knownTypes).toContain('Fire')
    expect(applyDamageModifiers(10, {
      damageType: 'Fire',
      resistances: entry.damageTypes.resisted,
      vulnerabilities: []
    })).toBe(5)
  })
})

function requireEntry(bestiaryId: string) {
  const entry = getBestiaryEntry(bestiaryId)
  if (entry === undefined) {
    throw new Error(`Missing bestiary entry: ${bestiaryId}`)
  }
  return entry
}
