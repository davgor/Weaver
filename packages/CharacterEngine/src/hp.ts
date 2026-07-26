import type { Condition } from './conditions.js'
import { CONDITION_EFFECTS } from './conditions.js'
import {
  applyDyingSave,
  createDyingState,
  type DyingSaveApplication,
  type DyingState
} from './dying.js'
import { CharacterEngineError } from './errors.js'
import { rollD20, type D20Roller } from './abilities.js'

export type CharacterStats = {
  characterId: string
  maxHp: number
  currentHp: number
  conditions: Condition[]
  dying: DyingState | null
}

export type PersistCharacterMaxHpInput = {
  characterId: string
  hitDie: number
  level: number
  bodyMod: number
  rolls?: readonly number[]
}

export type CharacterDyingSaveResult = DyingSaveApplication & {
  stats: CharacterStats
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
  const maxHp = computeMaxHp(input.hitDie, input.level, input.bodyMod, input.rolls)
  const stats: CharacterStats = {
    characterId: input.characterId,
    maxHp,
    currentHp: maxHp,
    conditions: [],
    dying: null
  }
  characterStats.set(input.characterId, stats)
  return copyStats(stats)
}

export function getCharacterStats(characterId: string): CharacterStats | undefined {
  const stats = characterStats.get(characterId)
  return stats === undefined ? undefined : copyStats(stats)
}

export function clearCharacterStatsStore(): void {
  characterStats.clear()
}

export function restoreCharacterStats(stats: CharacterStats): CharacterStats {
  return writeStats({
    characterId: stats.characterId,
    maxHp: stats.maxHp,
    currentHp: stats.currentHp,
    conditions: [...stats.conditions],
    dying: stats.dying === null ? null : { ...stats.dying }
  })
}

export function applyHitPointDamage(characterId: string, amount: number): CharacterStats {
  assertNonNegativeInteger(amount, 'amount')
  const stats = requireStats(characterId)
  if (stats.currentHp === 0 && stats.dying !== null && !stats.dying.stable) {
    return recordDyingDamage(stats)
  }
  const nextHp = Math.max(0, stats.currentHp - amount)
  if (nextHp > 0) {
    return writeStats({ ...stats, currentHp: nextHp })
  }
  return writeStats(enterZeroHitPoints(stats))
}

export function healHitPoints(characterId: string, amount: number): CharacterStats {
  assertNonNegativeInteger(amount, 'amount')
  const stats = requireStats(characterId)
  if (amount === 0) {
    return copyStats(stats)
  }
  const nextHp = Math.min(stats.maxHp, Math.max(0, stats.currentHp) + amount)
  return writeStats(clearZeroHpState({ ...stats, currentHp: nextHp }))
}

export function resolveCharacterDyingSave(
  characterId: string,
  roller: D20Roller = rollD20
): CharacterDyingSaveResult {
  const stats = requireStats(characterId)
  if (stats.dying === null) {
    throw new CharacterEngineError('DYING_INPUT_INVALID', 'Character is not dying')
  }
  const application = applyDyingSave(stats.dying, roller())
  if (application.revived) {
    const revived = writeStats(clearZeroHpState({ ...stats, currentHp: 1 }))
    return { ...application, stats: revived }
  }
  const next = writeStats({ ...stats, dying: application.state })
  return { ...application, stats: next }
}

function enterZeroHitPoints(stats: CharacterStats): CharacterStats {
  return {
    ...stats,
    currentHp: 0,
    conditions: withImpliedConditions([...stats.conditions, 'Unconscious']),
    dying: stats.dying ?? createDyingState()
  }
}

function recordDyingDamage(stats: CharacterStats): CharacterStats {
  const dying = stats.dying
  if (dying === null) {
    return enterZeroHitPoints(stats)
  }
  const failures = Math.min(3, dying.failures + 1)
  return {
    ...stats,
    currentHp: 0,
    dying: { ...dying, failures, stable: false }
  }
}

function clearZeroHpState(stats: CharacterStats): CharacterStats {
  return {
    ...stats,
    dying: null,
    conditions: stats.conditions.filter((condition) => condition !== 'Unconscious')
  }
}

function withImpliedConditions(conditions: readonly Condition[]): Condition[] {
  const implied = conditions.flatMap((condition) => CONDITION_EFFECTS[condition].impliesConditions)
  const merged = [...conditions, ...implied]
  return (['Prone', 'Stunned', 'Poisoned', 'Restrained', 'Unconscious'] as const).filter(
    (condition) => merged.includes(condition)
  )
}

function requireStats(characterId: string): CharacterStats {
  const stats = characterStats.get(characterId)
  if (stats === undefined) {
    throw new CharacterEngineError('HP_INPUT_INVALID', `Unknown characterId: ${characterId}`)
  }
  return stats
}

function writeStats(stats: CharacterStats): CharacterStats {
  characterStats.set(stats.characterId, stats)
  return copyStats(stats)
}

function copyStats(stats: CharacterStats): CharacterStats {
  return {
    characterId: stats.characterId,
    maxHp: stats.maxHp,
    currentHp: stats.currentHp,
    conditions: [...stats.conditions],
    dying: stats.dying === null ? null : { ...stats.dying }
  }
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

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new CharacterEngineError('HP_INPUT_INVALID', `${label} must be a non-negative integer`)
  }
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new CharacterEngineError('HP_INPUT_INVALID', `${label} must be an integer`)
  }
}
