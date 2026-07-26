import { CharacterEngineError } from './errors.js'
import { restoreCharacterStats, type CharacterStats } from './hp.js'
import { setCharacterProgression, type CharacterProgression } from './xp.js'

export type CharacterAutosaveSnapshot = {
  stats: CharacterStats
  progression?: CharacterProgression
  recordedAt: string
}

const autosaveStore = new Map<string, CharacterAutosaveSnapshot>()

export function recordAutosaveSnapshot(
  characterId: string,
  snapshot: CharacterAutosaveSnapshot
): CharacterAutosaveSnapshot {
  assertNonEmpty(characterId, 'characterId')
  assertSnapshot(snapshot)
  const stored = copySnapshot(snapshot)
  autosaveStore.set(characterId, stored)
  return copySnapshot(stored)
}

export function getLatestAutosaveSnapshot(characterId: string): CharacterAutosaveSnapshot | undefined {
  const snapshot = autosaveStore.get(characterId)
  return snapshot === undefined ? undefined : copySnapshot(snapshot)
}

export function restoreLatestAutosaveSnapshot(characterId: string): CharacterAutosaveSnapshot {
  const snapshot = getLatestAutosaveSnapshot(characterId)
  if (snapshot === undefined) {
    throw new CharacterEngineError(
      'AUTOSAVE_NOT_FOUND',
      `No autosave snapshot found for characterId: ${characterId}`
    )
  }
  restoreCharacterStats(snapshot.stats)
  if (snapshot.progression !== undefined) {
    setCharacterProgression(
      snapshot.progression.characterId,
      snapshot.progression.level,
      snapshot.progression.xp
    )
  }
  return copySnapshot(snapshot)
}

export function clearAutosaveStore(): void {
  autosaveStore.clear()
}

function copySnapshot(snapshot: CharacterAutosaveSnapshot): CharacterAutosaveSnapshot {
  const copied: CharacterAutosaveSnapshot = {
    stats: {
      characterId: snapshot.stats.characterId,
      maxHp: snapshot.stats.maxHp,
      currentHp: snapshot.stats.currentHp,
      conditions: [...snapshot.stats.conditions],
      dying:
        snapshot.stats.dying === null
          ? null
          : {
              successes: snapshot.stats.dying.successes,
              failures: snapshot.stats.dying.failures,
              stable: snapshot.stats.dying.stable
            }
    },
    recordedAt: snapshot.recordedAt
  }
  if (snapshot.progression !== undefined) {
    copied.progression = {
      characterId: snapshot.progression.characterId,
      level: snapshot.progression.level,
      xp: snapshot.progression.xp
    }
  }
  return copied
}

function assertSnapshot(snapshot: CharacterAutosaveSnapshot): void {
  if (typeof snapshot.recordedAt !== 'string' || snapshot.recordedAt.trim().length === 0) {
    throw new CharacterEngineError('AUTOSAVE_INPUT_INVALID', 'recordedAt must be a non-empty string')
  }
  if (typeof snapshot.stats?.characterId !== 'string') {
    throw new CharacterEngineError('AUTOSAVE_INPUT_INVALID', 'snapshot.stats.characterId is required')
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new CharacterEngineError('AUTOSAVE_INPUT_INVALID', `${label} must not be empty`)
  }
}
