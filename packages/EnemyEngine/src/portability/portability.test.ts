import { beforeEach, describe, expect, it } from 'vitest'
import { clearEnemyStore, saveGeneratedFoe } from '../store.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import {
  ENEMY_SLICE_VERSION,
  EnemyPortabilitySchemaError,
  type EnemyCampaignSlice
} from './types.js'

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

describe('EnemyEngine campaign portability schema validation', () => {
  it('rejects unsupported slice versions', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, sliceVersion: 99 as typeof ENEMY_SLICE_VERSION }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(EnemyPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/Unsupported enemy slice version/)
  })

  it('rejects campaignId mismatch', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, campaignId: 'other-campaign' }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(EnemyPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/campaignId mismatch/)
  })
})

function seedAndExport(): { ctx: { campaignId: string }; slice: EnemyCampaignSlice } {
  saveGeneratedFoe({
    foeId: 'foe-schema',
    bestiaryId: 'goblin-skirmisher',
    difficulty: 'easy',
    tags: ['forest'],
    regionId: 'region-north'
  })
  const ctx = { campaignId: CAMPAIGN_ID }
  return { ctx, slice: exportCampaignSlice(ctx) }
}
