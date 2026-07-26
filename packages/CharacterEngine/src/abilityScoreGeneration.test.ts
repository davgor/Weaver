import { describe, expect, it } from 'vitest'
import {
  CharacterEngineError,
  assignStandardArrayAbilityScores,
  confirmRolledAbilityScores,
  pointBuyAbilityScores,
  rollAbilityScoreDraft,
  type AbilityScores,
  type D6Roller
} from './index.js'

const STANDARD_SCORES: AbilityScores = {
  Body: 14,
  Agility: 12,
  Mind: 10,
  Presence: 8
}

function sequenceRoller(rolls: readonly number[]): D6Roller {
  let index = 0
  return () => {
    const roll = rolls[index]
    if (roll === undefined) {
      throw new Error('No die roll configured for test')
    }
    index += 1
    return roll
  }
}

describe('point-buy ability scores', () => {
  it('accepts a 12-point allocation within the 8-20 score range', () => {
    expect(
      pointBuyAbilityScores({
        Body: 11,
        Agility: 11,
        Mind: 11,
        Presence: 11
      })
    ).toEqual({
      Body: 11,
      Agility: 11,
      Mind: 11,
      Presence: 11
    })
  })

  it('rejects over-budget allocations with a typed error', () => {
    expect(() =>
      pointBuyAbilityScores({
        Body: 20,
        Agility: 12,
        Mind: 8,
        Presence: 8
      })
    ).toThrowError(CharacterEngineError)
  })
})

describe('standard-array ability scores', () => {
  it('requires the unique 14, 12, 10, 8 assignment', () => {
    expect(assignStandardArrayAbilityScores(STANDARD_SCORES)).toEqual(STANDARD_SCORES)
  })

  it('rejects duplicate standard-array values with a typed error', () => {
    expect(() =>
      assignStandardArrayAbilityScores({
        Body: 14,
        Agility: 14,
        Mind: 10,
        Presence: 8
      })
    ).toThrowError(CharacterEngineError)
  })
})

describe('rolled ability scores', () => {
  it('rolls four d6 per ability and confirms the engine-rolled scores', () => {
    const draft = rollAbilityScoreDraft(
      sequenceRoller([
        6, 5, 4, 1,
        3, 3, 3, 3,
        6, 6, 2, 1,
        4, 4, 4, 2
      ])
    )

    expect(draft.confirmed).toBe(false)
    expect(draft.scores).toEqual({
      Body: 15,
      Agility: 9,
      Mind: 14,
      Presence: 12
    })
    expect(confirmRolledAbilityScores(draft)).toEqual(draft.scores)
  })

  it('supports a pure re-roll by calling the roller again', () => {
    const draft = rollAbilityScoreDraft(
      sequenceRoller([
        1, 1, 1, 1,
        1, 1, 1, 1,
        1, 1, 1, 1,
        1, 1, 1, 1
      ])
    )
    const rerolled = rollAbilityScoreDraft(
      sequenceRoller([
        6, 6, 6, 6,
        5, 5, 5, 5,
        4, 4, 4, 4,
        3, 3, 3, 3
      ])
    )

    expect(confirmRolledAbilityScores(draft)).toEqual({
      Body: 3,
      Agility: 3,
      Mind: 3,
      Presence: 3
    })
    expect(confirmRolledAbilityScores(rerolled)).toEqual({
      Body: 18,
      Agility: 15,
      Mind: 12,
      Presence: 9
    })
  })
})
