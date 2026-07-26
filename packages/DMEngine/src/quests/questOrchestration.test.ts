import { describe, expect, it } from 'vitest'
import { listQuestLog, upsertQuest } from '@weaver/character-engine'
import { DmQuestError } from './errors.js'
import {
  completeQuest,
  failQuest,
  proposeQuest,
  updateQuestProgress
} from './questOrchestration.js'
import type { CharacterQuestApi, QuestReferenceLookup } from './types.js'

describe('questOrchestration propose', () => {
  it('proposes main and side quests through CharacterEngine without a shadow list', () => {
    const quests = characterQuestApi()
    const refs = allKnownRefs()

    proposeQuest(quests, refs, {
      characterId: 'pc-quest-propose',
      questId: 'quest-main-1',
      kind: 'main',
      title: 'Find the Spindle',
      npcId: 'npc.guide'
    })
    proposeQuest(quests, refs, {
      characterId: 'pc-quest-propose',
      questId: 'quest-side-1',
      kind: 'side',
      title: 'Fetch herbs',
      placeId: 'place.grove',
      itemId: 'item.herb-pouch'
    })

    expect(listQuestLog('pc-quest-propose')).toEqual([
      {
        questId: 'quest-main-1',
        kind: 'main',
        status: 'active',
        title: 'Find the Spindle'
      },
      {
        questId: 'quest-side-1',
        kind: 'side',
        status: 'active',
        title: 'Fetch herbs'
      }
    ])
  })
})

describe('questOrchestration reference checks', () => {
  it('rejects proposals that reference missing NPC, place, or item', () => {
    const quests = characterQuestApi()
    const refs = allKnownRefs()

    expect(() =>
      proposeQuest(quests, refs, {
        characterId: 'pc-quest-fk',
        questId: 'quest-bad-npc',
        kind: 'side',
        title: 'Talk to nobody',
        npcId: 'npc.missing'
      })
    ).toThrow(DmQuestError)

    expect(() =>
      proposeQuest(quests, refs, {
        characterId: 'pc-quest-fk',
        questId: 'quest-bad-place',
        kind: 'side',
        title: 'Go nowhere',
        placeId: 'place.missing'
      })
    ).toThrow(DmQuestError)

    expectMissingItemRejection(quests, refs)
    expect(listQuestLog('pc-quest-fk')).toEqual([])
  })
})

describe('questOrchestration progress', () => {
  it('updates progress and completes or fails via explicit transitions', () => {
    const quests = characterQuestApi()
    const refs = allKnownRefs()

    proposeQuest(quests, refs, {
      characterId: 'pc-quest-progress',
      questId: 'quest-progress-1',
      kind: 'main',
      title: 'Start'
    })

    updateQuestProgress(quests, {
      characterId: 'pc-quest-progress',
      questId: 'quest-progress-1',
      title: 'Halfway there'
    })
    expect(listQuestLog('pc-quest-progress')[0]?.title).toBe('Halfway there')
    expect(listQuestLog('pc-quest-progress')[0]?.status).toBe('active')

    completeQuest(quests, {
      characterId: 'pc-quest-progress',
      questId: 'quest-progress-1'
    })
    expect(listQuestLog('pc-quest-progress')[0]?.status).toBe('complete')

    proposeQuest(quests, refs, {
      characterId: 'pc-quest-progress',
      questId: 'quest-progress-2',
      kind: 'side',
      title: 'Doomed errand'
    })
    failQuest(quests, {
      characterId: 'pc-quest-progress',
      questId: 'quest-progress-2'
    })
    expect(listQuestLog('pc-quest-progress').find((q) => q.questId === 'quest-progress-2')?.status).toBe(
      'failed'
    )
  })
})

function expectMissingItemRejection(quests: CharacterQuestApi, refs: QuestReferenceLookup): void {
  try {
    proposeQuest(quests, refs, {
      characterId: 'pc-quest-fk',
      questId: 'quest-bad-item',
      kind: 'side',
      title: 'Find nothing',
      itemId: 'item.missing'
    })
    expect.unreachable('expected item FK rejection')
  } catch (error) {
    expect(error).toBeInstanceOf(DmQuestError)
    expect(error).toMatchObject({
      code: 'DM_QUEST_INVALID_REFERENCE',
      referenceKind: 'item',
      referenceId: 'item.missing'
    })
  }
}

function characterQuestApi(): CharacterQuestApi {
  return { upsertQuest, listQuestLog }
}

function allKnownRefs(): QuestReferenceLookup {
  const npcs = new Set(['npc.guide'])
  const places = new Set(['place.grove'])
  const items = new Set(['item.herb-pouch'])
  return {
    hasNpc: (npcId) => npcs.has(npcId),
    hasPlace: (placeId) => places.has(placeId),
    hasItem: (itemId) => items.has(itemId)
  }
}
