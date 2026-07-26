import { beforeEach, describe, expect, it } from 'vitest'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import { ensureNpcPlaceholders } from '@weaver/civilization-engine'
import {
  clearNpcStore,
  constructNpc,
  getNpc,
  requestCompanionPortrait
} from '@weaver/npc-engine'
import { clearCharacterStatsStore } from '../hp.js'
import { clearCompanionStore, createCompanion } from '../companions.js'
import { clearStartingLoadoutStore, selectStartingLoadout } from '../startingLoadout.js'

describe('CharacterEngine -> NPCEngine companion portrait contract', () => {
  beforeEach(() => {
    clearCompanionStore()
    clearStartingLoadoutStore()
    clearCharacterStatsStore()
    clearNpcStore()
  })

  it('queues companion portraits through NPCEngine requestCompanionPortrait', async () => {
    selectStartingLoadout('pc-owner', 'Fighter')
    const companion = createCompanion({
      ownerCharacterId: 'pc-owner',
      campaignId: 'camp-contract',
      name: 'Ash',
      archetype: 'Cleric',
      bodyMod: 1
    })

    seedCompanionNpc(companion.characterId, 'camp-contract')
    const calls: string[] = []

    const result = requestCompanionPortrait(
      {
        companionId: companion.characterId,
        prompt: 'portrait prompt accepted by caller',
        settings: { provider: 'local', generativeTokensEnabled: true }
      },
      {
        generatePortrait: async (request) => {
          calls.push(request.subjectId)
          return {
            imagePath: `/portraits/${request.subjectId}.png`,
            provider: 'local',
            degraded: false
          }
        }
      }
    )

    expect(result).toEqual({
      queued: true,
      subjectKind: 'companion',
      subjectId: companion.characterId
    })
    await Promise.resolve()
    expect(calls).toEqual([companion.characterId])
    expect(getNpc(companion.characterId)?.portrait?.imagePath).toBe(
      `/portraits/${companion.characterId}.png`
    )
  })
})

function seedCompanionNpc(npcId: string, campaignId: string): void {
  setCampaignRaceRoster(campaignId, [{ raceId: 'human', name: 'Human' }])
  const [slot] = ensureNpcPlaceholders({
    worldId: 'world-contract',
    civilizationId: 'civ-contract',
    regionId: 'region-contract',
    roleHints: ['resident']
  })
  if (slot === undefined) {
    throw new Error('Failed to ensure NPC placeholder for companion portrait contract')
  }
  constructNpc({
    npcId,
    campaignId,
    worldId: 'world-contract',
    placeholderSlotId: slot.slotId,
    raceId: 'human',
    alignment: 'neutral',
    temperament: 'steady',
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
  })
}
