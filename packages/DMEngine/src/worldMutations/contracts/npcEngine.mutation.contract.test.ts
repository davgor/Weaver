import { beforeEach, describe, expect, it } from 'vitest'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import { clearNpcPlaceholderStore, ensureNpcPlaceholders } from '@weaver/civilization-engine'
import { applyNpcWorldMutation, clearNpcStore, constructNpc, getNpc } from '@weaver/npc-engine'
import { emitWorldMutation } from '../emitWorldMutation.js'

describe('DMEngine -> NPCEngine mutation contract', () => {
  beforeEach(() => {
    clearNpcStore()
    clearNpcPlaceholderStore()
    setCampaignRaceRoster('campaign-npc-contract', [{ raceId: 'human', name: 'Human' }])
  })

  it('applies typed NPC world mutation through NPCEngine public API', () => {
    const [slot] = ensureNpcPlaceholders({
      worldId: 'world-npc-contract',
      civilizationId: 'civ-npc-contract',
      regionId: 'region-npc-contract',
      roleHints: ['resident']
    })
    if (!slot) throw new Error('expected placeholder')
    constructNpc({
      campaignId: 'campaign-npc-contract',
      worldId: 'world-npc-contract',
      npcId: 'npc_contract',
      placeholderSlotId: slot.slotId,
      raceId: 'human',
      alignment: 'neutral',
      temperament: 'steady',
      abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
    })

    emitWorldMutation({
      target: 'npc',
      npcId: 'npc_contract',
      mutation: { kind: 'vanished' }
    }, {
      regional: unusedRegionMutation(),
      civilization: unusedSettlementMutation(),
      npc: { applyNpcWorldMutation }
    })

    expect(getNpc('npc_contract')?.worldStatus).toBe('vanished')
  })
})

function unusedRegionMutation() {
  return {
    applyRegionMutation: () => {
      throw new Error('not used')
    }
  }
}

function unusedSettlementMutation() {
  return {
    applySettlementMutation: () => {
      throw new Error('not used')
    }
  }
}
