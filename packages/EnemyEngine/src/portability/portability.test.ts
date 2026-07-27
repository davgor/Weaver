import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearEnemyStore,
  getCachedCombatToken,
  saveGeneratedFoe,
  setCachedCombatToken
} from '../store.js'
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
  it('round-trips durable generated foe snapshots including persisted combat tokens', () => {
    saveGeneratedFoe({
      foeId: 'foe-1',
      bestiaryId: 'goblin-skirmisher',
      difficulty: 'easy',
      tags: ['forest'],
      regionId: 'region-north',
      combatToken: { imagePath: 'tokens/foe-1.png', provider: 'local' }
    })
    setCachedCombatToken('prompt:goblin', {
      imagePath: 'tokens/cache-only.png',
      provider: 'cloud'
    })

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.generatedFoes).toEqual([
      {
        foeId: 'foe-1',
        bestiaryId: 'goblin-skirmisher',
        difficulty: 'easy',
        tags: ['forest'],
        regionId: 'region-north',
        combatToken: { imagePath: 'tokens/foe-1.png', provider: 'local' }
      }
    ])
    expect(slice.bestiaryIds).toContain('goblin-skirmisher')

    clearEnemyStore()
    importCampaignSlice(ctx, slice)
    const restored = exportCampaignSlice(ctx)
    expect(restored.generatedFoes).toEqual(slice.generatedFoes)
    expect(getCachedCombatToken('prompt:goblin')).toBeUndefined()
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
