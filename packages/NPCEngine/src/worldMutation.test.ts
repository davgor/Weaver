import { beforeEach, describe, expect, it } from 'vitest'
import { clearNpcPlaceholderStore, ensureNpcPlaceholders } from '@weaver/civilization-engine'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import { applyNpcWorldMutation, clearNpcStore, constructNpc, getNpc } from './index.js'

describe('NPC world mutations', () => {
  beforeEach(() => {
    clearNpcStore()
    clearNpcPlaceholderStore()
    setCampaignRaceRoster('campaign-npc-mutation', [{ raceId: 'human', name: 'Human' }])
  })

  it('persists typed hard world status separately from combat defeat disposition', () => {
    const [slot] = ensureNpcPlaceholders({
      worldId: 'world-npc-mutation',
      civilizationId: 'civ-npc-mutation',
      regionId: 'region-npc-mutation',
      roleHints: ['resident']
    })
    if (!slot) throw new Error('expected placeholder')
    constructNpc({
      campaignId: 'campaign-npc-mutation',
      worldId: 'world-npc-mutation',
      npcId: 'npc_mutated',
      placeholderSlotId: slot.slotId,
      raceId: 'human',
      alignment: 'neutral',
      temperament: 'steady',
      abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
    })

    const mutated = applyNpcWorldMutation('npc_mutated', { kind: 'killed' })

    expect(mutated.worldStatus).toBe('killed')
    expect(mutated.defeatDisposition).toBeUndefined()
    expect(getNpc('npc_mutated')?.worldStatus).toBe('killed')
  })
})
