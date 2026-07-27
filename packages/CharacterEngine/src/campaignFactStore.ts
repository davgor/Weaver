import type { CompanionOnboardingStatus, CompanionRecord } from './companions.js'
import type { CharacterStats } from './hp.js'
import type { CharacterLocation } from './location.js'
import type { JournalEntry, LogBookEntry, QuestEntry } from './records.js'

export type CharacterFactStore = {
  getStats: (characterId: string) => CharacterStats | undefined
  setStats: (stats: CharacterStats) => void
  clearStats: () => void
  listJournal: (characterId: string) => JournalEntry[]
  appendJournal: (characterId: string, entry: JournalEntry) => void
  clearJournal: () => void
  listLogBook: (characterId: string) => LogBookEntry[]
  appendLogBook: (characterId: string, entry: LogBookEntry) => void
  clearLogBook: () => void
  upsertQuest: (characterId: string, entry: QuestEntry) => void
  listQuests: (characterId: string) => QuestEntry[]
  clearQuests: () => void
  addKnownAction: (characterId: string, actionId: string) => void
  listKnownActions: (characterId: string) => string[]
  clearKnownActions: () => void
  getLocation: (characterId: string) => CharacterLocation | undefined
  setLocation: (location: CharacterLocation) => void
  deleteLocation: (characterId: string) => boolean
  listLocations: (campaignId?: string) => CharacterLocation[]
  clearLocations: () => void
  clearLocationsForCampaign: (campaignId: string) => void
  getCompanion: (characterId: string) => CompanionRecord | undefined
  setCompanion: (record: CompanionRecord) => void
  listCompanionIdsForOwner: (ownerCharacterId: string) => string[]
  listCompanionsForCampaign: (campaignId: string) => CompanionRecord[]
  clearCompanions: () => void
  clearCompanionsForCampaign: (campaignId: string) => void
  getOnboardingStatus: (ownerCharacterId: string) => CompanionOnboardingStatus | undefined
  setOnboardingStatus: (ownerCharacterId: string, status: CompanionOnboardingStatus) => void
  allocateCompanionId: () => string
  allocateRecordId: (prefix: string) => string
  listCharacterFactIds: () => string[]
}

export type MemoryCharacterFactStoreOptions = {
  nextCompanionId?: number
  nextRecordId?: number
}

type MemoryMaps = {
  stats: Map<string, CharacterStats>
  journal: Map<string, JournalEntry[]>
  logBook: Map<string, LogBookEntry[]>
  quests: Map<string, Map<string, QuestEntry>>
  knownActions: Map<string, Set<string>>
  locations: Map<string, CharacterLocation>
  companions: Map<string, CompanionRecord>
  companionsByOwner: Map<string, string[]>
  onboarding: Map<string, CompanionOnboardingStatus>
}
type CompanionAllocators = { nextCompanionId: number; nextRecordId: number }
type CompanionApi = Pick<
  CharacterFactStore,
  | 'getCompanion'
  | 'setCompanion'
  | 'listCompanionIdsForOwner'
  | 'listCompanionsForCampaign'
  | 'clearCompanions'
  | 'clearCompanionsForCampaign'
  | 'getOnboardingStatus'
  | 'setOnboardingStatus'
  | 'allocateCompanionId'
  | 'allocateRecordId'
>

let activeStore: CharacterFactStore = createMemoryCharacterFactStore()
let campaignBound = false

export function createMemoryCharacterFactStore(
  options: MemoryCharacterFactStoreOptions = {}
): CharacterFactStore {
  const maps = createEmptyMaps()
  const allocators = {
    nextCompanionId: options.nextCompanionId ?? 1,
    nextRecordId: options.nextRecordId ?? 1
  }
  return {
    ...buildStatsApi(maps),
    ...buildRecordApis(maps),
    ...buildLocationApi(maps),
    ...buildCompanionApi(maps, allocators),
    listCharacterFactIds: () => listCharacterFactIds(maps)
  }
}

export function getCharacterFactStore(): CharacterFactStore {
  return activeStore
}

export function bindCharacterFactStore(store: CharacterFactStore): void {
  activeStore = store
  campaignBound = true
}

export function unbindCharacterFactStore(): void {
  activeStore = createMemoryCharacterFactStore()
  campaignBound = false
}

export function isCharacterCampaignStoreBound(): boolean {
  return campaignBound
}

function createEmptyMaps(): MemoryMaps {
  return {
    stats: new Map(),
    journal: new Map(),
    logBook: new Map(),
    quests: new Map(),
    knownActions: new Map(),
    locations: new Map(),
    companions: new Map(),
    companionsByOwner: new Map(),
    onboarding: new Map()
  }
}

function buildStatsApi(maps: MemoryMaps): Pick<CharacterFactStore, 'getStats' | 'setStats' | 'clearStats'> {
  return {
    getStats: (characterId) => {
      const value = maps.stats.get(characterId)
      return value === undefined ? undefined : copyStats(value)
    },
    setStats: (value) => {
      maps.stats.set(value.characterId, copyStats(value))
    },
    clearStats: () => {
      maps.stats.clear()
    }
  }
}

function buildRecordApis(
  maps: MemoryMaps
): Pick<
  CharacterFactStore,
  | 'listJournal'
  | 'appendJournal'
  | 'clearJournal'
  | 'listLogBook'
  | 'appendLogBook'
  | 'clearLogBook'
  | 'upsertQuest'
  | 'listQuests'
  | 'clearQuests'
  | 'addKnownAction'
  | 'listKnownActions'
  | 'clearKnownActions'
> {
  return {
    ...buildJournalApi(maps),
    ...buildLogBookApi(maps),
    ...buildQuestApi(maps),
    ...buildKnownActionApi(maps)
  }
}

function buildJournalApi(
  maps: MemoryMaps
): Pick<CharacterFactStore, 'listJournal' | 'appendJournal' | 'clearJournal'> {
  return {
    listJournal: (characterId) => (maps.journal.get(characterId) ?? []).map(copyJournal),
    appendJournal: (characterId, entry) => {
      const entries = maps.journal.get(characterId) ?? []
      entries.push(copyJournal(entry))
      maps.journal.set(characterId, entries)
    },
    clearJournal: () => {
      maps.journal.clear()
    }
  }
}

function buildLogBookApi(
  maps: MemoryMaps
): Pick<CharacterFactStore, 'listLogBook' | 'appendLogBook' | 'clearLogBook'> {
  return {
    listLogBook: (characterId) => (maps.logBook.get(characterId) ?? []).map(copyLog),
    appendLogBook: (characterId, entry) => {
      const entries = maps.logBook.get(characterId) ?? []
      entries.push(copyLog(entry))
      maps.logBook.set(characterId, entries)
    },
    clearLogBook: () => {
      maps.logBook.clear()
    }
  }
}

function buildQuestApi(
  maps: MemoryMaps
): Pick<CharacterFactStore, 'upsertQuest' | 'listQuests' | 'clearQuests'> {
  return {
    upsertQuest: (characterId, entry) => {
      const map = maps.quests.get(characterId) ?? new Map<string, QuestEntry>()
      map.set(entry.questId, copyQuest(entry))
      maps.quests.set(characterId, map)
    },
    listQuests: (characterId) => {
      const map = maps.quests.get(characterId)
      return map === undefined ? [] : [...map.values()].map(copyQuest)
    },
    clearQuests: () => {
      maps.quests.clear()
    }
  }
}

function buildKnownActionApi(
  maps: MemoryMaps
): Pick<CharacterFactStore, 'addKnownAction' | 'listKnownActions' | 'clearKnownActions'> {
  return {
    addKnownAction: (characterId, actionId) => {
      const set = maps.knownActions.get(characterId) ?? new Set<string>()
      set.add(actionId)
      maps.knownActions.set(characterId, set)
    },
    listKnownActions: (characterId) => [...(maps.knownActions.get(characterId) ?? new Set())].sort(),
    clearKnownActions: () => {
      maps.knownActions.clear()
    }
  }
}

function buildLocationApi(
  maps: MemoryMaps
): Pick<
  CharacterFactStore,
  | 'getLocation'
  | 'setLocation'
  | 'deleteLocation'
  | 'listLocations'
  | 'clearLocations'
  | 'clearLocationsForCampaign'
> {
  return {
    getLocation: (characterId) => {
      const value = maps.locations.get(characterId)
      return value === undefined ? undefined : copyLocation(value)
    },
    setLocation: (location) => {
      maps.locations.set(location.characterId, copyLocation(location))
    },
    deleteLocation: (characterId) => maps.locations.delete(characterId),
    listLocations: (campaignId) => listLocationsFrom(maps.locations, campaignId),
    clearLocations: () => {
      maps.locations.clear()
    },
    clearLocationsForCampaign: (campaignId) => {
      for (const record of maps.locations.values()) {
        if (record.campaignId === campaignId) {
          maps.locations.delete(record.characterId)
        }
      }
    }
  }
}

function buildCompanionApi(
  maps: MemoryMaps,
  allocators: CompanionAllocators
): CompanionApi {
  return {
    ...buildCompanionRecordApi(maps),
    ...buildCompanionClearApi(maps, allocators),
    ...buildCompanionOnboardingApi(maps),
    ...buildCompanionAllocatorApi(allocators)
  }
}

function buildCompanionRecordApi(
  maps: MemoryMaps
): Pick<
  CharacterFactStore,
  'getCompanion' | 'setCompanion' | 'listCompanionIdsForOwner' | 'listCompanionsForCampaign'
> {
  return {
    getCompanion: (characterId) => {
      const value = maps.companions.get(characterId)
      return value === undefined ? undefined : { ...value }
    },
    setCompanion: (record) => {
      maps.companions.set(record.characterId, { ...record })
      const existing = maps.companionsByOwner.get(record.ownerCharacterId) ?? []
      if (!existing.includes(record.characterId)) {
        maps.companionsByOwner.set(record.ownerCharacterId, [...existing, record.characterId])
      }
    },
    listCompanionIdsForOwner: (ownerCharacterId) => [
      ...(maps.companionsByOwner.get(ownerCharacterId) ?? [])
    ],
    listCompanionsForCampaign: (campaignId) =>
      [...maps.companions.values()]
        .filter((record) => record.campaignId === campaignId)
        .map((record) => ({ ...record }))
  }
}

function buildCompanionClearApi(
  maps: MemoryMaps,
  allocators: CompanionAllocators
): Pick<CharacterFactStore, 'clearCompanions' | 'clearCompanionsForCampaign'> {
  return {
    clearCompanions: () => {
      maps.companions.clear()
      maps.companionsByOwner.clear()
      maps.onboarding.clear()
      allocators.nextCompanionId = 1
    },
    clearCompanionsForCampaign: (campaignId) => clearCompanionsForCampaign(maps, campaignId)
  }
}

function buildCompanionOnboardingApi(
  maps: MemoryMaps
): Pick<CharacterFactStore, 'getOnboardingStatus' | 'setOnboardingStatus'> {
  return {
    getOnboardingStatus: (ownerCharacterId) => maps.onboarding.get(ownerCharacterId),
    setOnboardingStatus: (ownerCharacterId, status) => {
      maps.onboarding.set(ownerCharacterId, status)
    }
  }
}

function buildCompanionAllocatorApi(
  allocators: CompanionAllocators
): Pick<CharacterFactStore, 'allocateCompanionId' | 'allocateRecordId'> {
  return {
    allocateCompanionId: () => {
      const id = `companion-${allocators.nextCompanionId}`
      allocators.nextCompanionId += 1
      return id
    },
    allocateRecordId: (prefix) => {
      const id = `${prefix}-${allocators.nextRecordId}`
      allocators.nextRecordId += 1
      return id
    }
  }
}

function clearCompanionsForCampaign(maps: MemoryMaps, campaignId: string): void {
  for (const record of maps.companions.values()) {
    if (record.campaignId !== campaignId) {
      continue
    }
    maps.companions.delete(record.characterId)
    removeCompanionFromOwnerIndex(maps, record.characterId)
  }
}

function removeCompanionFromOwnerIndex(maps: MemoryMaps, characterId: string): void {
  for (const [ownerId, ids] of maps.companionsByOwner.entries()) {
    maps.companionsByOwner.set(
      ownerId,
      ids.filter((id) => id !== characterId)
    )
  }
}

function listLocationsFrom(
  locations: Map<string, CharacterLocation>,
  campaignId?: string
): CharacterLocation[] {
  const records = [...locations.values()].map(copyLocation)
  const filtered =
    campaignId === undefined
      ? records
      : records.filter((record) => record.campaignId === campaignId)
  return filtered.sort((left, right) => left.characterId.localeCompare(right.characterId))
}

function listCharacterFactIds(maps: MemoryMaps): string[] {
  const ids = new Set<string>()
  addKeys(ids, maps.stats)
  addKeys(ids, maps.journal)
  addKeys(ids, maps.logBook)
  addKeys(ids, maps.quests)
  addKeys(ids, maps.knownActions)
  addKeys(ids, maps.locations)
  for (const companion of maps.companions.values()) {
    ids.add(companion.characterId)
  }
  return [...ids].sort()
}

function addKeys(ids: Set<string>, map: ReadonlyMap<string, unknown>): void {
  for (const key of map.keys()) {
    ids.add(key)
  }
}

function copyStats(stats: CharacterStats): CharacterStats {
  return {
    characterId: stats.characterId,
    maxHp: stats.maxHp,
    currentHp: stats.currentHp,
    conditions: [...stats.conditions],
    dying: stats.dying === null ? null : { ...stats.dying }
  }
}

function copyJournal(entry: JournalEntry): JournalEntry {
  return entry.linkedNpcId === undefined
    ? { ...entry }
    : { ...entry, linkedNpcId: entry.linkedNpcId }
}

function copyLog(entry: LogBookEntry): LogBookEntry {
  return { ...entry, payload: { ...entry.payload } }
}

function copyQuest(entry: QuestEntry): QuestEntry {
  return entry.title === undefined ? { ...entry } : { ...entry, title: entry.title }
}

function copyLocation(record: CharacterLocation): CharacterLocation {
  return {
    characterId: record.characterId,
    campaignId: record.campaignId,
    regionId: record.regionId,
    locationKind: record.locationKind,
    ...(record.placeId === undefined ? {} : { placeId: record.placeId }),
    ...(record.updatedDay === undefined ? {} : { updatedDay: record.updatedDay })
  }
}
