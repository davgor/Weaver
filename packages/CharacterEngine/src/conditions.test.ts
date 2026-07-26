import { describe, expect, it } from 'vitest'
import {
  CONDITION_EFFECTS,
  CONDITIONS,
  getConditionEffect,
  isCondition,
  listConditions,
  mergeConditionEffects
} from './conditions.js'

describe('CONDITION_EFFECTS catalog', () => {
  it('exposes the five canonical conditions', () => {
    expect(listConditions()).toEqual(['Prone', 'Stunned', 'Poisoned', 'Restrained', 'Unconscious'])
    for (const condition of CONDITIONS) {
      expect(isCondition(condition)).toBe(true)
      expect(getConditionEffect(condition)).toEqual(CONDITION_EFFECTS[condition])
    }
    expect(isCondition('Blinded')).toBe(false)
  })

  it('gives Prone concrete attack and movement effects', () => {
    expect(CONDITION_EFFECTS.Prone).toMatchObject({
      canAct: true,
      canMove: true,
      crawlOnly: true,
      attackRollMode: 'disadvantage',
      attacksAgainst: 'meleeAdvantageRangedDisadvantage'
    })
  })

  it('gives Stunned canAct gating and Body/Agility auto-fail saves', () => {
    expect(CONDITION_EFFECTS.Stunned).toMatchObject({
      canAct: false,
      canMove: false,
      autoFailAbilitySaves: ['Body', 'Agility'],
      attacksAgainst: 'advantage'
    })
  })

  it('gives Poisoned attack and ability-check disadvantage', () => {
    expect(CONDITION_EFFECTS.Poisoned).toMatchObject({
      canAct: true,
      attackRollMode: 'disadvantage',
      abilityCheckDisadvantage: true
    })
  })
})

describe('CONDITION_EFFECTS restraints and merge', () => {
  it('gives Restrained speed-zero and Agility-save disadvantage', () => {
    expect(CONDITION_EFFECTS.Restrained).toMatchObject({
      canAct: true,
      canMove: false,
      speedZero: true,
      attackRollMode: 'disadvantage',
      attacksAgainst: 'advantage',
      agilitySaveDisadvantage: true
    })
  })

  it('gives Unconscious canAct gating, auto-fail Body/Agility saves, and melee crits', () => {
    expect(CONDITION_EFFECTS.Unconscious).toMatchObject({
      canAct: false,
      canMove: false,
      autoFailAbilitySaves: ['Body', 'Agility'],
      attacksAgainst: 'advantage',
      meleeHitsAreCritical: true,
      impliesConditions: ['Prone']
    })
  })

  it('merges stacked conditions with the most restrictive gating', () => {
    const merged = mergeConditionEffects(['Poisoned', 'Unconscious'])
    expect(merged.canAct).toBe(false)
    expect(merged.attackRollMode).toBe('disadvantage')
    expect(merged.autoFailAbilitySaves).toEqual(['Body', 'Agility'])
    expect(merged.meleeHitsAreCritical).toBe(true)
  })
})
