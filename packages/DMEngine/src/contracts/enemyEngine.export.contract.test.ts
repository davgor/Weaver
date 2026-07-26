import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearEnemyStore,
  exportEnemyCampaignSlice,
  importEnemyCampaignSlice,
  saveGeneratedFoe
} from '@weaver/enemy-engine'

const CAMPAIGN_ID = 'contract-enemy'

beforeEach(() => {
  clearEnemyStore()
})

describe('DMEngine -> EnemyEngine export contract', () => {
  it('reads generated foe snapshots through the published export API', () => {
    saveGeneratedFoe({
      foeId: 'foe-contract',
      bestiaryId: 'goblin-skirmisher',
      difficulty: 'easy',
      tags: ['contract']
    })

    const slice = exportEnemyCampaignSlice({ campaignId: CAMPAIGN_ID })
    expect(slice.generatedFoes.map((foe) => foe.foeId)).toEqual(['foe-contract'])
    expect(slice.bestiaryIds).toContain('goblin-skirmisher')

    clearEnemyStore()
    importEnemyCampaignSlice({ campaignId: CAMPAIGN_ID }, slice)
    expect(exportEnemyCampaignSlice({ campaignId: CAMPAIGN_ID }).generatedFoes).toHaveLength(1)
  })
})
