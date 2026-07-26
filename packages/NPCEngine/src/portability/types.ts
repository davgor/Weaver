import type { NpcRecord } from '../types.js'

export const NPC_SLICE_VERSION = 1

export type NpcPortabilityContext = {
  campaignId: string
}

export type NpcCampaignSlice = {
  sliceVersion: typeof NPC_SLICE_VERSION
  campaignId: string
  npcIds: string[]
  npcs: NpcRecord[]
}

export class NpcPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NpcPortabilitySchemaError'
  }
}
