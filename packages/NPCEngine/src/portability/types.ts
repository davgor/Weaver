import type { NpcLocation } from '../location.js'
import type {
  DmNpcOpinion,
  FactionRecord,
  FactionRelation,
  NpcMemory,
  NpcOpinion,
  NpcRecord,
  ReputationStanding,
  WorldFact
} from '../types.js'

/** v3 adds durable NPC projection rows beyond records and current locations. */
export const NPC_SLICE_VERSION = 3

export type NpcPortabilityContext = {
  campaignId: string
}

export type NpcCampaignSlice = {
  sliceVersion: typeof NPC_SLICE_VERSION
  campaignId: string
  npcIds: string[]
  npcs: NpcRecord[]
  locations: NpcLocation[]
  memories: NpcMemory[]
  factions: FactionRecord[]
  factionRelations: FactionRelation[]
  characterFactionReputations: ReputationStanding[]
  npcOpinions: NpcOpinion[]
  dmNpcOpinions: DmNpcOpinion[]
  worldFacts: WorldFact[]
}

export class NpcPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NpcPortabilitySchemaError'
  }
}
