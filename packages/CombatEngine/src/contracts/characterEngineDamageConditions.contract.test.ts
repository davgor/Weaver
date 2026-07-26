import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONDITION_EFFECTS,
  applyDamageModifiers,
  clearCharacterStatsStore,
  getCharacterStats,
  mergeConditionEffects,
  restoreCharacterStats
} from '@weaver/character-engine'
import { resolveAttackAgainstCombatants } from '../attackResolution.js'
import type { EncounterCombatant } from '../types.js'

describe('CombatEngine CharacterEngine condition contract', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
  })

  it('uses real CharacterEngine condition effects and damage modifiers during attacks', () => {
    const expected = expectedMixedDamage()
    const result = resolveAttackAgainstCombatants(mixedAttackInput(), {
      roller: sequence([18, 7]),
      getWeaponDamageProfile: () => mixedProfile()
    })
    expect(CONDITION_EFFECTS.Prone.attackRollMode).toBe('disadvantage')
    expect(mergeConditionEffects(['Restrained']).attacksAgainst).toBe('advantage')
    expect(result.attack.rollMode).toBe('normal')
    expect(mergeConditionEffects(['Prone']).attackRollMode).toBe('disadvantage')
    expect(result.damage).toEqual(expected)
  })
})

describe('CombatEngine CharacterEngine dying contract', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
  })

  it('uses real CharacterEngine HP damage to create Unconscious dying state', () => {
    restoreCharacterStats({
      characterId: 'pc-contract',
      maxHp: 8,
      currentHp: 2,
      conditions: [],
      dying: null
    })
    const result = resolveAttackAgainstCombatants(dyingAttackInput(), {
      roller: sequence([12]),
      getWeaponDamageProfile: () => ({
        damageComponents: [{ damageType: 'Physical', amount: 3 }],
        onHitEffectIds: []
      })
    })
    expect(result.target.characterConditions).toEqual(['Prone', 'Unconscious'])
    expect(result.target.dying).toEqual({ successes: 0, failures: 0, stable: false })
    expect(getCharacterStats('pc-contract')).toMatchObject({
      currentHp: 0,
      conditions: ['Prone', 'Unconscious'],
      dying: { successes: 0, failures: 0, stable: false }
    })
  })
})

function expectedMixedDamage() {
  return [
    {
      damageType: 'Physical',
      baseAmount: 6,
      finalAmount: applyDamageModifiers(6, {
        damageType: 'Physical',
        resistances: ['Fire'],
        vulnerabilities: ['Physical']
      })
    },
    {
      damageType: 'Fire',
      baseAmount: 4,
      finalAmount: applyDamageModifiers(4, {
        damageType: 'Fire',
        resistances: ['Fire'],
        vulnerabilities: ['Physical']
      })
    }
  ]
}

function mixedAttackInput() {
  return {
    attacker: combatant({ id: 'hero', kind: 'character', characterConditions: ['Prone'] }),
    target: combatant({
      id: 'restrained-foe',
      kind: 'enemy',
      armorClass: 10,
      hp: { current: 30, max: 30 },
      characterConditions: ['Restrained'],
      damageResistances: ['Fire'],
      damageVulnerabilities: ['Physical']
    }),
    weaponInstanceId: 'weapon.contract',
    attackAbility: 'Body' as const,
    proficient: false,
    proficiencyBonus: 0
  }
}

function dyingAttackInput() {
  return {
    attacker: combatant({ id: 'skeleton', kind: 'enemy' }),
    target: combatant({
      id: 'pc-contract',
      kind: 'character',
      armorClass: 10,
      hp: { current: 2, max: 8 }
    }),
    weaponInstanceId: 'weapon.contract',
    attackAbility: 'Body' as const,
    proficient: false,
    proficiencyBonus: 0
  }
}

function mixedProfile() {
  return {
    damageComponents: [
      { damageType: 'Physical' as const, amount: 6 },
      { damageType: 'Fire' as const, amount: 4 }
    ],
    onHitEffectIds: []
  }
}

function combatant(
  overrides: Partial<EncounterCombatant> & Pick<EncounterCombatant, 'id' | 'kind'>
): EncounterCombatant {
  return {
    id: overrides.id,
    kind: overrides.kind,
    abilityScores: overrides.abilityScores ?? { Body: 14, Agility: 10, Mind: 10, Presence: 10 },
    initiative: overrides.initiative ?? { roll: 10, modifier: 0, total: 10 },
    conditions: overrides.conditions ?? [],
    characterConditions: overrides.characterConditions ?? [],
    damageResistances: overrides.damageResistances ?? [],
    damageVulnerabilities: overrides.damageVulnerabilities ?? [],
    ...optionalCombatantFields(overrides)
  }
}

function optionalCombatantFields(overrides: Partial<EncounterCombatant>): Partial<EncounterCombatant> {
  return {
    ...(overrides.hp === undefined ? {} : { hp: overrides.hp }),
    ...(overrides.armorClass === undefined ? {} : { armorClass: overrides.armorClass }),
    ...(overrides.dying === undefined ? {} : { dying: overrides.dying })
  }
}

function sequence(rolls: number[]): () => number {
  return () => rolls.shift() ?? 1
}
