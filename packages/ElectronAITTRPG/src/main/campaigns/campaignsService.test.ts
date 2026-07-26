import { describe, expect, it } from 'vitest'
import { createCampaignsService } from './campaignsService.js'

describe('campaignsService', () => {
  it('lists the current generated campaign and opens completed campaigns to the hub', async () => {
    const service = createCampaignsService({
      getReview: async () => ({
        campaignId: 'camp-1',
        campaignName: 'Ash Road',
        deathMode: 'standard',
        generativeTokensEnabled: false,
        confirmed: true,
        status: 'ready',
        canon: 'Canon',
        pantheon: 'Pantheon',
        worldSummary: 'A road under ember skies.',
        bestiaryFlavor: 'Ash beasts',
        storyPremise: 'Find the missing caravan.',
        regions: [],
        npcs: [],
        factions: []
      }),
      listCharacters: () => [{ characterId: 'pc-1', phase: 'complete' }]
    })

    await expect(service.list()).resolves.toEqual([
      { id: 'camp-1', name: 'Ash Road', lastPlayedAt: null }
    ])
    await expect(service.open({ campaignId: 'camp-1' })).resolves.toEqual({
      campaignId: 'camp-1',
      landing: 'hub'
    })
  })

  it('opens campaigns without complete characters to the empty landing surface', async () => {
    const service = createCampaignsService({
      getReview: async () => null,
      listCharacters: () => [{ characterId: 'pc-1', phase: 'background' }]
    })

    await expect(service.open({ campaignId: 'camp-2' })).resolves.toEqual({
      campaignId: 'camp-2',
      landing: 'empty'
    })
  })
})
