import { assertArchetypeLevel, ARCHETYPE_MAX_LEVEL } from './archetypes.js'
import { CharacterEngineError } from './errors.js'

export const DIFFICULTY_BANDS = ['easy', 'medium', 'hard', 'deadly', 'impossible'] as const
export type DifficultyBand = (typeof DIFFICULTY_BANDS)[number]

const DIFFICULTY_FRACTIONS: Readonly<Record<DifficultyBand, number>> = {
  easy: 0.05,
  medium: 0.15,
  hard: 0.3,
  deadly: 0.5,
  impossible: 1
}

export type CharacterProgression = {
  characterId: string
  level: number
  xp: number
}

export type XpAwardResult = CharacterProgression & {
  xpAwarded: number
  levelsGained: number
}

const progressionStore = new Map<string, CharacterProgression>()

export function isDifficultyBand(value: unknown): value is DifficultyBand {
  return typeof value === 'string' && DIFFICULTY_BANDS.some((band) => band === value)
}

export function getLevelSpanXp(level: number): number {
  const normalized = assertArchetypeLevel(level)
  return normalized * 100
}

export function getXpThresholdForLevel(level: number): number {
  const normalized = assertArchetypeLevel(level)
  if (normalized === 1) {
    return 0
  }
  return range(normalized - 1).reduce((total, index) => total + getLevelSpanXp(index + 1), 0)
}

export function computeXpAward(difficulty: DifficultyBand, level: number): number {
  const span = getLevelSpanXp(level)
  return Math.floor(span * DIFFICULTY_FRACTIONS[difficulty])
}

export function awardXp(characterId: string, difficulty: DifficultyBand): XpAwardResult {
  assertNonEmpty(characterId, 'characterId')
  const progression = readProgression(characterId)
  const xpAwarded = computeXpAward(difficulty, progression.level)
  return applyXpGain(progression, xpAwarded)
}

export function getCharacterProgression(characterId: string): CharacterProgression {
  return copyProgression(readProgression(characterId))
}

export function setCharacterProgression(
  characterId: string,
  level: number,
  xp: number
): CharacterProgression {
  assertNonEmpty(characterId, 'characterId')
  assertArchetypeLevel(level)
  assertNonNegativeInteger(xp, 'xp')
  const progression = { characterId, level, xp }
  progressionStore.set(characterId, progression)
  return copyProgression(progression)
}

export function clearProgressionStore(): void {
  progressionStore.clear()
}

function applyXpGain(progression: CharacterProgression, xpAwarded: number): XpAwardResult {
  let nextLevel = progression.level
  let nextXp = progression.xp + xpAwarded
  let levelsGained = 0

  while (nextLevel < ARCHETYPE_MAX_LEVEL) {
    const span = getLevelSpanXp(nextLevel)
    if (nextXp < span) {
      break
    }
    nextXp -= span
    nextLevel += 1
    levelsGained += 1
  }

  const updated = { characterId: progression.characterId, level: nextLevel, xp: nextXp }
  progressionStore.set(progression.characterId, updated)
  return { ...updated, xpAwarded, levelsGained }
}

function readProgression(characterId: string): CharacterProgression {
  const existing = progressionStore.get(characterId)
  if (existing !== undefined) {
    return existing
  }
  const created = { characterId, level: 1, xp: 0 }
  progressionStore.set(characterId, created)
  return created
}

function copyProgression(progression: CharacterProgression): CharacterProgression {
  return { ...progression }
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index)
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new CharacterEngineError('XP_INPUT_INVALID', `${label} must not be empty`)
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new CharacterEngineError('XP_INPUT_INVALID', `${label} must be a non-negative integer`)
  }
}
