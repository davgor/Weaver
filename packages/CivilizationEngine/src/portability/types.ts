import type { CivilizationRecord, Point } from '../types.js'
import type { NpcPlaceholderSlot } from '../npcPlaceholders.js'

export const CIVILIZATION_SLICE_VERSION = 1

export type CivilizationPortabilityContext = {
  dataRoot: string
  campaignId: string
  worldId: string
}

export type CivilizationCampaignSlice = {
  sliceVersion: typeof CIVILIZATION_SLICE_VERSION
  campaignId: string
  worldId: string
  civilizations: Array<{
    record: CivilizationRecord
    claimedCells: Point[]
  }>
  slots: NpcPlaceholderSlot[]
}

export class CivilizationPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CivilizationPortabilitySchemaError'
  }
}
