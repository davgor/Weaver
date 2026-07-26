import { ABILITIES, type Ability, type AbilityScores } from './abilities.js'
import { CharacterEngineError } from './errors.js'

export type D6Roller = () => number

export type AbilityRollDetails = Record<Ability, readonly [number, number, number, number]>

export type RolledAbilityScoreDraft = {
  scores: AbilityScores
  rolls: AbilityRollDetails
  confirmed: false
}

const POINT_BUY_BASE_SCORE = 8
const POINT_BUY_POOL = 12
const MIN_POINT_BUY_SCORE = 8
const MAX_POINT_BUY_SCORE = 20
const STANDARD_ARRAY_VALUES = [14, 12, 10, 8] as const

export function pointBuyAbilityScores(scores: AbilityScores): AbilityScores {
  const totalCost = ABILITIES.reduce((sum, ability) => {
    const score = scores[ability]
    assertPointBuyScore(score, ability)
    return sum + score - POINT_BUY_BASE_SCORE
  }, 0)

  if (totalCost > POINT_BUY_POOL) {
    throw new CharacterEngineError(
      'POINT_BUY_OVER_BUDGET',
      `Point buy allocation costs ${totalCost}; maximum is ${POINT_BUY_POOL}`
    )
  }
  return { ...scores }
}

export function assignStandardArrayAbilityScores(scores: AbilityScores): AbilityScores {
  const assigned = ABILITIES.map((ability) => scores[ability])
  const unique = new Set(assigned)
  if (unique.size !== ABILITIES.length) {
    throw new CharacterEngineError(
      'STANDARD_ARRAY_DUPLICATE',
      'Standard array assignment must use each value once'
    )
  }
  assertStandardValues(assigned)
  return { ...scores }
}

export function rollAbilityScoreDraft(roller: D6Roller = rollD6): RolledAbilityScoreDraft {
  const body = rollOneAbility(roller)
  const agility = rollOneAbility(roller)
  const mind = rollOneAbility(roller)
  const presence = rollOneAbility(roller)

  return {
    scores: {
      Body: sumBestThree(body),
      Agility: sumBestThree(agility),
      Mind: sumBestThree(mind),
      Presence: sumBestThree(presence)
    },
    rolls: {
      Body: body,
      Agility: agility,
      Mind: mind,
      Presence: presence
    },
    confirmed: false
  }
}

export function confirmRolledAbilityScores(draft: RolledAbilityScoreDraft): AbilityScores {
  return { ...draft.scores }
}

function assertPointBuyScore(score: number, ability: Ability): void {
  if (!Number.isInteger(score) || score < MIN_POINT_BUY_SCORE || score > MAX_POINT_BUY_SCORE) {
    throw new CharacterEngineError(
      'ABILITY_SCORE_OUT_OF_RANGE',
      `${ability} must be an integer from ${MIN_POINT_BUY_SCORE} to ${MAX_POINT_BUY_SCORE}`
    )
  }
}

function assertStandardValues(assigned: readonly number[]): void {
  const valid = assigned.every((score) =>
    STANDARD_ARRAY_VALUES.some((standardScore) => standardScore === score)
  )
  if (!valid) {
    throw new CharacterEngineError(
      'STANDARD_ARRAY_INVALID',
      'Standard array assignment must use 14, 12, 10, and 8'
    )
  }
}

function rollOneAbility(roller: D6Roller): readonly [number, number, number, number] {
  return [
    assertD6Roll(roller()),
    assertD6Roll(roller()),
    assertD6Roll(roller()),
    assertD6Roll(roller())
  ]
}

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1
}

function assertD6Roll(roll: number): number {
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) {
    throw new CharacterEngineError(
      'DIE_ROLL_OUT_OF_RANGE',
      `D6 roller returned invalid roll: ${roll}`
    )
  }
  return roll
}

function sumBestThree(rolls: readonly [number, number, number, number]): number {
  const sorted = [...rolls].sort((left, right) => right - left)
  return readSortedRoll(sorted, 0) + readSortedRoll(sorted, 1) + readSortedRoll(sorted, 2)
}

function readSortedRoll(rolls: readonly number[], index: number): number {
  const roll = rolls[index]
  if (roll === undefined) {
    throw new CharacterEngineError('DIE_ROLL_OUT_OF_RANGE', 'Expected four D6 rolls')
  }
  return roll
}
