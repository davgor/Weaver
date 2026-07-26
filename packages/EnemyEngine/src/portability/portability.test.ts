import { beforeEach, describe, expect, it } from 'vitest'
import { clearEnemyStore, saveGeneratedFoe } from '../store.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'

const CAMPAIGN_ID = 'campaign-enemy'

beforeEach(() => {
  clearEnemyStore()
})

describe('EnemyEngine campaign portability', () => {
  it('round-trips generated foe snapshots', () => {
    saveGeneratedFoe({
      foeId: 'foe-1',
      bestiaryId: 'goblin-skirmisher',
      difficulty: 'easy',
      tags: ['forest'],
      regionId: 'region-north'
    })

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.generatedFoes).toHaveLength(1)
    expect(slice.bestiaryIds).toContain('goblin-skirmisher')

    clearEnemyStore()
    importCampaignSlice(ctx, slice)
    const restored = exportCampaignSlice(ctx)
    expect(restored.generatedFoes.map((foe) => foe.foeId)).toEqual(['foe-1'])
  })
})
