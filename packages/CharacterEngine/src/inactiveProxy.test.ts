import { beforeEach, describe, expect, it } from 'vitest'
import { clearCharacterStatsStore, getCharacterStats, persistCharacterMaxHp } from './hp.js'
import { requestInactiveProxyAction } from './inactiveProxy.js'
import { clearStartingLoadoutStore, selectStartingLoadout } from './startingLoadout.js'

describe('inactive-character proxy', () => {
  beforeEach(() => {
    clearStartingLoadoutStore()
    clearCharacterStatsStore()
  })

  it('suggests a known action grounded in persisted stats without inventing values', () => {
    const characterId = 'pc-inactive'
    selectStartingLoadout(characterId, 'Ranger')
    persistCharacterMaxHp({ characterId, hitDie: 10, level: 1, bodyMod: 2 })

    const suggestion = requestInactiveProxyAction({
      characterId,
      intentTag: 'hamstring'
    })

    expect(suggestion.characterId).toBe(characterId)
    expect(suggestion.intentTag).toBe('hamstring')
    expect(suggestion.stats).toEqual(getCharacterStatsSnapshot(characterId))
    expect(suggestion.groundedIn).toBe('known_action')
    expect(suggestion.actionId).toBe('hamstring_strike')
    expect(suggestion.archetype).toBe('Ranger')
  })

  it('falls back to archetype kit tags when no known action matches', () => {
    const characterId = 'pc-kit-fallback'
    selectStartingLoadout(characterId, 'Mage')
    persistCharacterMaxHp({ characterId, hitDie: 6, level: 1, bodyMod: 0 })

    const suggestion = requestInactiveProxyAction({
      characterId,
      intentTag: 'arcane'
    })

    expect(suggestion.groundedIn).toBe('archetype_kit')
    expect(suggestion.actionId).toBeNull()
    expect(suggestion.kitTag).toBe('arcane')
    expect(suggestion.stats?.characterId).toBe(characterId)
  })

  it('rejects unknown characters', () => {
    expect(() =>
      requestInactiveProxyAction({ characterId: 'missing', intentTag: 'melee' })
    ).toThrow(/unknown character/i)
  })
})

function getCharacterStatsSnapshot(characterId: string) {
  const stats = getCharacterStats(characterId)
  expect(stats).toBeDefined()
  return stats
}
