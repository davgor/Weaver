import { describe, expect, it, beforeEach } from 'vitest'
import { clearNpcStore, saveNpc } from '../store.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'

const CAMPAIGN_ID = 'campaign-npc'

beforeEach(() => {
  clearNpcStore()
})

describe('NPCEngine campaign portability', () => {
  it('round-trips campaign npc ids', () => {
    saveNpc(minimalNpc('npc-a'))
    saveNpc(minimalNpc('npc-b'))

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.npcIds.sort()).toEqual(['npc-a', 'npc-b'])

    clearNpcStore()
    importCampaignSlice(ctx, slice)
    const restored = exportCampaignSlice(ctx)
    expect(restored.npcIds.sort()).toEqual(['npc-a', 'npc-b'])
  })
})

function minimalNpc(npcId: string) {
  return {
    npcId,
    campaignId: CAMPAIGN_ID,
    worldId: CAMPAIGN_ID,
    regionId: 'region-north',
    civilizationId: 'civ-hamlet',
    placeholder: {
      slotId: 'slot-1',
      civilizationId: 'civ-hamlet',
      worldId: CAMPAIGN_ID,
      regionId: 'region-north',
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
