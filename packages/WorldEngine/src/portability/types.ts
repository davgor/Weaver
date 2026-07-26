import type { WorldMeta } from '../types.js'

export const WORLD_SLICE_VERSION = 1

export type WorldPortabilityContext = {
  dataRoot: string
  campaignId: string
  worldId: string
}

export type WorldCampaignSlice = {
  sliceVersion: typeof WORLD_SLICE_VERSION
  campaignId: string
  worldId: string
  meta: WorldMeta
}

export class WorldPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorldPortabilitySchemaError'
  }
}
