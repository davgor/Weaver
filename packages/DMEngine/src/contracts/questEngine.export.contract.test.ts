import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearQuestStores,
  exportQuestCampaignSlice,
  importQuestCampaignSlice,
  listWorldQuests,
  QUEST_SLICE_VERSION,
  seedWorldQuests
} from '@weaver/quest-engine'

const CAMPAIGN_ID = 'contract-quest'
const WORLD_ID = 'world-contract-quest'

beforeEach(() => {
  clearQuestStores()
})

describe('DMEngine -> QuestEngine export contract', () => {
  it('reads and restores seeded world quests through the published APIs', () => {
    expect(exportQuestCampaignSlice({ campaignId: CAMPAIGN_ID }).worldQuests).toEqual([])

    seedWorldQuests({
      campaignId: CAMPAIGN_ID,
      worldId: WORLD_ID,
      seed: 'contract-quest-seed',
      pools: {
        regionIds: ['r1'],
        placeIds: ['p1'],
        npcIds: ['n1'],
        itemIds: ['i1']
      },
      counts: { main: 1, side: 0 }
    })
    const slice = exportQuestCampaignSlice({ campaignId: CAMPAIGN_ID })
    expect(slice.sliceVersion).toBe(QUEST_SLICE_VERSION)
    expect(slice.worldQuests).toHaveLength(1)

    clearQuestStores()
    importQuestCampaignSlice({ campaignId: CAMPAIGN_ID }, slice)
    expect(listWorldQuests(CAMPAIGN_ID)).toEqual(slice.worldQuests)
  })
})
