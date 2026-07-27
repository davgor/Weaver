import {
  clearNpcLocationsForCampaign,
  restoreNpcLocations
} from '../location.js'
import { clearCampaignNpcs, getNpcCampaignStore, saveNpc } from '../store.js'
import {
  NPC_SLICE_VERSION,
  NpcPortabilitySchemaError,
  type NpcCampaignSlice,
  type NpcPortabilityContext
} from './types.js'

export function importCampaignSlice(ctx: NpcPortabilityContext, slice: NpcCampaignSlice): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)
  assertSliceRows(ctx.campaignId, slice)

  const store = getNpcCampaignStore()
  clearCampaignNpcs(ctx.campaignId)
  clearNpcLocationsForCampaign(ctx.campaignId)
  clearDurableRows()
  for (const npc of slice.npcs) {
    saveNpc(npc)
  }
  for (const memory of slice.memories) {
    store.appendMemory(memory)
  }
  for (const fact of slice.worldFacts) {
    store.setWorldFact(fact)
  }
  for (const faction of slice.factions) {
    store.setFaction(faction)
  }
  for (const relation of slice.factionRelations) {
    store.setFactionRelation(relation)
  }
  for (const standing of slice.characterFactionReputations) {
    store.setReputation(standing)
  }
  for (const opinion of slice.npcOpinions) {
    store.setNpcOpinion(opinion)
  }
  for (const opinion of slice.dmNpcOpinions) {
    store.setDmNpcOpinion(opinion.campaignId, opinion.npcId, opinion.text)
  }
  restoreNpcLocations(slice.locations)
}

function clearDurableRows(): void {
  const store = getNpcCampaignStore()
  store.clearWorldFacts()
  store.clearFactions()
  store.clearFactionRelations()
  store.clearReputations()
  store.clearNpcOpinions()
  store.clearDmNpcOpinions()
}

function assertSliceRows(campaignId: string, slice: NpcCampaignSlice): void {
  const npcIds = new Set(slice.npcs.map((npc) => npc.npcId))
  assertNpcCampaignIds(campaignId, slice.npcs)
  assertLocationCampaignIds(campaignId, slice.locations)
  assertMemoryNpcIds(npcIds, slice.memories)
  assertDmOpinionCampaignIds(campaignId, npcIds, slice.dmNpcOpinions)
  assertFactionReferences(slice)
  assertOpinionReferences(npcIds, slice.npcOpinions)
  assertWorldFactReferences(npcIds, slice.worldFacts)
}

function assertNpcCampaignIds(campaignId: string, npcs: NpcCampaignSlice['npcs']): void {
  for (const npc of npcs) {
    if (npc.campaignId !== campaignId) {
      throw new NpcPortabilitySchemaError(
        `NPC ${npc.npcId} belongs to campaign ${npc.campaignId}, expected ${campaignId}`
      )
    }
  }
}

function assertLocationCampaignIds(campaignId: string, rows: NpcCampaignSlice['locations']): void {
  for (const row of rows) {
    if (row.campaignId !== campaignId) {
      throw new NpcPortabilitySchemaError(
        `Location ${row.npcId} belongs to campaign ${row.campaignId}, expected ${campaignId}`
      )
    }
  }
}

function assertMemoryNpcIds(npcIds: ReadonlySet<string>, rows: NpcCampaignSlice['memories']): void {
  for (const row of rows) {
    if (!npcIds.has(row.npcId)) {
      throw new NpcPortabilitySchemaError(`Memory ${row.npcId} does not belong to slice NPCs`)
    }
  }
}

function assertDmOpinionCampaignIds(
  campaignId: string,
  npcIds: ReadonlySet<string>,
  rows: NpcCampaignSlice['dmNpcOpinions']
): void {
  for (const row of rows) {
    if (row.campaignId !== campaignId || !npcIds.has(row.npcId)) {
      throw new NpcPortabilitySchemaError(
        `DM opinion ${row.npcId} belongs to campaign ${row.campaignId}, expected ${campaignId}`
      )
    }
  }
}

function assertFactionReferences(slice: NpcCampaignSlice): void {
  const factionIds = new Set(slice.factions.map((faction) => faction.factionId))
  for (const row of slice.factionRelations) {
    assertKnownFaction(factionIds, row.sourceFactionId, 'Faction relation')
    assertKnownFaction(factionIds, row.targetFactionId, 'Faction relation')
  }
  for (const row of slice.characterFactionReputations) {
    assertKnownFaction(factionIds, row.factionId, 'Character faction reputation')
  }
}

function assertOpinionReferences(
  npcIds: ReadonlySet<string>,
  rows: NpcCampaignSlice['npcOpinions']
): void {
  for (const row of rows) {
    if (!npcIds.has(row.holderNpcId)) {
      throw new NpcPortabilitySchemaError(`NPC opinion holder ${row.holderNpcId} is not in slice`)
    }
  }
}

function assertWorldFactReferences(
  npcIds: ReadonlySet<string>,
  rows: NpcCampaignSlice['worldFacts']
): void {
  for (const row of rows) {
    assertKnownNpcReferences(npcIds, row.npcIds ?? [], `World fact ${row.factId}`)
  }
}

function assertKnownNpcReferences(
  npcIds: ReadonlySet<string>,
  referencedNpcIds: readonly string[],
  label: string
): void {
  for (const npcId of referencedNpcIds) {
    if (!npcIds.has(npcId)) {
      throw new NpcPortabilitySchemaError(`${label} references unknown NPC ${npcId}`)
    }
  }
}

function assertKnownFaction(
  factionIds: ReadonlySet<string>,
  factionId: string,
  label: string
): void {
  if (!factionIds.has(factionId)) {
    throw new NpcPortabilitySchemaError(`${label} references unknown faction ${factionId}`)
  }
}

function assertSliceVersion(slice: NpcCampaignSlice): void {
  if (slice.sliceVersion !== NPC_SLICE_VERSION) {
    throw new NpcPortabilitySchemaError(
      `Unsupported NPC slice version ${String(slice.sliceVersion)}; expected ${NPC_SLICE_VERSION}`
    )
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new NpcPortabilitySchemaError(
      `NPC slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
