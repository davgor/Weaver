import { beforeEach, describe, expect, it } from 'vitest'
import {
  CharacterEngineError,
  LOCATION_KINDS,
  clearCharacterLocation,
  clearCharacterLocationStore,
  getCampaignDay,
  getCharacterLocation,
  listCharacterLocations,
  setCampaignDay,
  setCharacterLocation,
  validateCharacterLocation
} from './index.js'

describe('location kinds and shape validation', () => {
  it('locks locationKind to overworld, settlement, and dungeon', () => {
    expect(LOCATION_KINDS).toEqual(['overworld', 'settlement', 'dungeon'])
  })

  it('accepts a valid location shape', () => {
    expect(
      validateCharacterLocation({
        characterId: 'pc-1',
        campaignId: 'camp-1',
        regionId: 'region-north',
        placeId: 'town-gate',
        locationKind: 'settlement',
        updatedDay: 2
      })
    ).toEqual({
      characterId: 'pc-1',
      campaignId: 'camp-1',
      regionId: 'region-north',
      placeId: 'town-gate',
      locationKind: 'settlement',
      updatedDay: 2
    })
  })

  it('rejects empty ids, unknown kinds, and negative updatedDay', () => {
    expect(() =>
      validateCharacterLocation({
        characterId: '',
        campaignId: 'camp-1',
        regionId: 'region-1',
        locationKind: 'overworld'
      })
    ).toThrowError(CharacterEngineError)

    expect(() =>
      validateCharacterLocation({
        characterId: 'pc-1',
        campaignId: 'camp-1',
        regionId: 'region-1',
        locationKind: 'void' as 'overworld'
      })
    ).toThrow(/locationKind/)

    expect(() =>
      validateCharacterLocation({
        characterId: 'pc-1',
        campaignId: 'camp-1',
        regionId: 'region-1',
        locationKind: 'overworld',
        updatedDay: -1
      })
    ).toThrowError(CharacterEngineError)
  })
})

describe('character location APIs', () => {
  beforeEach(() => {
    clearCharacterLocationStore()
    setCampaignDay('camp-loc', 7)
  })

  it('returns null for unset characters without throwing', () => {
    expect(getCharacterLocation('pc-missing')).toBeNull()
  })

  it('sets, gets, and clears a character location', () => {
    const set = setCharacterLocation({
      characterId: 'pc-traveler',
      campaignId: 'camp-loc',
      regionId: 'region-a',
      locationKind: 'overworld'
    })
    expect(set).toMatchObject({
      characterId: 'pc-traveler',
      regionId: 'region-a',
      locationKind: 'overworld',
      updatedDay: 7
    })
    expect(getCharacterLocation('pc-traveler')).toEqual(set)
    expect(getCampaignDay('camp-loc')).toBe(7)

    expect(clearCharacterLocation('pc-traveler')).toBe(true)
    expect(getCharacterLocation('pc-traveler')).toBeNull()
    expect(clearCharacterLocation('pc-traveler')).toBe(false)
  })

  it('lists locations by campaign id', () => {
    setCharacterLocation({
      characterId: 'pc-a',
      campaignId: 'camp-loc',
      regionId: 'r1',
      locationKind: 'overworld'
    })
    setCharacterLocation({
      characterId: 'pc-b',
      campaignId: 'camp-other',
      regionId: 'r2',
      locationKind: 'dungeon',
      placeId: 'dungeon-1'
    })

    expect(listCharacterLocations('camp-loc').map((entry) => entry.characterId)).toEqual(['pc-a'])
    expect(listCharacterLocations().map((entry) => entry.characterId).sort()).toEqual([
      'pc-a',
      'pc-b'
    ])
  })
})
