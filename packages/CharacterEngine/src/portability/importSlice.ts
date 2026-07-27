import { clearAutosaveStore, recordAutosaveSnapshot } from '../autosave.js'
import { getCharacterFactStore, type CharacterFactStore } from '../campaignFactStore.js'
import {
  clearCompanionsForCampaign,
  restoreCompanionsForCampaign
} from '../companions.js'
import { setCampaignDeathMode } from '../deathModes.js'
import { restoreCharacterStats } from '../hp.js'
import {
  clearCharacterLocationsForCampaign,
  restoreCharacterLocations
} from '../location.js'
import { setCampaignDay } from '../timeRest.js'
import {
  CHARACTER_SLICE_VERSION,
  CharacterPortabilitySchemaError,
  type CharacterCampaignSlice,
  type CharacterPortabilityContext
} from './types.js'

export function importCampaignSlice(
  ctx: CharacterPortabilityContext,
  slice: CharacterCampaignSlice
): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)
  assertLocationCampaignIds(ctx.campaignId, slice.locations)

  const store = getCharacterFactStore()
  clearCompanionsForCampaign(ctx.campaignId)
  clearCharacterLocationsForCampaign(ctx.campaignId)
  clearUnscopedPortableFacts(store)
  clearAutosaveStore()
  setCampaignDay(ctx.campaignId, slice.day)
  if (slice.deathMode !== undefined) {
    setCampaignDeathMode(ctx.campaignId, slice.deathMode)
  }
  restoreCompanionsForCampaign(slice.companions)
  restoreCharacterLocations(slice.locations)
  restoreStats(slice.stats)
  restoreJournal(store, slice.journal)
  restoreLogBook(store, slice.logbook)
  restoreQuestLog(store, slice.questLog)
  restoreKnownActions(store, slice.knownActionIds)
  restoreAutosaves(slice.autosaves)
}

function clearUnscopedPortableFacts(store: CharacterFactStore): void {
  // These fact maps do not carry campaignId yet; full-slice import replaces them wholesale.
  store.clearJournal()
  store.clearLogBook()
  store.clearQuests()
  store.clearKnownActions()
  store.clearStats()
}

function assertLocationCampaignIds(
  campaignId: string,
  locations: CharacterCampaignSlice['locations']
): void {
  for (const location of locations) {
    if (location.campaignId !== campaignId) {
      throw new CharacterPortabilitySchemaError(
        `Location ${location.characterId} belongs to campaign ${location.campaignId}, expected ${campaignId}`
      )
    }
  }
}

function assertSliceVersion(slice: CharacterCampaignSlice): void {
  if (slice.sliceVersion !== CHARACTER_SLICE_VERSION) {
    throw new CharacterPortabilitySchemaError(
      `Unsupported character slice version ${String(slice.sliceVersion)}; expected ${CHARACTER_SLICE_VERSION}`
    )
  }
}

function restoreStats(stats: CharacterCampaignSlice['stats']): void {
  for (const record of Object.values(stats)) {
    restoreCharacterStats(record)
  }
}

function restoreJournal(
  store: CharacterFactStore,
  journal: CharacterCampaignSlice['journal']
): void {
  for (const [characterId, entries] of Object.entries(journal)) {
    for (const entry of entries) {
      store.appendJournal(characterId, entry)
    }
  }
}

function restoreLogBook(
  store: CharacterFactStore,
  logbook: CharacterCampaignSlice['logbook']
): void {
  for (const [characterId, entries] of Object.entries(logbook)) {
    for (const entry of entries) {
      store.appendLogBook(characterId, entry)
    }
  }
}

function restoreQuestLog(
  store: CharacterFactStore,
  questLog: CharacterCampaignSlice['questLog']
): void {
  for (const [characterId, entries] of Object.entries(questLog)) {
    for (const entry of entries) {
      store.upsertQuest(characterId, entry)
    }
  }
}

function restoreKnownActions(
  store: CharacterFactStore,
  knownActionIds: CharacterCampaignSlice['knownActionIds']
): void {
  for (const [characterId, actionIds] of Object.entries(knownActionIds)) {
    for (const actionId of actionIds) {
      store.addKnownAction(characterId, actionId)
    }
  }
}

function restoreAutosaves(autosaves: CharacterCampaignSlice['autosaves']): void {
  for (const [characterId, snapshot] of Object.entries(autosaves)) {
    recordAutosaveSnapshot(characterId, snapshot)
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new CharacterPortabilitySchemaError(
      `Character slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
