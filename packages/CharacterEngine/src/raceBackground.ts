import { CharacterEngineError } from './errors.js'

export type RaceRosterEntry = {
  raceId: string
  name: string
  lore?: string
}

export type RaceSelectionInput = {
  campaignId: string
  characterId: string
  raceId: string
  lore?: string
}

export type RaceSelection = {
  campaignId: string
  characterId: string
  raceId: string
  name: string
  lore: string
}

export type BackgroundRosterEntry = {
  backgroundId: string
  name: string
  description: string
  personalStoryHook?: string
}

export type BackgroundSelectionInput = {
  campaignId: string
  characterId: string
  backgroundId: string
  personalStory?: string
}

export type BackgroundSelection = BackgroundRosterEntry & {
  campaignId: string
  characterId: string
  personalStory?: string
}

export type CharacterIdentity = {
  race?: RaceSelection
  background?: BackgroundSelection
}

const raceRosters = new Map<string, Map<string, RaceRosterEntry>>()
const realizedRaceLore = new Map<string, Map<string, string>>()
const backgroundRosters = new Map<string, Map<string, BackgroundRosterEntry>>()
const identityStore = new Map<string, CharacterIdentity>()

export function setCampaignRaceRoster(
  campaignId: string,
  races: readonly RaceRosterEntry[]
): RaceRosterEntry[] {
  const roster = new Map<string, RaceRosterEntry>()
  races.forEach((race) => roster.set(race.raceId, copyRaceRosterEntry(race)))
  raceRosters.set(campaignId, roster)
  return listCampaignRaces(campaignId)
}

export function listCampaignRaces(campaignId: string): RaceRosterEntry[] {
  const roster = raceRosters.get(campaignId)
  if (roster === undefined) {
    return []
  }
  return [...roster.values()].map((race) => hydrateRaceLore(campaignId, race))
}

export function selectRace(input: RaceSelectionInput): RaceSelection {
  const race = readRace(input.campaignId, input.raceId)
  const lore = realizeRaceLore(input, race)
  const selection = {
    campaignId: input.campaignId,
    characterId: input.characterId,
    raceId: race.raceId,
    name: race.name,
    lore
  }
  updateIdentity(input.characterId, { race: selection })
  return { ...selection }
}

export function setCampaignBackgroundRoster(
  campaignId: string,
  backgrounds: readonly BackgroundRosterEntry[]
): BackgroundRosterEntry[] {
  const roster = new Map<string, BackgroundRosterEntry>()
  backgrounds.forEach((entry) => roster.set(entry.backgroundId, copyBackgroundRosterEntry(entry)))
  backgroundRosters.set(campaignId, roster)
  return listCampaignBackgrounds(campaignId)
}

export function listCampaignBackgrounds(campaignId: string): BackgroundRosterEntry[] {
  const roster = backgroundRosters.get(campaignId)
  return roster === undefined ? [] : [...roster.values()].map(copyBackgroundRosterEntry)
}

export function selectBackground(input: BackgroundSelectionInput): BackgroundSelection {
  const background = readBackground(input.campaignId, input.backgroundId)
  const selection = buildBackgroundSelection(input, background)
  updateIdentity(input.characterId, { background: selection })
  return copyBackgroundSelection(selection)
}

export function getCharacterIdentity(characterId: string): CharacterIdentity | undefined {
  const identity = identityStore.get(characterId)
  if (identity === undefined) {
    return undefined
  }
  return copyIdentity(identity)
}

function realizeRaceLore(input: RaceSelectionInput, race: RaceRosterEntry): string {
  const loreByRace = readRealizedLore(input.campaignId)
  const existing = loreByRace.get(input.raceId)
  if (existing !== undefined) {
    return existing
  }
  const lore = input.lore ?? race.lore ?? ''
  loreByRace.set(input.raceId, lore)
  return lore
}

function readRealizedLore(campaignId: string): Map<string, string> {
  const existing = realizedRaceLore.get(campaignId)
  if (existing !== undefined) {
    return existing
  }
  const loreByRace = new Map<string, string>()
  realizedRaceLore.set(campaignId, loreByRace)
  return loreByRace
}

function readRace(campaignId: string, raceId: string): RaceRosterEntry {
  const race = raceRosters.get(campaignId)?.get(raceId)
  if (race === undefined) {
    throw new CharacterEngineError('SELECTION_NOT_FOUND', `Race ${raceId} is not in ${campaignId}`)
  }
  return race
}

function readBackground(campaignId: string, backgroundId: string): BackgroundRosterEntry {
  const background = backgroundRosters.get(campaignId)?.get(backgroundId)
  if (background === undefined) {
    throw new CharacterEngineError(
      'SELECTION_NOT_FOUND',
      `Background ${backgroundId} is not in ${campaignId}`
    )
  }
  return background
}

function buildBackgroundSelection(
  input: BackgroundSelectionInput,
  background: BackgroundRosterEntry
): BackgroundSelection {
  const base = {
    ...background,
    campaignId: input.campaignId,
    characterId: input.characterId
  }
  return input.personalStory === undefined ? base : { ...base, personalStory: input.personalStory }
}

function updateIdentity(characterId: string, patch: CharacterIdentity): void {
  const current = identityStore.get(characterId) ?? {}
  identityStore.set(characterId, { ...current, ...patch })
}

function hydrateRaceLore(campaignId: string, race: RaceRosterEntry): RaceRosterEntry {
  const lore = realizedRaceLore.get(campaignId)?.get(race.raceId) ?? race.lore
  return lore === undefined ? copyRaceRosterEntry(race) : { ...race, lore }
}

function copyIdentity(identity: CharacterIdentity): CharacterIdentity {
  return {
    ...(identity.race === undefined ? {} : { race: { ...identity.race } }),
    ...(identity.background === undefined
      ? {}
      : { background: copyBackgroundSelection(identity.background) })
  }
}

function copyRaceRosterEntry(entry: RaceRosterEntry): RaceRosterEntry {
  return entry.lore === undefined ? { raceId: entry.raceId, name: entry.name } : { ...entry }
}

function copyBackgroundRosterEntry(entry: BackgroundRosterEntry): BackgroundRosterEntry {
  if (entry.personalStoryHook === undefined) {
    return {
      backgroundId: entry.backgroundId,
      name: entry.name,
      description: entry.description
    }
  }
  return { ...entry }
}

function copyBackgroundSelection(selection: BackgroundSelection): BackgroundSelection {
  const base = copyBackgroundRosterEntry(selection)
  const withIds = {
    ...base,
    campaignId: selection.campaignId,
    characterId: selection.characterId
  }
  return selection.personalStory === undefined
    ? withIds
    : { ...withIds, personalStory: selection.personalStory }
}
