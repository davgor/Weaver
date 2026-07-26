import type { RegionCellRef, RegionRecord } from '../types.js'

export const REGIONAL_SLICE_VERSION = 1

export type RegionalPortabilityContext = {
  dataRoot: string
  campaignId: string
  worldId: string
}

export type RegionalCampaignSlice = {
  sliceVersion: typeof REGIONAL_SLICE_VERSION
  campaignId: string
  worldId: string
  regions: Array<{
    record: RegionRecord
    cells: RegionCellRef[]
  }>
}

export class RegionalPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RegionalPortabilitySchemaError'
  }
}
