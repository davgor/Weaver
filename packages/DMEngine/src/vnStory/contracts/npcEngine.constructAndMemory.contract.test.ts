import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import {
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders
} from '@weaver/civilization-engine'
import {
  appendNpcMemory,
  clearNpcStore,
  constructNpc,
  queryNpcGroundingContext
} from '@weaver/npc-engine'

const CAMPAIGN_ID = 'vn-npc-contract'
const WORLD_ID = `${CAMPAIGN_ID}-vn-world`
const CIV_ID = `${CAMPAIGN_ID}-vn-civ`
const REGION_ID = `${CAMPAIGN_ID}-vn-region`

beforeEach(() => {
  clearNpcStore()
  clearNpcPlaceholderStore()
  setCampaignRaceRoster(CAMPAIGN_ID, [{ raceId: 'human', name: 'Human' }])
})

afterEach(() => {
  clearNpcStore()
  clearNpcPlaceholderStore()
})

describe('DMEngine vnStory -> NPCEngine constructAndMemory contract', () => {
  it('constructs multiple NPCs via placeholders and isolates private memories', () => {
    const slots = ensureNpcPlaceholders({
      worldId: WORLD_ID,
      civilizationId: CIV_ID,
      regionId: REGION_ID,
      roleHints: ['resident', 'merchant']
    })
    expect(slots).toHaveLength(2)

    const npcA = constructNpc(npcInput(slots[0]!.slotId, 'npc-a', 'Mira Bell'))
    const npcB = constructNpc(npcInput(slots[1]!.slotId, 'npc-b', 'Jon Quill'))
    appendNpcMemory({
      npcId: npcA.npcId,
      text: 'Mira saw the lantern thief flee east.',
      provenance: { eventId: 'mem-a' }
    })
    appendNpcMemory({
      npcId: npcB.npcId,
      text: 'Jon heard coins clink under the pier.',
      provenance: { eventId: 'mem-b' }
    })

    const contextA = queryNpcGroundingContext({ npcId: npcA.npcId })
    const contextB = queryNpcGroundingContext({ npcId: npcB.npcId })

    expect(contextA.privateMemories.map((memory) => memory.text)).toEqual([
      'Mira saw the lantern thief flee east.'
    ])
    expect(contextB.privateMemories.map((memory) => memory.text)).toEqual([
      'Jon heard coins clink under the pier.'
    ])
    expect(contextA.privateMemories[0]?.text).not.toContain('Jon')
    expect(contextB.privateMemories[0]?.text).not.toContain('Mira')
  })
})

function npcInput(slotId: string, npcId: string, displayName: string) {
  return {
    campaignId: CAMPAIGN_ID,
    worldId: WORLD_ID,
    npcId,
    placeholderSlotId: slotId,
    raceId: 'human',
    alignment: 'neutral',
    temperament: 'curious',
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    displayName
  }
}
