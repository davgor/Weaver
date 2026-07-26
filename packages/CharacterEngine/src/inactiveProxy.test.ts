import { beforeEach, describe, expect, it } from 'vitest'
import { clearCharacterStatsStore, getCharacterStats, persistCharacterMaxHp } from './hp.js'
import { requestInactiveProxyAction } from './inactiveProxy.js'
import { clearStartingLoadoutStore, selectStartingLoadout } from './startingLoadout.js'

describe('inactive-character proxy known actions', () => {
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
})

describe('inactive-character proxy kit fallback', () => {
  beforeEach(() => {
    clearStartingLoadoutStore()
    clearCharacterStatsStore()
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

  it('matches kit tags with partial overlap when no known action fits', () => {
    selectStartingLoadout('pc-partial', 'Cleric')
    persistCharacterMaxHp({ characterId: 'pc-partial', hitDie: 8, level: 1, bodyMod: 0 })

    const suggestion = requestInactiveProxyAction({
      characterId: 'pc-partial',
      intentTag: 'heal'
    })

    expect(suggestion.groundedIn).toBe('archetype_kit')
    expect(suggestion.kitTag).toBe('healing')
  })

  it('matches exact archetype kit tags case-insensitively', () => {
    selectStartingLoadout('pc-exact', 'Rogue')
    persistCharacterMaxHp({ characterId: 'pc-exact', hitDie: 8, level: 1, bodyMod: 0 })

    const suggestion = requestInactiveProxyAction({
      characterId: 'pc-exact',
      intentTag: 'STEALTH'
    })

    expect(suggestion.groundedIn).toBe('archetype_kit')
    expect(suggestion.kitTag).toBe('stealth')
  })
})

describe('inactive-character proxy validation', () => {
  beforeEach(() => {
    clearStartingLoadoutStore()
    clearCharacterStatsStore()
  })

  it('rejects unknown characters', () => {
    expect(() =>
      requestInactiveProxyAction({ characterId: 'missing', intentTag: 'melee' })
    ).toThrow(/unknown character/i)
  })

  it('rejects empty characterId and intentTag', () => {
    selectStartingLoadout('pc-empty', 'Fighter')
    persistCharacterMaxHp({ characterId: 'pc-empty', hitDie: 10, level: 1, bodyMod: 0 })

    expect(() => requestInactiveProxyAction({ characterId: '  ', intentTag: 'melee' })).toThrow(
      /characterId/i
    )
    expect(() =>
      requestInactiveProxyAction({ characterId: 'pc-empty', intentTag: '   ' })
    ).toThrow(/intentTag/i)
  })

  it('rejects intents that match neither known actions nor archetype kit tags', () => {
    selectStartingLoadout('pc-unavailable', 'Fighter')
    persistCharacterMaxHp({ characterId: 'pc-unavailable', hitDie: 10, level: 1, bodyMod: 0 })

    expect(() =>
      requestInactiveProxyAction({ characterId: 'pc-unavailable', intentTag: 'underwater basket weaving' })
    ).toThrow(/no grounded action/i)
  })

  it('rejects proxy suggestions when stats exist but archetype is unknown', () => {
    persistCharacterMaxHp({ characterId: 'pc-no-archetype', hitDie: 10, level: 1, bodyMod: 0 })

    expect(() =>
      requestInactiveProxyAction({ characterId: 'pc-no-archetype', intentTag: 'melee' })
    ).toThrow(/unknown character archetype/i)
  })
})

function getCharacterStatsSnapshot(characterId: string) {
  const stats = getCharacterStats(characterId)
  expect(stats).toBeDefined()
  return stats
}
