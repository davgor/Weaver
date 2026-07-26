import { beforeEach, describe, expect, it } from 'vitest'
import { CharacterEngineError } from './errors.js'
import {
  clearAutosaveStore,
  getLatestAutosaveSnapshot,
  recordAutosaveSnapshot,
  restoreLatestAutosaveSnapshot,
  type CharacterAutosaveSnapshot
} from './autosave.js'
import {
  clearCharacterStatsStore,
  getCharacterStats,
  persistCharacterMaxHp,
  restoreCharacterStats
} from './hp.js'
import { clearProgressionStore, getCharacterProgression, setCharacterProgression } from './xp.js'

const CHARACTER_ID = 'pc-autosave'

function buildSnapshot(overrides: Partial<CharacterAutosaveSnapshot> = {}): CharacterAutosaveSnapshot {
  const stats = persistCharacterMaxHp({
    characterId: CHARACTER_ID,
    hitDie: 8,
    level: 2,
    bodyMod: 1,
    rolls: [6, 5]
  })
  setCharacterProgression(CHARACTER_ID, 2, 40)
  return {
    stats,
    progression: getCharacterProgression(CHARACTER_ID),
    recordedAt: '2026-07-26T00:00:00.000Z',
    ...overrides
  }
}

describe('autosave snapshots', () => {
  beforeEach(() => {
    clearAutosaveStore()
    clearCharacterStatsStore()
    clearProgressionStore()
  })

  it('stores the latest snapshot per character', () => {
    const first = buildSnapshot({ recordedAt: '2026-07-26T00:00:00.000Z' })
    const second = buildSnapshot({ recordedAt: '2026-07-26T01:00:00.000Z' })

    recordAutosaveSnapshot(CHARACTER_ID, first)
    recordAutosaveSnapshot(CHARACTER_ID, second)

    expect(getLatestAutosaveSnapshot(CHARACTER_ID)).toEqual(second)
  })

  it('restores HP and progression from the latest snapshot', () => {
    const snapshot = buildSnapshot()
    recordAutosaveSnapshot(CHARACTER_ID, snapshot)

    restoreCharacterStats({
      ...snapshot.stats,
      currentHp: 1,
      conditions: ['Unconscious'],
      dying: { successes: 0, failures: 3, stable: false }
    })
    setCharacterProgression(CHARACTER_ID, 1, 0)

    const restored = restoreLatestAutosaveSnapshot(CHARACTER_ID)

    expect(restored).toEqual(snapshot)
    expect(getCharacterStats(CHARACTER_ID)).toEqual(snapshot.stats)
    expect(getCharacterProgression(CHARACTER_ID)).toEqual(snapshot.progression)
  })

  it('rejects empty character ids and missing snapshots', () => {
    expect(() => recordAutosaveSnapshot('  ', buildSnapshot())).toThrowError(CharacterEngineError)
    expect(() => restoreLatestAutosaveSnapshot(CHARACTER_ID)).toThrowError(CharacterEngineError)
  })
})
