import { beforeEach, describe, expect, it } from 'vitest'
import { clearCompanionStore, restoreCompanionsForCampaign } from '../companions.js'
import { clearDeathModeStores } from '../deathModes.js'
import { setCampaignDay } from '../timeRest.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'

const CAMPAIGN_ID = 'campaign-character'

beforeEach(() => {
  clearCompanionStore()
  clearDeathModeStores()
  setCampaignDay(CAMPAIGN_ID, 0)
})

describe('CharacterEngine campaign portability', () => {
  it('round-trips campaign day and companion ids', () => {
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
    expect(slice.characterIds).toEqual(['companion-1'])

    clearCompanionStore()
    setCampaignDay(CAMPAIGN_ID, 0)
    importCampaignSlice(ctx, slice)
    const restored = exportCampaignSlice(ctx)
    expect(restored.day).toBe(4)
    expect(restored.characterIds).toEqual(['companion-1'])
  })
})
