import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCharacterStatsStore,
  getCharacterStats,
  restoreCharacterStats
} from '@weaver/character-engine'
import type { WeaponDamageProfile } from '@weaver/item-engine'
import { resolveAttackAgainstCombatants } from './attackResolution.js'
import type { EncounterCombatant } from './types.js'

describe('attack hit math', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
  })

  it('resolves hits and misses with d20 + modifier + proficiency against AC', () => {
    const attacker = combatant({ id: 'hero', kind: 'character' })
    const target = combatant({
      id: 'goblin',
      kind: 'enemy',
      armorClass: 15,
      hp: { current: 20, max: 20 }
    })
    const hit = resolveAttackAgainstCombatants(baseAttack(attacker, target), deps([11], physicalWeapon(6)))
    const miss = resolveAttackAgainstCombatants(
      { ...baseAttack(attacker, target), proficient: false },
      deps([12], physicalWeapon(6))
    )
    expectHitTotals(hit, miss)
  })

  it('defines natural 1 as a miss and natural 20 as a critical that doubles damage', () => {
    const attacker = combatant({
      id: 'hero',
      kind: 'character',
      abilityScores: { Body: 20, Agility: 10, Mind: 10, Presence: 10 }
    })
    const target = combatant({
      id: 'skeleton',
      kind: 'enemy',
      armorClass: 5,
      hp: { current: 20, max: 20 },
      damageResistances: ['Fire']
    })
    const naturalOne = resolveAttackAgainstCombatants(
      { ...baseAttack(attacker, target), weaponInstanceId: 'weapon.flame', proficiencyBonus: 10 },
      deps([1], fireWeapon(6))
    )
    const critical = resolveAttackAgainstCombatants(
      { ...baseAttack(attacker, target), weaponInstanceId: 'weapon.flame', proficient: false, proficiencyBonus: 0 },
      deps([20], fireWeapon(6))
    )
    expectNatOneAndCrit(naturalOne, critical)
  })
})

describe('attack condition roll modes', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
  })

  it('uses CharacterEngine condition roll modes for attacker and target effects', () => {
    const disadvantaged = resolveAttackAgainstCombatants(
      baseAttack(proneAttacker(), guardTarget()),
      deps([18, 4], physicalWeapon(6))
    )
    const advantaged = resolveAttackAgainstCombatants(
      baseAttack(standingHero(), stunnedTarget()),
      deps([4, 18], physicalWeapon(6))
    )
    expect(disadvantaged.attack).toMatchObject({
      rollMode: 'disadvantage',
      rolls: [18, 4],
      selectedRoll: 4,
      hit: false
    })
    expect(advantaged.attack).toMatchObject({
      rollMode: 'advantage',
      rolls: [4, 18],
      selectedRoll: 18,
      hit: true
    })
  })
})

describe('attack resistance and vulnerability', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
  })

  it('applies resistance and vulnerability through CharacterEngine damage modifiers', () => {
    const result = resolveAttackAgainstCombatants(
      baseAttack(combatant({ id: 'hero', kind: 'character' }), elementalTarget(), 'weapon.mixed'),
      deps([15], mixedWeaponProfile())
    )
    expect(result.damage).toEqual([
      { damageType: 'Physical', baseAmount: 5, finalAmount: 10 },
      { damageType: 'Fire', baseAmount: 4, finalAmount: 2 }
    ])
    expect(result.totalDamage).toBe(12)
    expect(result.target.hp).toEqual({ current: 18, max: 30 })
  })
})

describe('attack zero-hp transition', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
  })

  it('uses CharacterEngine hit point damage to enter Unconscious and dying at 0 HP', () => {
    restoreCharacterStats({
      characterId: 'hero-target',
      maxHp: 10,
      currentHp: 3,
      conditions: [],
      dying: null
    })
    const result = resolveAttackAgainstCombatants(
      baseAttack(
        combatant({ id: 'goblin', kind: 'enemy' }),
        combatant({
          id: 'hero-target',
          kind: 'character',
          armorClass: 10,
          hp: { current: 3, max: 10 }
        })
      ),
      deps([12], physicalWeapon(5))
    )
    expect(result.target.hp).toEqual({ current: 0, max: 10 })
    expect(result.target.characterConditions).toEqual(['Prone', 'Unconscious'])
    expect(result.target.dying).toEqual({ successes: 0, failures: 0, stable: false })
    expect(getCharacterStats('hero-target')).toMatchObject({
      currentHp: 0,
      conditions: ['Prone', 'Unconscious'],
      dying: { successes: 0, failures: 0, stable: false }
    })
  })
})

function expectHitTotals(
  hit: ReturnType<typeof resolveAttackAgainstCombatants>,
  miss: ReturnType<typeof resolveAttackAgainstCombatants>
): void {
  expect(hit.attack).toMatchObject({
    selectedRoll: 11,
    abilityModifier: 2,
    proficiencyBonusApplied: 2,
    total: 15,
    hit: true
  })
  expect(hit.totalDamage).toBe(6)
  expect(hit.target.hp).toEqual({ current: 14, max: 20 })
  expect(miss.attack).toMatchObject({
    selectedRoll: 12,
    proficiencyBonusApplied: 0,
    total: 14,
    hit: false
  })
  expect(miss.totalDamage).toBe(0)
  expect(miss.target.hp).toEqual({ current: 20, max: 20 })
}

function expectNatOneAndCrit(
  naturalOne: ReturnType<typeof resolveAttackAgainstCombatants>,
  critical: ReturnType<typeof resolveAttackAgainstCombatants>
): void {
  expect(naturalOne.attack).toMatchObject({ selectedRoll: 1, naturalOne: true, hit: false })
  expect(naturalOne.totalDamage).toBe(0)
  expect(critical.attack).toMatchObject({ selectedRoll: 20, critical: true, hit: true })
  expect(critical.damage).toEqual([{ damageType: 'Fire', baseAmount: 12, finalAmount: 6 }])
  expect(critical.target.hp).toEqual({ current: 14, max: 20 })
}

function baseAttack(
  attacker: EncounterCombatant,
  target: EncounterCombatant,
  weaponInstanceId = 'weapon.sword'
) {
  return {
    attacker,
    target,
    weaponInstanceId,
    attackAbility: 'Body' as const,
    proficient: true,
    proficiencyBonus: 2
  }
}

function proneAttacker(): EncounterCombatant {
  return combatant({
    id: 'prone-hero',
    kind: 'character',
    abilityScores: { Body: 20, Agility: 10, Mind: 10, Presence: 10 },
    characterConditions: ['Prone']
  })
}

function standingHero(): EncounterCombatant {
  return combatant({
    id: 'standing-hero',
    kind: 'character',
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
  })
}

function guardTarget(): EncounterCombatant {
  return combatant({ id: 'guard', kind: 'enemy', armorClass: 15, hp: { current: 20, max: 20 } })
}

function stunnedTarget(): EncounterCombatant {
  return combatant({
    id: 'stunned-ogre',
    kind: 'enemy',
    armorClass: 15,
    hp: { current: 20, max: 20 },
    characterConditions: ['Stunned']
  })
}

function elementalTarget(): EncounterCombatant {
  return combatant({
    id: 'elemental',
    kind: 'enemy',
    armorClass: 10,
    hp: { current: 30, max: 30 },
    damageResistances: ['Fire'],
    damageVulnerabilities: ['Physical']
  })
}

function mixedWeaponProfile(): WeaponDamageProfile {
  return {
    damageComponents: [
      { damageType: 'Physical', amount: 5 },
      { damageType: 'Fire', amount: 4 }
    ],
    onHitEffectIds: []
  }
}

function combatant(
  overrides: Partial<EncounterCombatant> & Pick<EncounterCombatant, 'id' | 'kind'>
): EncounterCombatant {
  const base = defaultCombatant(overrides.id, overrides.kind)
  return { ...base, ...compactOptional(overrides) }
}

function defaultCombatant(id: string, kind: EncounterCombatant['kind']): EncounterCombatant {
  return {
    id,
    kind,
    abilityScores: { Body: 14, Agility: 10, Mind: 10, Presence: 10 },
    initiative: { roll: 10, modifier: 0, total: 10 },
    conditions: [],
    characterConditions: [],
    damageResistances: [],
    damageVulnerabilities: []
  }
}

function compactOptional(
  overrides: Partial<EncounterCombatant>
): Partial<EncounterCombatant> {
  const next: Partial<EncounterCombatant> = { ...overrides }
  delete next.id
  delete next.kind
  return next
}

function deps(rolls: number[], profile: WeaponDamageProfile) {
  return {
    roller: () => rolls.shift() ?? 1,
    getWeaponDamageProfile: () => profile
  }
}

function physicalWeapon(amount: number) {
  return {
    damageComponents: [{ damageType: 'Physical' as const, amount }],
    onHitEffectIds: []
  }
}

function fireWeapon(amount: number) {
  return {
    damageComponents: [{ damageType: 'Fire' as const, amount }],
    onHitEffectIds: []
  }
}
