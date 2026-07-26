import { describe, expect, it, beforeEach } from 'vitest'
import { clearNpcStore, saveNpc } from '../store.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import {
  NPC_SLICE_VERSION,
  NpcPortabilitySchemaError,
  type NpcCampaignSlice
} from './types.js'

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

describe('NPCEngine campaign portability schema validation', () => {
  it('rejects unsupported slice versions', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, sliceVersion: 99 as typeof NPC_SLICE_VERSION }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(NpcPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/Unsupported NPC slice version/)
  })

  it('rejects campaignId mismatch on the slice', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, campaignId: 'other-campaign' }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(NpcPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/campaignId mismatch/)
  })

  it('rejects npc records belonging to a different campaign', () => {
    const { ctx, slice } = seedAndExport()
    const npc = slice.npcs[0]
    if (npc === undefined) {
      throw new Error('expected seeded npc')
    }
    const badSlice: NpcCampaignSlice = {
      ...slice,
      npcs: [{ ...npc, campaignId: 'other-campaign' }]
    }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(NpcPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/belongs to campaign/)
  })
})

function seedAndExport(): { ctx: { campaignId: string }; slice: NpcCampaignSlice } {
  saveNpc(minimalNpc('npc-schema'))
  const ctx = { campaignId: CAMPAIGN_ID }
  return { ctx, slice: exportCampaignSlice(ctx) }
}

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
