import { describe, expect, it } from 'vitest'
import { createCampaignsService } from './campaignsService.js'
import type { CampaignPortablePackage } from '@weaver/dm-engine'
import type { CampaignCharacterLandingRecord } from '../../shared/campaigns/types.js'

const portablePackage = {
  version: 1,
  campaignId: 'imported-campaign',
  exportedAt: '2026-07-26T12:00:00.000Z',
  slices: {}
} as CampaignPortablePackage

function stubPorts(overrides: Partial<Parameters<typeof createCampaignsService>[0]> = {}) {
  return {
    getReview: async () => null,
    listCharacters: (_campaignId: string): CampaignCharacterLandingRecord[] => [],
    listDiskCampaigns: async () => [],
    campaignExistsOnDisk: () => false,
    exportCampaign: async () => portablePackage,
    importCampaign: async () => ({ campaignId: 'imported-campaign', name: 'imported-campaign' }),
    deleteCampaign: async () => ({ deleted: true as const }),
    ...overrides
  }
}

describe('campaignsService list and open', () => {
  it('lists the current generated campaign and opens completed campaigns to the hub', async () => {
    const service = createCampaignsService(
      stubPorts({
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
        listCharacters: () => [{ characterId: 'pc-1', phase: 'complete' }],
        campaignExistsOnDisk: () => true
      })
    )

    await expect(service.list()).resolves.toEqual([
      { id: 'camp-1', name: 'Ash Road', lastPlayedAt: null }
    ])
    await expect(service.open({ campaignId: 'camp-1' })).resolves.toEqual({
      campaignId: 'camp-1',
      landing: 'hub'
    })
  })

  it('opens campaigns without complete characters to the empty landing surface', async () => {
    const service = createCampaignsService(
      stubPorts({
        listCharacters: () => [{ characterId: 'pc-1', phase: 'background' }]
      })
    )

    await expect(service.open({ campaignId: 'camp-2' })).resolves.toEqual({
      campaignId: 'camp-2',
      landing: 'empty'
    })
  })
})

describe('campaignsService disk merge', () => {
  it('merges on-disk campaigns with the in-memory review snapshot', async () => {
    const service = createCampaignsService(
      stubPorts({
        getReview: async () => ({
          campaignId: 'camp-1',
          campaignName: 'Ash Road',
          deathMode: 'standard',
          generativeTokensEnabled: false,
          confirmed: true,
          status: 'ready',
          canon: 'Canon',
          pantheon: 'Pantheon',
          worldSummary: 'Summary',
          bestiaryFlavor: 'Beasts',
          storyPremise: 'Premise',
          regions: [],
          npcs: [],
          factions: []
        }),
        listDiskCampaigns: async () => [
          { id: 'camp-1', name: 'camp-1', lastPlayedAt: null },
          { id: 'imported', name: 'imported', lastPlayedAt: null }
        ],
        campaignExistsOnDisk: (campaignId) => campaignId === 'camp-1',
        importCampaign: async () => ({ campaignId: 'imported', name: 'imported' })
      })
    )

    await expect(service.list()).resolves.toEqual([
      { id: 'camp-1', name: 'Ash Road', lastPlayedAt: null },
      { id: 'imported', name: 'imported', lastPlayedAt: null }
    ])
  })
})

describe('campaignsService portability', () => {
  it('exports, imports, and deletes campaigns through injected portability ports', async () => {
    const service = createCampaignsService(
      stubPorts({
        exportCampaign: async ({ campaignId }) => ({ ...portablePackage, campaignId })
      })
    )

    await expect(service.export({ campaignId: 'camp-1' })).resolves.toMatchObject({
      campaignId: 'camp-1'
    })
    await expect(service.import({ package: portablePackage })).resolves.toEqual({
      campaignId: 'imported-campaign',
      name: 'imported-campaign'
    })
    await expect(service.delete({ campaignId: 'camp-1' })).resolves.toEqual({ deleted: true })
  })
})
