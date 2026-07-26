import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders,
  listNpcPlaceholders
} from '@weaver/civilization-engine'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import { clearNpcStore, constructNpc } from '../index.js'

describe('NPCEngine -> CivilizationEngine placeholder contract', () => {
  beforeEach(() => {
    clearNpcStore()
    clearNpcPlaceholderStore()
    setCampaignRaceRoster('campaign-civ-contract', [{ raceId: 'human', name: 'Human' }])
  })

  it('claims real placeholder slots and leaves them assigned to the constructed NPC', () => {
    const [slot] = ensureNpcPlaceholders({
      worldId: 'world-civ-contract',
      civilizationId: 'civ-contract',
      regionId: 'region-civ-contract',
      roleHints: ['merchant']
    })

    const npc = constructNpc({
      campaignId: 'campaign-civ-contract',
      worldId: 'world-civ-contract',
      npcId: 'npc-civ-contract',
      placeholderSlotId: slot.slotId,
      raceId: 'human',
      alignment: 'neutral',
      temperament: 'direct',
      abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
    })

    const [storedSlot] = listNpcPlaceholders('world-civ-contract', 'civ-contract')
    expect(npc.placeholder.assignedNpcId).toBe('npc-civ-contract')
    expect(storedSlot).toMatchObject({ status: 'assigned', assignedNpcId: 'npc-civ-contract' })
  })
})
