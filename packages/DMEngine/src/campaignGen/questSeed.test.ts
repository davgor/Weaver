import { describe, expect, it } from 'vitest'
import { seedCampaignQuests } from './questSeed.js'
import type { CampaignGenerationDeps, GenerationState } from './types.js'

describe('seedCampaignQuests', () => {
  it('calls seedWorldQuests with peer id pools', () => {
    const calls: unknown[] = []
    const quests = [sampleQuest()]
    const state = baseState()
    const deps = questDeps(calls, quests)

    expect(seedCampaignQuests(state, deps)).toEqual(quests)
    expect(calls).toEqual([
      {
        campaignId: 'c',
        worldId: 'w',
        seed: 'seed',
        pools: {
          regionIds: ['region-1'],
          placeIds: ['civ-1'],
          npcIds: ['npc-1'],
          itemIds: ['item-1']
        }
      }
    ])
    expect(state.quests).toEqual(quests)
  })

  it('skips seeding when a required pool is empty', () => {
    const state = baseState()
    state.npcs = []
    let called = false
    const deps = questDeps([], [], () => {
      called = true
    })

    expect(seedCampaignQuests(state, deps)).toEqual([])
    expect(called).toBe(false)
    expect(state.quests).toEqual([])
  })
})

function sampleQuest() {
  return {
    questId: 'c:main:1',
    campaignId: 'c',
    worldId: 'w',
    templateId: 'template:main',
    kind: 'main' as const,
    status: 'seeded' as const,
    objectives: []
  }
}

function questDeps(
  calls: unknown[],
  quests: ReturnType<typeof sampleQuest>[],
  onCall?: () => void
): CampaignGenerationDeps {
  return {
    quest: {
      listSeedItemIds: () => ['item-1'],
      seedWorldQuests: (input) => {
        onCall?.()
        calls.push(input)
        return quests
      }
    }
  } as CampaignGenerationDeps
}

function baseState(): GenerationState {
  return {
    input: {
      campaignId: 'c',
      dataRoot: '/tmp',
      campaignFilePath: '/tmp/c.sqlite',
      regionCount: 1,
      npcsPerRegion: 1
    },
    seed: 'seed',
    worldId: 'w',
    stages: [],
    factions: [],
    regions: [{ regionId: 'region-1' } as GenerationState['regions'][number]],
    civilizations: [{ civilizationId: 'civ-1' } as GenerationState['civilizations'][number]],
    placeholders: [],
    npcs: [{ npcId: 'npc-1' } as GenerationState['npcs'][number]],
    foes: [],
    quests: [],
    catalogEntries: []
  }
}
