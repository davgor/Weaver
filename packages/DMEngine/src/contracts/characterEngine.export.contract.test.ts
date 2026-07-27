import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCharacterLocationStore,
  clearCompanionStore,
  exportCharacterCampaignSlice,
  importCharacterCampaignSlice,
  restoreCompanionsForCampaign,
  setCampaignDay,
  setCharacterLocation
} from '@weaver/character-engine'

const CAMPAIGN_ID = 'contract-character'

beforeEach(() => {
  clearCompanionStore()
  clearCharacterLocationStore()
  setCampaignDay(CAMPAIGN_ID, 0)
})

describe('DMEngine -> CharacterEngine export contract', () => {
  it('reads campaign day, character ids, and locations through the published export API', () => {
    setCampaignDay(CAMPAIGN_ID, 3)
    restoreCompanionsForCampaign([
      {
        characterId: 'companion-contract',
        ownerCharacterId: 'pc-owner',
        campaignId: CAMPAIGN_ID,
        name: 'Guide',
        isCompanion: true,
        archetype: 'Cleric'
      }
    ])
    setCharacterLocation({
      characterId: 'pc-owner',
      campaignId: CAMPAIGN_ID,
      regionId: 'region-export',
      locationKind: 'overworld'
    })

    const slice = exportCharacterCampaignSlice({ campaignId: CAMPAIGN_ID })
    expect(slice.day).toBe(3)
    expect(slice.sliceVersion).toBe(2)
    expect(slice.characterIds).toEqual(['companion-contract'])
    expect(slice.locations).toEqual([
      expect.objectContaining({
        characterId: 'pc-owner',
        regionId: 'region-export',
        locationKind: 'overworld'
      })
    ])

    clearCompanionStore()
    clearCharacterLocationStore()
    setCampaignDay(CAMPAIGN_ID, 0)
    importCharacterCampaignSlice({ campaignId: CAMPAIGN_ID }, slice)
    expect(exportCharacterCampaignSlice({ campaignId: CAMPAIGN_ID }).day).toBe(3)
    expect(exportCharacterCampaignSlice({ campaignId: CAMPAIGN_ID }).locations).toHaveLength(1)
  })
})
