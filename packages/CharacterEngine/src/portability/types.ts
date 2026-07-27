import type { CompanionRecord } from '../companions.js'
import type { DeathMode } from '../deathModes.js'
import type { CharacterLocation } from '../location.js'

/** v2 adds per-character `locations` placement records (epic 096). */
export const CHARACTER_SLICE_VERSION = 2

export type CharacterPortabilityContext = {
  campaignId: string
}

export type CharacterCampaignSlice = {
  sliceVersion: typeof CHARACTER_SLICE_VERSION
  campaignId: string
  day: number
  deathMode?: DeathMode
  characterIds: string[]
  companions: CompanionRecord[]
  locations: CharacterLocation[]
}

export class CharacterPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CharacterPortabilitySchemaError'
  }
}
