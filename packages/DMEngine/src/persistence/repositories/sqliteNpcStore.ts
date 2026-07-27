import {
  createMemoryNpcCampaignStore,
  type FactionRecord,
  type FactionRelation,
  type NpcCampaignStore,
  type NpcLocation,
  type NpcMemory,
  type NpcOpinion,
  type NpcRecord,
  type ReputationStanding,
  type WorldFact
} from '@weaver/npc-engine'
import type { SqliteDatabase } from '../migrationRunner.js'

type NpcRow = { npc_id: string; campaign_id: string; payload_json: string }
type PayloadRow = { payload_json: string }
type MemoryRow = { npc_id: string; payload_json: string }
type LocationRow = {
  npc_id: string
  campaign_id: string
  region_id: string
  place_id: string | null
  location_kind: string
  updated_day: number | null
}
type DmOpinionPayload = { campaignId: string; npcId: string; text: string }
type SqliteNpcStoreContext = { db: SqliteDatabase; memory: NpcCampaignStore }
type UpsertPayloadInput = {
  db: SqliteDatabase
  tableName: string
  idColumn: string
  id: string
  payload: unknown
}

export function createSqliteNpcCampaignStore(db: SqliteDatabase): NpcCampaignStore {
  const memory = createMemoryNpcCampaignStore()
  hydrate(db, memory)
  return wrapWriteThrough(db, memory)
}

function hydrate(db: SqliteDatabase, memory: NpcCampaignStore): void {
  hydrateNpcs(db, memory)
  hydrateMemories(db, memory)
  hydrateWorldFacts(db, memory)
  hydrateFactions(db, memory)
  hydrateRelations(db, memory)
  hydrateReputations(db, memory)
  hydrateOpinions(db, memory)
  hydrateDmOpinions(db, memory)
  hydrateLocations(db, memory)
}

function hydrateNpcs(db: SqliteDatabase, memory: NpcCampaignStore): void {
  for (const row of db.prepare('SELECT * FROM npcs ORDER BY npc_id').all() as NpcRow[]) {
    memory.setNpc(JSON.parse(row.payload_json) as NpcRecord)
  }
}

function hydrateMemories(db: SqliteDatabase, memory: NpcCampaignStore): void {
  const rows = db
    .prepare('SELECT npc_id, payload_json FROM npc_memories ORDER BY npc_id, memory_id')
    .all() as MemoryRow[]
  for (const row of rows) {
    memory.appendMemory(JSON.parse(row.payload_json) as NpcMemory)
  }
}

function hydrateWorldFacts(db: SqliteDatabase, memory: NpcCampaignStore): void {
  for (const row of selectPayloads(db, 'world_facts', 'fact_id')) {
    memory.setWorldFact(JSON.parse(row.payload_json) as WorldFact)
  }
}

function hydrateFactions(db: SqliteDatabase, memory: NpcCampaignStore): void {
  for (const row of selectPayloads(db, 'factions', 'faction_id')) {
    memory.setFaction(JSON.parse(row.payload_json) as FactionRecord)
  }
}

function hydrateRelations(db: SqliteDatabase, memory: NpcCampaignStore): void {
  for (const row of selectPayloads(db, 'faction_relations', 'source_faction_id, target_faction_id')) {
    memory.setFactionRelation(JSON.parse(row.payload_json) as FactionRelation)
  }
}

function hydrateReputations(db: SqliteDatabase, memory: NpcCampaignStore): void {
  const order = 'character_id, faction_id'
  for (const row of selectPayloads(db, 'character_faction_reputations', order)) {
    memory.setReputation(JSON.parse(row.payload_json) as ReputationStanding)
  }
}

function hydrateOpinions(db: SqliteDatabase, memory: NpcCampaignStore): void {
  for (const row of selectPayloads(db, 'npc_opinions', 'holder_npc_id, about_id')) {
    memory.setNpcOpinion(JSON.parse(row.payload_json) as NpcOpinion)
  }
}

function hydrateDmOpinions(db: SqliteDatabase, memory: NpcCampaignStore): void {
  for (const row of selectPayloads(db, 'dm_npc_opinions', 'npc_id')) {
    const payload = JSON.parse(row.payload_json) as DmOpinionPayload
    memory.setDmNpcOpinion(payload.campaignId, payload.npcId, payload.text)
  }
}

function hydrateLocations(db: SqliteDatabase, memory: NpcCampaignStore): void {
  for (const row of db.prepare('SELECT * FROM npc_locations ORDER BY npc_id').all() as LocationRow[]) {
    memory.setLocation(toLocation(row))
  }
}

function wrapWriteThrough(db: SqliteDatabase, memory: NpcCampaignStore): NpcCampaignStore {
  const context = { db, memory }
  return {
    ...createNpcWriteThroughSection(context),
    ...createFactFactionWriteThroughSection(context),
    ...createOpinionWriteThroughSection(context),
    ...createLocationWriteThroughSection(context)
  }
}

function createNpcWriteThroughSection(
  context: SqliteNpcStoreContext
): Pick<
  NpcCampaignStore,
  | 'getNpc'
  | 'setNpc'
  | 'deleteNpc'
  | 'listNpcsForCampaign'
  | 'clearNpcs'
  | 'clearNpcsForCampaign'
  | 'appendMemory'
  | 'listMemories'
  | 'clearMemories'
  | 'clearMemoriesForNpc'
> {
  const { db, memory } = context
  return {
    getNpc: (id) => memory.getNpc(id),
    setNpc: (npc) => writeNpc(db, memory, npc),
    deleteNpc: (id) => deleteNpc(db, memory, id),
    listNpcsForCampaign: (campaignId) => memory.listNpcsForCampaign(campaignId),
    clearNpcs: () => clearNpcs(db, memory),
    clearNpcsForCampaign: (campaignId) => clearNpcsForCampaign(db, memory, campaignId),
    appendMemory: (entry) => writeMemory(db, memory, entry),
    listMemories: (npcId) => memory.listMemories(npcId),
    clearMemories: () => {
      memory.clearMemories()
      db.prepare('DELETE FROM npc_memories').run()
    },
    clearMemoriesForNpc: (npcId) => {
      memory.clearMemoriesForNpc(npcId)
      db.prepare('DELETE FROM npc_memories WHERE npc_id = ?').run(npcId)
    }
  }
}

function createFactFactionWriteThroughSection(
  context: SqliteNpcStoreContext
): Pick<
  NpcCampaignStore,
  | 'setWorldFact'
  | 'listWorldFacts'
  | 'clearWorldFacts'
  | 'getFaction'
  | 'setFaction'
  | 'clearFactions'
  | 'getFactionRelation'
  | 'setFactionRelation'
  | 'clearFactionRelations'
  | 'getReputation'
  | 'setReputation'
  | 'listReputationsForCharacter'
  | 'clearReputations'
> {
  const { db, memory } = context
  return {
    setWorldFact: (fact) => writeWorldFact(db, memory, fact),
    listWorldFacts: () => memory.listWorldFacts(),
    clearWorldFacts: () => {
      memory.clearWorldFacts()
      db.prepare('DELETE FROM world_facts').run()
    },
    getFaction: (id) => memory.getFaction(id),
    setFaction: (faction) => writeFaction(db, memory, faction),
    clearFactions: () => {
      memory.clearFactions()
      db.prepare('DELETE FROM factions').run()
    },
    getFactionRelation: (sourceId, targetId) => memory.getFactionRelation(sourceId, targetId),
    setFactionRelation: (relation) => writeRelation(db, memory, relation),
    clearFactionRelations: () => {
      memory.clearFactionRelations()
      db.prepare('DELETE FROM faction_relations').run()
    },
    getReputation: (characterId, factionId) => memory.getReputation(characterId, factionId),
    setReputation: (standing) => writeReputation(db, memory, standing),
    listReputationsForCharacter: (characterId) => memory.listReputationsForCharacter(characterId),
    clearReputations: () => {
      memory.clearReputations()
      db.prepare('DELETE FROM character_faction_reputations').run()
    }
  }
}

function createOpinionWriteThroughSection(
  context: SqliteNpcStoreContext
): Pick<
  NpcCampaignStore,
  | 'setNpcOpinion'
  | 'listNpcOpinionsHeldBy'
  | 'listNpcOpinionsAbout'
  | 'clearNpcOpinions'
  | 'setDmNpcOpinion'
  | 'getDmNpcOpinion'
  | 'clearDmNpcOpinions'
> {
  const { db, memory } = context
  return {
    setNpcOpinion: (opinion) => writeOpinion(db, memory, opinion),
    listNpcOpinionsHeldBy: (holderId) => memory.listNpcOpinionsHeldBy(holderId),
    listNpcOpinionsAbout: (subjectId) => memory.listNpcOpinionsAbout(subjectId),
    clearNpcOpinions: () => {
      memory.clearNpcOpinions()
      db.prepare('DELETE FROM npc_opinions').run()
    },
    setDmNpcOpinion: (campaignId, npcId, text) =>
      writeDmOpinion({ db, memory, campaignId, npcId, text }),
    getDmNpcOpinion: (campaignId, npcId) => memory.getDmNpcOpinion(campaignId, npcId),
    clearDmNpcOpinions: () => {
      memory.clearDmNpcOpinions()
      db.prepare('DELETE FROM dm_npc_opinions').run()
    }
  }
}

function createLocationWriteThroughSection(
  context: SqliteNpcStoreContext
): Pick<
  NpcCampaignStore,
  | 'getLocation'
  | 'setLocation'
  | 'deleteLocation'
  | 'listLocations'
  | 'clearLocations'
  | 'clearLocationsForCampaign'
> {
  const { db, memory } = context
  return {
    getLocation: (id) => memory.getLocation(id),
    setLocation: (location) => writeLocation(db, memory, location),
    deleteLocation: (id) => deleteLocation(db, memory, id),
    listLocations: (campaignId) => memory.listLocations(campaignId),
    clearLocations: () => {
      memory.clearLocations()
      db.prepare('DELETE FROM npc_locations').run()
    },
    clearLocationsForCampaign: (campaignId) => clearLocationsForCampaign(db, memory, campaignId)
  }
}

function writeNpc(db: SqliteDatabase, memory: NpcCampaignStore, npc: NpcRecord): NpcRecord {
  const saved = memory.setNpc(npc)
  db.prepare(
    `INSERT INTO npcs (npc_id, campaign_id, payload_json)
     VALUES (?, ?, ?)
     ON CONFLICT(npc_id) DO UPDATE SET
       campaign_id = excluded.campaign_id,
       payload_json = excluded.payload_json`
  ).run(saved.npcId, saved.campaignId, JSON.stringify(saved))
  return saved
}

function deleteNpc(db: SqliteDatabase, memory: NpcCampaignStore, npcId: string): boolean {
  const deleted = memory.deleteNpc(npcId)
  db.prepare('DELETE FROM npcs WHERE npc_id = ?').run(npcId)
  return deleted
}

function clearNpcs(db: SqliteDatabase, memory: NpcCampaignStore): void {
  memory.clearNpcs()
  db.prepare('DELETE FROM npc_memories').run()
  db.prepare('DELETE FROM npcs').run()
}

function clearNpcsForCampaign(
  db: SqliteDatabase,
  memory: NpcCampaignStore,
  campaignId: string
): void {
  memory.clearNpcsForCampaign(campaignId)
  db.prepare('DELETE FROM npcs WHERE campaign_id = ?').run(campaignId)
}

function writeMemory(db: SqliteDatabase, memory: NpcCampaignStore, entry: NpcMemory): NpcMemory {
  const beforeCount = memory.listMemories(entry.npcId).length
  const saved = memory.appendMemory(entry)
  db.prepare('INSERT INTO npc_memories (memory_id, npc_id, payload_json) VALUES (?, ?, ?)').run(
    memoryId(entry.npcId, beforeCount + 1),
    saved.npcId,
    JSON.stringify(saved)
  )
  return saved
}

function writeWorldFact(db: SqliteDatabase, memory: NpcCampaignStore, fact: WorldFact): WorldFact {
  const saved = memory.setWorldFact(fact)
  upsertPayload({ db, tableName: 'world_facts', idColumn: 'fact_id', id: saved.factId, payload: saved })
  return saved
}

function writeFaction(
  db: SqliteDatabase,
  memory: NpcCampaignStore,
  faction: FactionRecord
): FactionRecord {
  const saved = memory.setFaction(faction)
  upsertPayload({
    db,
    tableName: 'factions',
    idColumn: 'faction_id',
    id: saved.factionId,
    payload: saved
  })
  return saved
}

function writeRelation(
  db: SqliteDatabase,
  memory: NpcCampaignStore,
  relation: FactionRelation
): FactionRelation {
  const saved = memory.setFactionRelation(relation)
  db.prepare(
    `INSERT INTO faction_relations (source_faction_id, target_faction_id, payload_json)
     VALUES (?, ?, ?)
     ON CONFLICT(source_faction_id, target_faction_id) DO UPDATE SET
       payload_json = excluded.payload_json`
  ).run(saved.sourceFactionId, saved.targetFactionId, JSON.stringify(saved))
  return saved
}

function writeReputation(
  db: SqliteDatabase,
  memory: NpcCampaignStore,
  standing: ReputationStanding
): ReputationStanding {
  const saved = memory.setReputation(standing)
  db.prepare(
    `INSERT INTO character_faction_reputations (character_id, faction_id, payload_json)
     VALUES (?, ?, ?)
     ON CONFLICT(character_id, faction_id) DO UPDATE SET
       payload_json = excluded.payload_json`
  ).run(saved.characterId, saved.factionId, JSON.stringify(saved))
  return saved
}

function writeOpinion(
  db: SqliteDatabase,
  memory: NpcCampaignStore,
  opinion: NpcOpinion
): NpcOpinion {
  const saved = memory.setNpcOpinion(opinion)
  db.prepare(
    `INSERT INTO npc_opinions (holder_npc_id, about_id, payload_json)
     VALUES (?, ?, ?)
     ON CONFLICT(holder_npc_id, about_id) DO UPDATE SET
       payload_json = excluded.payload_json`
  ).run(saved.holderNpcId, saved.subjectId, JSON.stringify(saved))
  return saved
}

function writeDmOpinion(input: {
  db: SqliteDatabase
  memory: NpcCampaignStore
  campaignId: string
  npcId: string
  text: string
}): string {
  const { db, memory, campaignId, npcId, text } = input
  const saved = memory.setDmNpcOpinion(campaignId, npcId, text)
  const payload: DmOpinionPayload = { campaignId, npcId, text: saved }
  upsertPayload({ db, tableName: 'dm_npc_opinions', idColumn: 'npc_id', id: npcId, payload })
  return saved
}

function writeLocation(
  db: SqliteDatabase,
  memory: NpcCampaignStore,
  location: NpcLocation
): NpcLocation {
  const saved = memory.setLocation(location)
  db.prepare(
    `INSERT INTO npc_locations
       (npc_id, campaign_id, region_id, place_id, location_kind, updated_day)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(npc_id) DO UPDATE SET
       campaign_id = excluded.campaign_id,
       region_id = excluded.region_id,
       place_id = excluded.place_id,
       location_kind = excluded.location_kind,
       updated_day = excluded.updated_day`
  ).run(
    saved.npcId,
    saved.campaignId,
    saved.regionId,
    saved.placeId ?? null,
    saved.locationKind,
    saved.updatedDay ?? null
  )
  return saved
}

function deleteLocation(db: SqliteDatabase, memory: NpcCampaignStore, npcId: string): boolean {
  const deleted = memory.deleteLocation(npcId)
  db.prepare('DELETE FROM npc_locations WHERE npc_id = ?').run(npcId)
  return deleted
}

function clearLocationsForCampaign(
  db: SqliteDatabase,
  memory: NpcCampaignStore,
  campaignId: string
): void {
  memory.clearLocationsForCampaign(campaignId)
  db.prepare('DELETE FROM npc_locations WHERE campaign_id = ?').run(campaignId)
}

function upsertPayload(input: UpsertPayloadInput): void {
  const { db, tableName, idColumn, id, payload } = input
  db.prepare(
    `INSERT INTO ${tableName} (${idColumn}, payload_json)
     VALUES (?, ?)
     ON CONFLICT(${idColumn}) DO UPDATE SET payload_json = excluded.payload_json`
  ).run(id, JSON.stringify(payload))
}

function selectPayloads(
  db: SqliteDatabase,
  tableName: string,
  orderBy: string
): PayloadRow[] {
  return db.prepare(`SELECT payload_json FROM ${tableName} ORDER BY ${orderBy}`).all() as PayloadRow[]
}

function toLocation(row: LocationRow): NpcLocation {
  return {
    npcId: row.npc_id,
    campaignId: row.campaign_id,
    regionId: row.region_id,
    locationKind: row.location_kind as NpcLocation['locationKind'],
    ...(row.place_id === null ? {} : { placeId: row.place_id }),
    ...(row.updated_day === null ? {} : { updatedDay: row.updated_day })
  }
}

function memoryId(npcId: string, index: number): string {
  return `${npcId}:${index.toString().padStart(10, '0')}`
}
