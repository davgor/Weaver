import type { NpcLocation } from '../location.js'
import type { NpcRecord } from '../types.js'

/** v2 adds per-NPC current `locations` placement records (epic 103). */
export const NPC_SLICE_VERSION = 2

export type NpcPortabilityContext = {
  campaignId: string
}

export type NpcCampaignSlice = {
  sliceVersion: typeof NPC_SLICE_VERSION
  campaignId: string
  npcIds: string[]
  npcs: NpcRecord[]
  locations: NpcLocation[]
}

export class NpcPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NpcPortabilitySchemaError'
  }
}
