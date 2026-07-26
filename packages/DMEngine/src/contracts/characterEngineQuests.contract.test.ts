import { describe, expect, it } from 'vitest'
import { listQuestLog, upsertQuest } from '@weaver/character-engine'
import {
  completeQuest,
  proposeQuest,
  updateQuestProgress
} from '../quests/questOrchestration.js'
import type { QuestReferenceLookup } from '../quests/types.js'

describe('DMEngine -> CharacterEngine quest-log contract (028)', () => {
  it('proposes, updates, and completes a quest end-to-end against the real quest API', () => {
    const characterId = 'pc-dm-quest-contract'
    const questApi = { upsertQuest, listQuestLog }
    const refs = permissiveRefs()

    proposeQuest(questApi, refs, {
      characterId,
      questId: 'quest.contract-main',
      kind: 'main',
      title: 'Escort the guide',
      npcId: 'npc-dm-quest-contract',
      placeId: 'place.contract-grove',
      itemId: 'item.contract-token'
    })

    expect(listQuestLog(characterId)).toEqual([
      {
        questId: 'quest.contract-main',
        kind: 'main',
        status: 'active',
        title: 'Escort the guide'
      }
    ])

    updateQuestProgress(questApi, {
      characterId,
      questId: 'quest.contract-main',
      title: 'Reached the grove'
    })
    completeQuest(questApi, { characterId, questId: 'quest.contract-main' })

    expect(listQuestLog(characterId)).toEqual([
      {
        questId: 'quest.contract-main',
        kind: 'main',
        status: 'complete',
        title: 'Reached the grove'
      }
    ])
  })
})

function permissiveRefs(): QuestReferenceLookup {
  return {
    hasNpc: () => true,
    hasPlace: () => true,
    hasItem: () => true
  }
}
