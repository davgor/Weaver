import type { CompanionRecord } from '../companions.js'
import type { DeathMode } from '../deathModes.js'

export const CHARACTER_SLICE_VERSION = 1

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
}

export class CharacterPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CharacterPortabilitySchemaError'
  }
}
