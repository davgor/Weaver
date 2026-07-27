import { describe, expect, it, beforeEach } from 'vitest'
import { clearDmOpinionStore, getNpcDossier, upsertDmNpcOpinion } from '../dossier.js'
import {
  addNpcToFaction,
  clearFactionStore,
  createFaction,
  getFactionRelation,
  getReputationStanding,
  setFactionRelation,
  updateReputation
} from '../factions.js'
import { getNpcLocation, setNpcLocation } from '../location.js'
import { appendNpcMemory, appendWorldFact } from '../memory.js'
import { clearOpinionStore, listNpcOpinionsHeldBy, upsertNpcOpinion } from '../opinions.js'
import { clearNpcStore, listMemories, listWorldFacts, saveNpc } from '../store.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import {
  NPC_SLICE_VERSION,
  NpcPortabilitySchemaError,
  type NpcCampaignSlice
} from './types.js'

const CAMPAIGN_ID = 'campaign-npc'

beforeEach(() => {
  clearNpcStore()
  clearFactionStore()
  clearOpinionStore()
  clearDmOpinionStore()
})

describe('NPCEngine campaign portability', () => {
  it('round-trips campaign npc ids and empty locations', () => {
    saveNpc(minimalNpc('npc-a'))
    saveNpc(minimalNpc('npc-b'))

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.npcIds.sort()).toEqual(['npc-a', 'npc-b'])
    expect(slice.locations).toEqual([])
    expect(slice.sliceVersion).toBe(NPC_SLICE_VERSION)

    clearNpcStore()
    importCampaignSlice(ctx, slice)
    const restored = exportCampaignSlice(ctx)
    expect(restored.npcIds.sort()).toEqual(['npc-a', 'npc-b'])
    expect(restored.locations).toEqual([])
  })
})

describe('NPCEngine campaign portability locations', () => {
  it('round-trips non-empty NPC current locations', () => {
    saveNpc(minimalNpc('npc-placed'))
    setNpcLocation({
      npcId: 'npc-placed',
      campaignId: CAMPAIGN_ID,
      regionId: 'region-moved',
      placeId: 'place-inn',
      locationKind: 'settlement',
      updatedDay: 4
    })

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.locations).toEqual([
      {
        npcId: 'npc-placed',
        campaignId: CAMPAIGN_ID,
        regionId: 'region-moved',
        placeId: 'place-inn',
        locationKind: 'settlement',
        updatedDay: 4
      }
    ])

    clearNpcStore()
    importCampaignSlice(ctx, slice)
    expect(getNpcLocation('npc-placed')).toEqual(slice.locations[0])
  })

  it('rejects location records belonging to a different campaign', () => {
    saveNpc(minimalNpc('npc-loc-mismatch'))
    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    const badSlice: NpcCampaignSlice = {
      ...slice,
      locations: [
        {
          npcId: 'npc-loc-mismatch',
          campaignId: 'other-campaign',
          regionId: 'region-x',
          locationKind: 'overworld'
        }
      ]
    }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(NpcPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/belongs to campaign/)
  })
})

describe('NPCEngine campaign portability durable rows', () => {
  it('exports memories, factions, reputations, opinions, DM opinions, and world facts', () => {
    seedDurableNpcRows()

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.memories).toEqual([expectedMemory()])
    expect(slice.factions.map((faction) => faction.factionId).sort()).toEqual([
      'faction-guard',
      'faction-thieves'
    ])
    expect(slice.factionRelations).toEqual(
      expect.arrayContaining([expectedFactionRelation()])
    )
    expect(slice.characterFactionReputations).toEqual([expectedReputation()])
    expect(slice.npcOpinions).toEqual([expectedNpcOpinion()])
    expect(slice.dmNpcOpinions).toEqual([
      { campaignId: CAMPAIGN_ID, npcId: 'npc-a', text: 'Secretly likes the party.' }
    ])
    expect(slice.worldFacts).toEqual([expectedWorldFact()])
  })

  it('imports durable rows back into the NPC store', () => {
    seedDurableNpcRows()
    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)

    clearNpcStore()
    clearFactionStore()
    clearOpinionStore()
    clearDmOpinionStore()
    importCampaignSlice(ctx, slice)

    expect(listMemories('npc-a')).toEqual(slice.memories)
    expect(listWorldFacts()).toEqual(slice.worldFacts)
    expect(getFactionRelation('faction-guard', 'faction-thieves')).toEqual(
      slice.factionRelations.find(
        (relation) =>
          relation.sourceFactionId === 'faction-guard' &&
          relation.targetFactionId === 'faction-thieves'
      )
    )
    expect(getReputationStanding('pc-1', 'faction-guard')).toEqual(
      slice.characterFactionReputations[0]
    )
    expect(listNpcOpinionsHeldBy('npc-a')).toEqual(slice.npcOpinions)
    expect(getNpcDossier({ campaignId: CAMPAIGN_ID, npcId: 'npc-a' }).dmOpinion).toBe(
      'Secretly likes the party.'
    )
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

  it('rejects memory records for NPCs outside the slice campaign', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice: NpcCampaignSlice = {
      ...slice,
      memories: [
        {
          npcId: 'missing-npc',
          text: 'Should not import.',
          provenance: { eventId: 'event-bad' }
        }
      ]
    }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(NpcPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/Memory missing-npc/)
  })
})

function seedAndExport(): { ctx: { campaignId: string }; slice: NpcCampaignSlice } {
  saveNpc(minimalNpc('npc-schema'))
  const ctx = { campaignId: CAMPAIGN_ID }
  return { ctx, slice: exportCampaignSlice(ctx) }
}

function seedDurableNpcRows(): void {
  saveNpc(minimalNpc('npc-a'))
  saveNpc(minimalNpc('npc-b'))
  appendNpcMemory({
    npcId: 'npc-a',
    text: 'Remembers the bridge debt.',
    provenance: { eventId: 'event-memory', sceneId: 'scene-1' }
  })
  appendWorldFact({
    factId: 'fact-bridge',
    text: 'The bridge is watched by guards.',
    provenance: { eventId: 'event-fact' },
    regionIds: ['region-north'],
    factionIds: ['faction-guard'],
    npcIds: ['npc-a']
  })
  createFaction({ factionId: 'faction-guard', name: 'Town Guard' })
  createFaction({ factionId: 'faction-thieves', name: 'Thieves Guild' })
  addNpcToFaction({ factionId: 'faction-guard', npcId: 'npc-a', role: 'captain' })
  setFactionRelation({
    sourceFactionId: 'faction-guard',
    targetFactionId: 'faction-thieves',
    relation: 'hostile'
  })
  updateReputation({
    characterId: 'pc-1',
    factionId: 'faction-guard',
    delta: 3,
    provenance: { eventId: 'event-rep' }
  })
  upsertNpcOpinion({
    holderNpcId: 'npc-a',
    subjectId: 'pc-1',
    subjectKind: 'pc',
    trust: 6,
    fear: 1,
    affection: 2,
    stance: 'friendly',
    provenance: { eventId: 'event-opinion' }
  })
  upsertDmNpcOpinion({
    campaignId: CAMPAIGN_ID,
    npcId: 'npc-a',
    text: 'Secretly likes the party.'
  })
}

function expectedMemory() {
  return {
    npcId: 'npc-a',
    text: 'Remembers the bridge debt.',
    provenance: { eventId: 'event-memory', sceneId: 'scene-1' }
  }
}

function expectedFactionRelation() {
  return {
    sourceFactionId: 'faction-guard',
    targetFactionId: 'faction-thieves',
    relation: 'hostile'
  }
}

function expectedReputation() {
  return {
    characterId: 'pc-1',
    factionId: 'faction-guard',
    score: 3,
    lastProvenance: { eventId: 'event-rep' }
  }
}

function expectedNpcOpinion() {
  return {
    holderNpcId: 'npc-a',
    subjectId: 'pc-1',
    subjectKind: 'pc',
    trust: 6,
    fear: 1,
    affection: 2,
    stance: 'friendly',
    provenance: { eventId: 'event-opinion' }
  }
}

function expectedWorldFact() {
  return {
    factId: 'fact-bridge',
    text: 'The bridge is watched by guards.',
    provenance: { eventId: 'event-fact' },
    regionIds: ['region-north'],
    factionIds: ['faction-guard'],
    npcIds: ['npc-a']
  }
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
