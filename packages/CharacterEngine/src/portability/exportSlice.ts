import { listAutosaveSnapshots } from '../autosave.js'
import { getCharacterFactStore, type CharacterFactStore } from '../campaignFactStore.js'
import { listCompanionsForCampaign } from '../companions.js'
import { getCampaignDeathMode } from '../deathModes.js'
import type { CharacterStats } from '../hp.js'
import { listCharacterLocations } from '../location.js'
import { getCampaignDay } from '../timeRest.js'
import {
  CHARACTER_SLICE_VERSION,
  type CharacterCampaignSlice,
  type CharacterPortabilityContext
} from './types.js'

export function exportCampaignSlice(ctx: CharacterPortabilityContext): CharacterCampaignSlice {
  const store = getCharacterFactStore()
  const companions = listCompanionsForCampaign(ctx.campaignId)
  const locations = listCharacterLocations(ctx.campaignId)
  const autosaves = listAutosaveSnapshots()
  const characterIds = collectCharacterIds(store, companions, locations, autosaves)
  const deathMode = getCampaignDeathMode(ctx.campaignId)
  return {
    sliceVersion: CHARACTER_SLICE_VERSION,
    campaignId: ctx.campaignId,
    day: getCampaignDay(ctx.campaignId),
    ...(deathMode === undefined ? {} : { deathMode }),
    characterIds,
    companions,
    locations,
    stats: collectStats(store, characterIds),
    journal: collectRecords(characterIds, (id) => store.listJournal(id)),
    logbook: collectRecords(characterIds, (id) => store.listLogBook(id)),
    questLog: collectRecords(characterIds, (id) => store.listQuests(id)),
    knownActionIds: collectRecords(characterIds, (id) => store.listKnownActions(id)),
    autosaves
  }
}

function collectCharacterIds(
  store: CharacterFactStore,
  companions: CharacterCampaignSlice['companions'],
  locations: CharacterCampaignSlice['locations'],
  autosaves: CharacterCampaignSlice['autosaves']
): string[] {
  const ids = new Set([...store.listCharacterFactIds(), ...Object.keys(autosaves)])
  for (const companion of companions) {
    ids.add(companion.characterId)
  }
  for (const location of locations) {
    ids.add(location.characterId)
  }
  return [...ids].sort()
}

function collectStats(
  store: CharacterFactStore,
  characterIds: readonly string[]
): Record<string, CharacterStats> {
  const statsByCharacter: Record<string, CharacterStats> = {}
  for (const characterId of characterIds) {
    const stats = store.getStats(characterId)
    if (stats !== undefined) {
      statsByCharacter[characterId] = stats
    }
  }
  return statsByCharacter
}

function collectRecords<T>(
  characterIds: readonly string[],
  listRecords: (characterId: string) => T[]
): Record<string, T[]> {
  const recordsByCharacter: Record<string, T[]> = {}
  for (const characterId of characterIds) {
    const records = listRecords(characterId)
    if (records.length > 0) {
      recordsByCharacter[characterId] = records
    }
  }
  return recordsByCharacter
}
