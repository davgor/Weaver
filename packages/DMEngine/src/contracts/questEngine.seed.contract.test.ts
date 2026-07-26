import { beforeEach, describe, expect, it } from 'vitest'
import { listQuestLog, upsertQuest } from '@weaver/character-engine'
import {
  clearQuestStores,
  listWorldQuests,
  seedWorldQuests
} from '@weaver/quest-engine'
import { proposeQuest } from '../quests/questOrchestration.js'

/**
 * DMEngine -> QuestEngine seed contract + CharacterEngine log id compatibility.
 *
 * Campaign-gen pipeline wiring lives in
 * `campaignGen/contracts/questSeed.contract.test.ts` (102). This pins seed +
 * propose/upsert using the same questId strings.
 */
describe('DMEngine -> QuestEngine seed contract (097)', () => {
  beforeEach(() => {
    clearQuestStores()
  })

  it('seeds world quests and reuses questIds in the CharacterEngine log', () => {
    const seeded = seedWorldQuests({
      campaignId: 'camp-dm-quest-seed',
      worldId: 'world-dm-quest-seed',
      seed: 'dm-seed',
      pools: {
        regionIds: ['region-a'],
        placeIds: ['place-a'],
        npcIds: ['npc-a'],
        itemIds: ['item-a']
      },
      counts: { main: 1, side: 1 }
    })

    expect(listWorldQuests('camp-dm-quest-seed')).toHaveLength(2)
    const main = seeded.find((quest) => quest.kind === 'main')
    expect(main).toBeDefined()

    proposeQuest(
      { upsertQuest, listQuestLog },
      {
        hasNpc: () => true,
        hasPlace: () => true,
        hasItem: () => true
      },
      {
        characterId: 'pc-dm-quest-seed',
        questId: main!.questId,
        kind: 'main',
        title: main!.title ?? 'Seeded main quest',
        npcId: 'npc-a',
        placeId: 'place-a',
        itemId: 'item-a'
      }
    )

    expect(listQuestLog('pc-dm-quest-seed')).toEqual([
      expect.objectContaining({
        questId: main!.questId,
        kind: 'main',
        status: 'active'
      })
    ])
  })
})
