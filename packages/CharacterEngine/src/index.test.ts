import { describe, expect, it } from 'vitest'
import {
  ABILITIES,
  calculateArmorClass,
  characterEngine,
  getAbilityModifier,
  resolveAbilityCheck,
  type AbilityScores,
  type D20Roller
} from './index.js'

const STANDARD_SCORES: AbilityScores = {
  Body: 14,
  Agility: 12,
  Mind: 10,
  Presence: 8
}

function sequenceRoller(rolls: readonly number[]): D20Roller {
  let index = 0
  return () => {
    const roll = rolls[index]
    if (roll === undefined) {
      throw new Error('No roll configured for test')
    }
    index += 1
    return roll
  }
}

describe('@weaver/character-engine scaffold', () => {
  it('reports healthy', () => {
    const health = characterEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/character-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = characterEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((endpoint) => endpoint.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await characterEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/character-engine' })
  })

  it('accepts an optional payload without breaking health', async () => {
    const result = await characterEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/character-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(characterEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})

describe('abilities and modifiers', () => {
  it('exposes Body, Agility, Mind, and Presence as the only core abilities', () => {
    expect(ABILITIES).toEqual(['Body', 'Agility', 'Mind', 'Presence'])
  })

  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [18, 4],
    [20, 5]
  ])('calculates the modifier for score %i', (score, expectedModifier) => {
    expect(getAbilityModifier(score)).toBe(expectedModifier)
  })
})

describe('ability resolution totals', () => {
  it('rolls d20 + ability modifier against the target', () => {
    const result = resolveAbilityCheck(
      {
        ability: 'Body',
        scores: STANDARD_SCORES,
        proficient: false,
        proficiencyBonus: 2,
        target: 14
      },
      sequenceRoller([12])
    )

    expect(result).toMatchObject({
      selectedRoll: 12,
      abilityModifier: 2,
      proficiencyBonusApplied: 0,
      total: 14,
      target: 14,
      success: true
    })
  })

  it('adds proficiency bonus only when proficient', () => {
    const result = resolveAbilityCheck(
      {
        ability: 'Presence',
        scores: STANDARD_SCORES,
        proficient: true,
        proficiencyBonus: 3,
        target: 11
      },
      sequenceRoller([9])
    )

    expect(result.abilityModifier).toBe(-1)
    expect(result.proficiencyBonusApplied).toBe(3)
    expect(result.total).toBe(11)
    expect(result.success).toBe(true)
  })
})

describe('ability resolution roll modes', () => {
  it('takes the higher d20 for advantage', () => {
    const result = resolveAbilityCheck(
      {
        ability: 'Agility',
        scores: STANDARD_SCORES,
        proficient: false,
        proficiencyBonus: 2,
        target: 15,
        rollMode: 'advantage'
      },
      sequenceRoller([4, 14])
    )

    expect(result.rolls).toEqual([4, 14])
    expect(result.selectedRoll).toBe(14)
    expect(result.total).toBe(15)
    expect(result.success).toBe(true)
  })

  it('takes the lower d20 for disadvantage', () => {
    const result = resolveAbilityCheck(
      {
        ability: 'Mind',
        scores: STANDARD_SCORES,
        proficient: false,
        proficiencyBonus: 2,
        target: 11,
        rollMode: 'disadvantage'
      },
      sequenceRoller([18, 10])
    )

    expect(result.rolls).toEqual([18, 10])
    expect(result.selectedRoll).toBe(10)
    expect(result.total).toBe(10)
    expect(result.success).toBe(false)
  })
})

describe('armor class', () => {
  it('calculates unarmored AC from agility modifier', () => {
    expect(calculateArmorClass({ agilityScore: 12, armorBonus: 0 })).toBe(11)
  })

  it('adds caller-supplied armor bonus without importing ItemEngine', () => {
    expect(calculateArmorClass({ agilityScore: 18, armorBonus: 4 })).toBe(18)
  })
})
