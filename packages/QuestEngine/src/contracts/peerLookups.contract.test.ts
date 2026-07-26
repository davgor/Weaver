import { beforeEach, describe, expect, it } from 'vitest'
import { clearNpcStore, getNpc, saveNpc } from '@weaver/npc-engine'
import { createItemService } from '@weaver/item-engine'
import {
  QuestEngineError,
  clearQuestStores,
  seedWorldQuests
} from '../index.js'

beforeEach(() => {
  clearQuestStores()
  clearNpcStore()
})

describe('QuestEngine -> peer lookup accept path', () => {
  it('accepts seeds whose NPC/item targets exist in peer engines', () => {
    saveNpc(minimalNpc('npc-quest-contract'))
    const items = createItemService()
    items.defineTemplate({ id: 'item.quest-token', name: 'Quest Token' })

    const seeded = seedWorldQuests({
      campaignId: 'camp-quest-contract',
      worldId: 'world-contract',
      seed: 'contract-seed',
      pools: {
        regionIds: ['region-1'],
        placeIds: ['place-1'],
        npcIds: ['npc-quest-contract'],
        itemIds: ['item.quest-token']
      },
      counts: { main: 1, side: 0 },
      lookup: peerLookup(items)
    })

    expect(seeded).toHaveLength(1)
    expect(seeded[0]?.objectives.some((o) => o.targetId === 'npc-quest-contract')).toBe(true)
    expect(getNpc('npc-quest-contract')).toBeDefined()
  })
})

describe('QuestEngine -> peer lookup reject path', () => {
  it('rejects unknown NPC ids through the same lookup shape', () => {
    expect(() =>
      seedWorldQuests({
        campaignId: 'camp-quest-bad',
        worldId: 'world-contract',
        seed: 'bad-seed',
        pools: {
          regionIds: ['region-1'],
          placeIds: ['place-1'],
          npcIds: ['npc.missing'],
          itemIds: ['item.x']
        },
        counts: { main: 1, side: 0 },
        lookup: {
          hasNpc: (npcId) => getNpc(npcId) !== undefined,
          hasPlace: () => true,
          hasItem: () => true
        }
      })
    ).toThrow(QuestEngineError)
  })
})

function peerLookup(items: ReturnType<typeof createItemService>) {
  return {
    hasNpc: (npcId: string) => getNpc(npcId) !== undefined,
    hasPlace: (placeId: string) => placeId === 'place-1',
    hasItem: (itemId: string) => {
      try {
        items.getTemplate(itemId)
        return true
      } catch {
        return false
      }
    }
  }
}

function minimalNpc(npcId: string) {
  return {
    npcId,
    campaignId: 'camp-quest-contract',
    worldId: 'world-contract',
    regionId: 'region-1',
    civilizationId: 'civ-1',
    placeholder: {
      slotId: 'slot-1',
      civilizationId: 'civ-1',
      worldId: 'world-contract',
      regionId: 'region-1',
      roleHint: 'merchant' as const,
      status: 'assigned' as const,
      assignedNpcId: npcId
    },
    identity: {
      race: { raceId: 'human', name: 'Human' },
      alignment: 'neutral',
      temperament: 'calm',
      nonSpeaking: false
    },
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    abilityModifiers: { Body: 0, Agility: 0, Mind: 0, Presence: 0 },
    speciesKind: 'person' as const,
    combatStats: { kind: 'civilian' as const, maxHp: 10, currentHp: 10 },
    factionIds: [] as string[]
  }
}
