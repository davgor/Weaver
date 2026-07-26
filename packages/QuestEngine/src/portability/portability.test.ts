import { beforeEach, describe, expect, it } from 'vitest'
import { clearQuestStores, seedWorldQuests } from '../index.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import {
  QUEST_SLICE_VERSION,
  QuestPortabilitySchemaError,
  type QuestCampaignSlice
} from './types.js'

const CAMPAIGN_ID = 'campaign-quest-port'

beforeEach(() => {
  clearQuestStores()
})

describe('QuestEngine campaign portability', () => {
  it('round-trips empty and non-empty world quest sets', () => {
    const ctx = { campaignId: CAMPAIGN_ID }
    expect(exportCampaignSlice(ctx).worldQuests).toEqual([])

    seedWorldQuests({
      campaignId: CAMPAIGN_ID,
      worldId: 'world-port',
      seed: 'port-seed',
      pools: {
        regionIds: ['r1'],
        placeIds: ['p1'],
        npcIds: ['n1'],
        itemIds: ['i1']
      },
      counts: { main: 1, side: 0 }
    })
    const slice = exportCampaignSlice(ctx)
    expect(slice.sliceVersion).toBe(QUEST_SLICE_VERSION)
    expect(slice.worldQuests).toHaveLength(1)

    clearQuestStores()
    importCampaignSlice(ctx, slice)
    expect(exportCampaignSlice(ctx)).toEqual(slice)
  })

  it('rejects unsupported versions and campaign mismatches', () => {
    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    const badVersion = { ...slice, sliceVersion: 99 as typeof QUEST_SLICE_VERSION }
    expect(() => importCampaignSlice(ctx, badVersion)).toThrow(QuestPortabilitySchemaError)

    const badCampaign: QuestCampaignSlice = { ...slice, campaignId: 'other' }
    expect(() => importCampaignSlice(ctx, badCampaign)).toThrow(/campaignId mismatch/)
  })
})
