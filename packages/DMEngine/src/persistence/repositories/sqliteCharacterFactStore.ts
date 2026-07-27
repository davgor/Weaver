import type {
  CharacterFactStore,
  CharacterLocation,
  CharacterStats,
  CompanionOnboardingStatus,
  CompanionRecord,
  JournalEntry,
  LogBookEntry,
  QuestEntry
} from '@weaver/character-engine'
import { createMemoryCharacterFactStore } from '@weaver/character-engine'
import type { SqliteDatabase } from '../migrationRunner.js'

type CharacterRow = { id: string; stats_json: string }
type JournalRow = {
  id: string
  character_id: string
  text: string
  created_at: string
  linked_npc_id: string | null
}
type LogRow = {
  id: string
  character_id: string
  type: string
  payload_json: string
  created_at: string
}
type QuestRow = {
  character_id: string
  quest_id: string
  kind: string
  status: string
  title: string | null
}
type KnownRow = { character_id: string; action_id: string }
type LocationRow = {
  character_id: string
  campaign_id: string
  region_id: string
  place_id: string | null
  location_kind: string
  updated_day: number | null
}
type CompanionRow = {
  character_id: string
  owner_character_id: string
  campaign_id: string
  name: string
  archetype: string
  onboarding_owner_status: string | null
}
type MetaRow = { key: string; value: string }
type StatsWriteThrough = Pick<
  CharacterFactStore,
  'getStats' | 'setStats' | 'clearStats' | 'listCharacterFactIds'
>
type RecordsWriteThrough = Pick<
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
>
type LocationWriteThrough = Pick<
  CharacterFactStore,
  | 'getLocation'
  | 'setLocation'
  | 'deleteLocation'
  | 'listLocations'
  | 'clearLocations'
  | 'clearLocationsForCampaign'
>
type CompanionWriteThrough = Pick<
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

export function createSqliteCharacterFactStore(db: SqliteDatabase): CharacterFactStore {
  const meta = readMeta(db)
  const memory = createMemoryCharacterFactStore({
    nextCompanionId: meta.nextCompanionId,
    nextRecordId: meta.nextRecordId
  })
  hydrate(db, memory)
  return wrapWriteThrough(db, memory)
}

function readMeta(db: SqliteDatabase): { nextCompanionId: number; nextRecordId: number } {
  const rows = db.prepare('SELECT key, value FROM character_store_meta').all() as MetaRow[]
  let nextCompanionId = 1
  let nextRecordId = 1
  for (const row of rows) {
    if (row.key === 'next_companion_id') {
      nextCompanionId = Number(row.value)
    }
    if (row.key === 'next_record_id') {
      nextRecordId = Number(row.value)
    }
  }
  return { nextCompanionId, nextRecordId }
}

function hydrate(db: SqliteDatabase, memory: CharacterFactStore): void {
  for (const row of db.prepare('SELECT id, stats_json FROM characters').all() as CharacterRow[]) {
    memory.setStats(JSON.parse(row.stats_json) as CharacterStats)
  }
  hydrateJournal(db, memory)
  hydrateLogBook(db, memory)
  hydrateQuests(db, memory)
  hydrateKnownActions(db, memory)
  hydrateLocations(db, memory)
  hydrateCompanions(db, memory)
  hydrateOnboarding(db, memory)
}

function hydrateJournal(db: SqliteDatabase, memory: CharacterFactStore): void {
  const rows = db
    .prepare(
      'SELECT id, character_id, text, created_at, linked_npc_id FROM character_journal_entries ORDER BY created_at, id'
    )
    .all() as JournalRow[]
  for (const row of rows) {
    memory.appendJournal(row.character_id, toJournal(row))
  }
}

function hydrateLogBook(db: SqliteDatabase, memory: CharacterFactStore): void {
  const rows = db
    .prepare(
      'SELECT id, character_id, type, payload_json, created_at FROM character_log_entries ORDER BY created_at, id'
    )
    .all() as LogRow[]
  for (const row of rows) {
    memory.appendLogBook(row.character_id, toLog(row))
  }
}

function hydrateQuests(db: SqliteDatabase, memory: CharacterFactStore): void {
  for (const row of db.prepare('SELECT * FROM character_quest_log').all() as QuestRow[]) {
    memory.upsertQuest(row.character_id, toQuest(row))
  }
}

function hydrateKnownActions(db: SqliteDatabase, memory: CharacterFactStore): void {
  for (const row of db.prepare('SELECT * FROM character_known_actions').all() as KnownRow[]) {
    memory.addKnownAction(row.character_id, row.action_id)
  }
}

function hydrateLocations(db: SqliteDatabase, memory: CharacterFactStore): void {
  for (const row of db.prepare('SELECT * FROM character_locations').all() as LocationRow[]) {
    memory.setLocation(toLocation(row))
  }
}

function hydrateCompanions(db: SqliteDatabase, memory: CharacterFactStore): void {
  for (const row of db.prepare('SELECT * FROM companions').all() as CompanionRow[]) {
    memory.setCompanion(toCompanion(row))
  }
}

function hydrateOnboarding(db: SqliteDatabase, memory: CharacterFactStore): void {
  const rows = db.prepare('SELECT key, value FROM character_store_meta').all() as MetaRow[]
  for (const row of rows) {
    if (!row.key.startsWith('onboarding:')) {
      continue
    }
    memory.setOnboardingStatus(
      row.key.slice('onboarding:'.length),
      row.value as CompanionOnboardingStatus
    )
  }
}

function wrapWriteThrough(db: SqliteDatabase, memory: CharacterFactStore): CharacterFactStore {
  return {
    ...buildStatsWriteThrough(db, memory),
    ...buildRecordsWriteThrough(db, memory),
    ...buildLocationWriteThrough(db, memory),
    ...buildCompanionWriteThrough(db, memory)
  }
}

function buildStatsWriteThrough(db: SqliteDatabase, memory: CharacterFactStore): StatsWriteThrough {
  return {
    getStats: (id) => memory.getStats(id),
    setStats: (stats) => {
      memory.setStats(stats)
      upsertCharacter(db, stats)
    },
    clearStats: () => {
      memory.clearStats()
      db.prepare('DELETE FROM characters').run()
    },
    listCharacterFactIds: () => memory.listCharacterFactIds()
  }
}

function buildRecordsWriteThrough(db: SqliteDatabase, memory: CharacterFactStore): RecordsWriteThrough {
  return {
    listJournal: (id) => memory.listJournal(id),
    appendJournal: (characterId, entry) => {
      memory.appendJournal(characterId, entry)
      persistJournal(db, characterId, entry)
    },
    clearJournal: () => {
      memory.clearJournal()
      db.prepare('DELETE FROM character_journal_entries').run()
    },
    listLogBook: (id) => memory.listLogBook(id),
    appendLogBook: (characterId, entry) => {
      memory.appendLogBook(characterId, entry)
      persistLog(db, characterId, entry)
    },
    clearLogBook: () => {
      memory.clearLogBook()
      db.prepare('DELETE FROM character_log_entries').run()
    },
    upsertQuest: (characterId, entry) => {
      memory.upsertQuest(characterId, entry)
      persistQuest(db, characterId, entry)
    },
    listQuests: (id) => memory.listQuests(id),
    clearQuests: () => {
      memory.clearQuests()
      db.prepare('DELETE FROM character_quest_log').run()
    },
    addKnownAction: (characterId, actionId) => {
      memory.addKnownAction(characterId, actionId)
      persistKnownAction(db, characterId, actionId)
    },
    listKnownActions: (id) => memory.listKnownActions(id),
    clearKnownActions: () => {
      memory.clearKnownActions()
      db.prepare('DELETE FROM character_known_actions').run()
    }
  }
}

function buildLocationWriteThrough(db: SqliteDatabase, memory: CharacterFactStore): LocationWriteThrough {
  return {
    getLocation: (id) => memory.getLocation(id),
    setLocation: (location) => {
      memory.setLocation(location)
      persistLocation(db, location)
    },
    deleteLocation: (characterId) => {
      const deleted = memory.deleteLocation(characterId)
      db.prepare('DELETE FROM character_locations WHERE character_id = ?').run(characterId)
      return deleted
    },
    listLocations: (campaignId) => memory.listLocations(campaignId),
    clearLocations: () => {
      memory.clearLocations()
      db.prepare('DELETE FROM character_locations').run()
    },
    clearLocationsForCampaign: (campaignId) => {
      memory.clearLocationsForCampaign(campaignId)
      db.prepare('DELETE FROM character_locations WHERE campaign_id = ?').run(campaignId)
    }
  }
}

function buildCompanionWriteThrough(
  db: SqliteDatabase,
  memory: CharacterFactStore
): CompanionWriteThrough {
  return {
    getCompanion: (id) => memory.getCompanion(id),
    setCompanion: (record) => {
      memory.setCompanion(record)
      persistCompanion(db, memory, record)
    },
    listCompanionIdsForOwner: (ownerId) => memory.listCompanionIdsForOwner(ownerId),
    listCompanionsForCampaign: (campaignId) => memory.listCompanionsForCampaign(campaignId),
    clearCompanions: () => {
      memory.clearCompanions()
      db.prepare('DELETE FROM companions').run()
      db.prepare("DELETE FROM character_store_meta WHERE key LIKE 'companion%'").run()
    },
    clearCompanionsForCampaign: (campaignId) => {
      memory.clearCompanionsForCampaign(campaignId)
      db.prepare('DELETE FROM companions WHERE campaign_id = ?').run(campaignId)
    },
    getOnboardingStatus: (ownerId) => memory.getOnboardingStatus(ownerId),
    setOnboardingStatus: (ownerId, status) => {
      memory.setOnboardingStatus(ownerId, status)
      persistOnboarding(db, ownerId, status)
    },
    allocateCompanionId: () => {
      const id = memory.allocateCompanionId()
      writeMeta(db, 'next_companion_id', String(Number(id.split('-')[1]) + 1))
      return id
    },
    allocateRecordId: (prefix) => {
      const id = memory.allocateRecordId(prefix)
      writeMeta(db, 'next_record_id', String(Number(id.split('-')[1]) + 1))
      return id
    }
  }
}

function persistJournal(db: SqliteDatabase, characterId: string, entry: JournalEntry): void {
  ensureCharacterRow(db, characterId)
  db.prepare(
    `INSERT INTO character_journal_entries (id, character_id, text, created_at, linked_npc_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(entry.id, characterId, entry.text, entry.createdAt, entry.linkedNpcId ?? null)
}

function persistLog(db: SqliteDatabase, characterId: string, entry: LogBookEntry): void {
  ensureCharacterRow(db, characterId)
  db.prepare(
    `INSERT INTO character_log_entries (id, character_id, type, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(entry.id, characterId, entry.type, JSON.stringify(entry.payload), entry.createdAt)
}

function persistQuest(db: SqliteDatabase, characterId: string, entry: QuestEntry): void {
  ensureCharacterRow(db, characterId)
  db.prepare(
    `INSERT INTO character_quest_log (character_id, quest_id, kind, status, title)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(character_id, quest_id) DO UPDATE SET
       kind = excluded.kind,
       status = excluded.status,
       title = excluded.title`
  ).run(characterId, entry.questId, entry.kind, entry.status, entry.title ?? null)
}

function persistKnownAction(db: SqliteDatabase, characterId: string, actionId: string): void {
  ensureCharacterRow(db, characterId)
  db.prepare(
    `INSERT OR IGNORE INTO character_known_actions (character_id, action_id) VALUES (?, ?)`
  ).run(characterId, actionId)
}

function persistLocation(db: SqliteDatabase, location: CharacterLocation): void {
  ensureCharacterRow(db, location.characterId)
  db.prepare(
    `INSERT INTO character_locations
       (character_id, campaign_id, region_id, place_id, location_kind, updated_day)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(character_id) DO UPDATE SET
       campaign_id = excluded.campaign_id,
       region_id = excluded.region_id,
       place_id = excluded.place_id,
       location_kind = excluded.location_kind,
       updated_day = excluded.updated_day`
  ).run(
    location.characterId,
    location.campaignId,
    location.regionId,
    location.placeId ?? null,
    location.locationKind,
    location.updatedDay ?? null
  )
}

function persistCompanion(
  db: SqliteDatabase,
  memory: CharacterFactStore,
  record: CompanionRecord
): void {
  const status = memory.getOnboardingStatus(record.ownerCharacterId) ?? null
  db.prepare(
    `INSERT INTO companions
       (character_id, owner_character_id, campaign_id, name, archetype, onboarding_owner_status)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(character_id) DO UPDATE SET
       owner_character_id = excluded.owner_character_id,
       campaign_id = excluded.campaign_id,
       name = excluded.name,
       archetype = excluded.archetype,
       onboarding_owner_status = excluded.onboarding_owner_status`
  ).run(
    record.characterId,
    record.ownerCharacterId,
    record.campaignId,
    record.name,
    record.archetype,
    status
  )
}

function persistOnboarding(
  db: SqliteDatabase,
  ownerId: string,
  status: CompanionOnboardingStatus
): void {
  db.prepare(`UPDATE companions SET onboarding_owner_status = ? WHERE owner_character_id = ?`).run(
    status,
    ownerId
  )
  writeMeta(db, `onboarding:${ownerId}`, status)
}

function upsertCharacter(db: SqliteDatabase, stats: CharacterStats): void {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO characters (id, display_name, stats_json, updated_at)
     VALUES (?, NULL, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       stats_json = excluded.stats_json,
       updated_at = excluded.updated_at`
  ).run(stats.characterId, JSON.stringify(stats), now)
}

function ensureCharacterRow(db: SqliteDatabase, characterId: string): void {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO characters (id, display_name, stats_json, updated_at)
     VALUES (?, NULL, ?, ?)
     ON CONFLICT(id) DO NOTHING`
  ).run(
    characterId,
    JSON.stringify({
      characterId,
      maxHp: 0,
      currentHp: 0,
      conditions: [],
      dying: null
    } satisfies CharacterStats),
    now
  )
}

function writeMeta(db: SqliteDatabase, key: string, value: string): void {
  db.prepare(
    `INSERT INTO character_store_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value)
}

function toJournal(row: JournalRow): JournalEntry {
  return row.linked_npc_id === null
    ? { id: row.id, text: row.text, createdAt: row.created_at }
    : {
        id: row.id,
        text: row.text,
        createdAt: row.created_at,
        linkedNpcId: row.linked_npc_id
      }
}

function toLog(row: LogRow): LogBookEntry {
  return {
    id: row.id,
    type: row.type,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    createdAt: row.created_at
  }
}

function toQuest(row: QuestRow): QuestEntry {
  const entry: QuestEntry = {
    questId: row.quest_id,
    kind: row.kind as QuestEntry['kind'],
    status: row.status as QuestEntry['status']
  }
  return row.title === null ? entry : { ...entry, title: row.title }
}

function toLocation(row: LocationRow): CharacterLocation {
  return {
    characterId: row.character_id,
    campaignId: row.campaign_id,
    regionId: row.region_id,
    locationKind: row.location_kind as CharacterLocation['locationKind'],
    ...(row.place_id === null ? {} : { placeId: row.place_id }),
    ...(row.updated_day === null ? {} : { updatedDay: row.updated_day })
  }
}

function toCompanion(row: CompanionRow): CompanionRecord {
  return {
    characterId: row.character_id,
    ownerCharacterId: row.owner_character_id,
    campaignId: row.campaign_id,
    name: row.name,
    isCompanion: true,
    archetype: row.archetype as CompanionRecord['archetype']
  }
}
