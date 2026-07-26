import { beforeEach, describe, expect, it } from 'vitest'
import {
  QuestEngineError,
  clearQuestStores,
  listWorldQuests,
  seedWorldQuests
} from './index.js'

const pools = {
  regionIds: ['region-a', 'region-b'],
  placeIds: ['place-a', 'place-b'],
  npcIds: ['npc-a', 'npc-b'],
  itemIds: ['item-a', 'item-b']
}

beforeEach(() => {
  clearQuestStores()
})

describe('seedWorldQuests determinism', () => {
  it('is deterministic for the same inputs', () => {
    const input = {
      campaignId: 'camp-seed',
      worldId: 'world-1',
      seed: 'seed-alpha',
      pools,
      counts: { main: 1, side: 2 }
    }
    const first = seedWorldQuests(input)
    const second = seedWorldQuests(input)
    expect(first).toEqual(second)
    expect(first).toHaveLength(3)
    expect(first.map((quest) => quest.kind).sort()).toEqual(['main', 'side', 'side'])
    expect(objectivesUsePools(first)).toBe(true)
  })
})

describe('seedWorldQuests idempotency', () => {
  it('replaces prior quests for the campaign on re-seed', () => {
    seedWorldQuests({
      campaignId: 'camp-replace',
      worldId: 'world-1',
      seed: 'seed-one',
      pools,
      counts: { main: 1, side: 0 }
    })
    expect(listWorldQuests('camp-replace')).toHaveLength(1)

    const replaced = seedWorldQuests({
      campaignId: 'camp-replace',
      worldId: 'world-1',
      seed: 'seed-two',
      pools,
      counts: { main: 1, side: 1 }
    })
    expect(replaced).toHaveLength(2)
    expect(listWorldQuests('camp-replace').map((quest) => quest.brief)).toEqual([
      'Seeded from seed-two',
      'Seeded from seed-two'
    ])
  })
})

describe('seedWorldQuests FK guards', () => {
  it('rejects dangling FKs when a lookup is provided', () => {
    expect(() =>
      seedWorldQuests({
        campaignId: 'camp-fk',
        worldId: 'world-1',
        seed: 'seed-fk',
        pools,
        lookup: {
          hasNpc: () => false,
          hasPlace: () => true,
          hasItem: () => true
        }
      })
    ).toThrowError(QuestEngineError)
  })
})

function objectivesUsePools(quests: ReturnType<typeof seedWorldQuests>): boolean {
  return quests.every((quest) =>
    quest.objectives.every((objective) => {
      if (objective.kind === 'talk_to_npc') return pools.npcIds.includes(objective.targetId)
      if (objective.kind === 'reach_place') return pools.placeIds.includes(objective.targetId)
      return pools.itemIds.includes(objective.targetId)
    })
  )
}
