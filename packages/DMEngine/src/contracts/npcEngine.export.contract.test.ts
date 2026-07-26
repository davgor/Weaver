import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearNpcStore,
  exportNpcCampaignSlice,
  importNpcCampaignSlice,
  saveNpc
} from '@weaver/npc-engine'

const CAMPAIGN_ID = 'contract-npc'

beforeEach(() => {
  clearNpcStore()
})

describe('DMEngine -> NPCEngine export contract', () => {
  it('reads campaign npc ids through the published export API', () => {
    saveNpc(minimalNpc('npc-contract'))

    const slice = exportNpcCampaignSlice({ campaignId: CAMPAIGN_ID })
    expect(slice.npcIds).toEqual(['npc-contract'])

    clearNpcStore()
    importNpcCampaignSlice({ campaignId: CAMPAIGN_ID }, slice)
    expect(exportNpcCampaignSlice({ campaignId: CAMPAIGN_ID }).npcIds).toEqual(['npc-contract'])
  })
})

function minimalNpc(npcId: string) {
  return {
    npcId,
    campaignId: CAMPAIGN_ID,
    worldId: CAMPAIGN_ID,
    regionId: 'region-a',
    civilizationId: 'civ-contract',
    placeholder: {
      slotId: 'slot-1',
      civilizationId: 'civ-contract',
      worldId: CAMPAIGN_ID,
      regionId: 'region-a',
      roleHint: 'guard' as const,
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
