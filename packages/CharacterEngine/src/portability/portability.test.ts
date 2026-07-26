import { beforeEach, describe, expect, it } from 'vitest'
import { clearCompanionStore, restoreCompanionsForCampaign } from '../companions.js'
import { clearDeathModeStores } from '../deathModes.js'
import {
  clearCharacterLocationStore,
  getCharacterLocation,
  setCharacterLocation
} from '../location.js'
import { setCampaignDay } from '../timeRest.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import {
  CHARACTER_SLICE_VERSION,
  CharacterPortabilitySchemaError,
  type CharacterCampaignSlice
} from './types.js'

const CAMPAIGN_ID = 'campaign-character'

beforeEach(() => {
  clearCompanionStore()
  clearCharacterLocationStore()
  clearDeathModeStores()
  setCampaignDay(CAMPAIGN_ID, 0)
})

describe('CharacterEngine campaign portability', () => {
  it('round-trips campaign day, companions, and empty locations', () => {
    setCampaignDay(CAMPAIGN_ID, 4)
    restoreCompanionsForCampaign([
      {
        characterId: 'companion-1',
        ownerCharacterId: 'pc-owner',
        campaignId: CAMPAIGN_ID,
        name: 'Mira',
        isCompanion: true,
        archetype: 'Fighter'
      }
    ])

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.day).toBe(4)
    expect(slice.sliceVersion).toBe(2)
    expect(slice.characterIds).toEqual(['companion-1'])
    expect(slice.locations).toEqual([])

    clearCompanionStore()
    clearCharacterLocationStore()
    setCampaignDay(CAMPAIGN_ID, 0)
    importCampaignSlice(ctx, slice)
    const restored = exportCampaignSlice(ctx)
    expect(restored.day).toBe(4)
    expect(restored.characterIds).toEqual(['companion-1'])
    expect(restored.locations).toEqual([])
  })

  it('round-trips non-empty character locations', () => {
    setCampaignDay(CAMPAIGN_ID, 9)
    setCharacterLocation({
      characterId: 'pc-placed',
      campaignId: CAMPAIGN_ID,
      regionId: 'region-coast',
      placeId: 'harbor',
      locationKind: 'settlement'
    })

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.locations).toEqual([
      {
        characterId: 'pc-placed',
        campaignId: CAMPAIGN_ID,
        regionId: 'region-coast',
        placeId: 'harbor',
        locationKind: 'settlement',
        updatedDay: 9
      }
    ])

    clearCharacterLocationStore()
    expect(getCharacterLocation('pc-placed')).toBeNull()
    importCampaignSlice(ctx, slice)
    expect(getCharacterLocation('pc-placed')).toEqual(slice.locations[0])
  })

  it('rejects location records for a different campaign', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice: CharacterCampaignSlice = {
      ...slice,
      locations: [
        {
          characterId: 'pc-wrong-camp',
          campaignId: 'other-campaign',
          regionId: 'r1',
          locationKind: 'overworld'
        }
      ]
    }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(CharacterPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/belongs to campaign/)
  })
})

describe('CharacterEngine campaign portability schema validation', () => {
  it('rejects unsupported slice versions', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, sliceVersion: 99 as typeof CHARACTER_SLICE_VERSION }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(CharacterPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/Unsupported character slice version/)
  })

  it('rejects campaignId mismatch', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, campaignId: 'other-campaign' }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(CharacterPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/campaignId mismatch/)
  })
})

function seedAndExport(): { ctx: { campaignId: string }; slice: CharacterCampaignSlice } {
  setCampaignDay(CAMPAIGN_ID, 3)
  restoreCompanionsForCampaign([
    {
      characterId: 'companion-schema',
      ownerCharacterId: 'pc-owner',
      campaignId: CAMPAIGN_ID,
      name: 'Schema',
      isCompanion: true,
      archetype: 'Fighter'
    }
  ])
  const ctx = { campaignId: CAMPAIGN_ID }
  return { ctx, slice: exportCampaignSlice(ctx) }
}
