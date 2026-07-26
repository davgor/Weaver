import { CharacterEngineError } from './errors.js'

export type CharacterStats = {
  characterId: string
  maxHp: number
}

export type PersistCharacterMaxHpInput = {
  characterId: string
  hitDie: number
  level: number
  bodyMod: number
  rolls?: readonly number[]
}

const characterStats = new Map<string, CharacterStats>()

export function computeMaxHp(
  hitDie: number,
  level: number,
  bodyMod: number,
  rolls?: readonly number[]
): number {
  assertPositiveInteger(hitDie, 'hitDie')
  assertPositiveInteger(level, 'level')
  assertInteger(bodyMod, 'bodyMod')
  const rolledContributions = rolls ?? []
  const hitPointTotal = range(level).reduce((sum, index) => {
    return sum + readLevelContribution(hitDie, index, rolledContributions)
  }, bodyMod)
  return hitPointTotal
}

export function persistCharacterMaxHp(input: PersistCharacterMaxHpInput): CharacterStats {
  const stats = {
    characterId: input.characterId,
    maxHp: computeMaxHp(input.hitDie, input.level, input.bodyMod, input.rolls)
  }
  characterStats.set(input.characterId, stats)
  return stats
}

export function getCharacterStats(characterId: string): CharacterStats | undefined {
  const stats = characterStats.get(characterId)
  return stats === undefined ? undefined : { ...stats }
}

function readLevelContribution(hitDie: number, index: number, rolls: readonly number[]): number {
  const roll = rolls[index] ?? hitDie
  if (!Number.isInteger(roll) || roll < 1 || roll > hitDie) {
    throw new CharacterEngineError(
      'HP_INPUT_INVALID',
      `HP roll for level ${index + 1} must be an integer from 1 to ${hitDie}`
    )
  }
  return roll
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index)
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new CharacterEngineError('HP_INPUT_INVALID', `${label} must be a positive integer`)
  }
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new CharacterEngineError('HP_INPUT_INVALID', `${label} must be an integer`)
  }
}
