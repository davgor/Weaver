import type { CharacterAutosaveSnapshot } from '../autosave.js'
import type { CompanionRecord } from '../companions.js'
import type { DeathMode } from '../deathModes.js'
import type { CharacterStats } from '../hp.js'
import type { CharacterLocation } from '../location.js'
import type { JournalEntry, LogBookEntry, QuestEntry } from '../records.js'

/** v3 adds durable CharacterFactStore records and autosaves. */
export const CHARACTER_SLICE_VERSION = 3

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
  stats: Record<string, CharacterStats>
  journal: Record<string, JournalEntry[]>
  logbook: Record<string, LogBookEntry[]>
  questLog: Record<string, QuestEntry[]>
  knownActionIds: Record<string, string[]>
  autosaves: Record<string, CharacterAutosaveSnapshot>
}

export class CharacterPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CharacterPortabilitySchemaError'
  }
}
