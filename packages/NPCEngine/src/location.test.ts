import { beforeEach, describe, expect, it } from 'vitest'
import { getCampaignDay, setCampaignDay } from '@weaver/character-engine'
import {
  LOCATION_KINDS,
  NpcEngineError,
  clearNpcLocation,
  clearNpcLocationStore,
  getNpcLocation,
  listNpcLocations,
  setNpcLocation,
  validateNpcLocation
} from './index.js'

describe('NPC location kinds', () => {
  it('locks locationKind to overworld, settlement, and dungeon', () => {
    expect(LOCATION_KINDS).toEqual(['overworld', 'settlement', 'dungeon'])
  })

  it('accepts a valid location shape', () => {
    expect(
      validateNpcLocation({
        npcId: 'npc-1',
        campaignId: 'camp-1',
        regionId: 'region-north',
        placeId: 'civ-hamlet',
        locationKind: 'settlement',
        updatedDay: 2
      })
    ).toEqual({
      npcId: 'npc-1',
      campaignId: 'camp-1',
      regionId: 'region-north',
      placeId: 'civ-hamlet',
      locationKind: 'settlement',
      updatedDay: 2
    })
  })
})

describe('NPC location shape rejection', () => {
  it('rejects empty ids, unknown kinds, and negative updatedDay', () => {
    expect(() =>
      validateNpcLocation({
        npcId: '',
        campaignId: 'camp-1',
        regionId: 'region-1',
        locationKind: 'overworld'
      })
    ).toThrowError(NpcEngineError)

    expect(() =>
      validateNpcLocation({
        npcId: 'npc-1',
        campaignId: 'camp-1',
        regionId: 'region-1',
        locationKind: 'void' as 'overworld'
      })
    ).toThrow(/locationKind/)

    expect(() =>
      validateNpcLocation({
        npcId: 'npc-1',
        campaignId: 'camp-1',
        regionId: 'region-1',
        locationKind: 'overworld',
        updatedDay: -1
      })
    ).toThrowError(NpcEngineError)
  })
})

describe('NPC location APIs', () => {
  beforeEach(() => {
    clearNpcLocationStore()
    setCampaignDay('camp-npc-loc', 7)
  })

  it('returns null for unset NPCs without throwing', () => {
    expect(getNpcLocation('npc-missing')).toBeNull()
  })

  it('sets, gets, and clears an NPC location', () => {
    expectSetGetClearRoundTrip()
  })

  it('lists locations by campaign id', () => {
    expectCampaignScopedListing()
  })

  it('does not leave a partial record when set input is invalid', () => {
    expect(() =>
      setNpcLocation({
        npcId: 'npc-bad',
        campaignId: 'camp-npc-loc',
        regionId: '',
        locationKind: 'settlement'
      })
    ).toThrowError(NpcEngineError)
    expect(getNpcLocation('npc-bad')).toBeNull()
  })
})

function expectSetGetClearRoundTrip(): void {
  const set = setNpcLocation({
    npcId: 'npc-traveler',
    campaignId: 'camp-npc-loc',
    regionId: 'region-a',
    locationKind: 'overworld'
  })
  expect(set).toMatchObject({
    npcId: 'npc-traveler',
    regionId: 'region-a',
    locationKind: 'overworld',
    updatedDay: 7
  })
  expect(getNpcLocation('npc-traveler')).toEqual(set)
  expect(getCampaignDay('camp-npc-loc')).toBe(7)
  expect(clearNpcLocation('npc-traveler')).toBe(true)
  expect(getNpcLocation('npc-traveler')).toBeNull()
  expect(clearNpcLocation('npc-traveler')).toBe(false)
}

function expectCampaignScopedListing(): void {
  setNpcLocation({
    npcId: 'npc-a',
    campaignId: 'camp-npc-loc',
    regionId: 'r1',
    locationKind: 'overworld'
  })
  setNpcLocation({
    npcId: 'npc-b',
    campaignId: 'camp-other',
    regionId: 'r2',
    locationKind: 'dungeon',
    placeId: 'dungeon-1'
  })
  expect(listNpcLocations('camp-npc-loc').map((entry) => entry.npcId)).toEqual(['npc-a'])
  expect(listNpcLocations().map((entry) => entry.npcId).sort()).toEqual(['npc-a', 'npc-b'])
}
