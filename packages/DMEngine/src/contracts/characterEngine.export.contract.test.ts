import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCompanionStore,
  exportCharacterCampaignSlice,
  importCharacterCampaignSlice,
  restoreCompanionsForCampaign,
  setCampaignDay
} from '@weaver/character-engine'

const CAMPAIGN_ID = 'contract-character'

beforeEach(() => {
  clearCompanionStore()
  setCampaignDay(CAMPAIGN_ID, 0)
})

describe('DMEngine -> CharacterEngine export contract', () => {
  it('reads campaign day and character ids through the published export API', () => {
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

    const slice = exportCharacterCampaignSlice({ campaignId: CAMPAIGN_ID })
    expect(slice.day).toBe(3)
    expect(slice.characterIds).toEqual(['companion-contract'])

    clearCompanionStore()
    setCampaignDay(CAMPAIGN_ID, 0)
    importCharacterCampaignSlice({ campaignId: CAMPAIGN_ID }, slice)
    expect(exportCharacterCampaignSlice({ campaignId: CAMPAIGN_ID }).day).toBe(3)
  })
})
