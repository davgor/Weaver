import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { NpcPlaceholderSlot, NpcPlaceholderStatus, NpcRoleHint } from '../npcPlaceholders.js'
import type { Aabb, CivilizationRecord, Point, SettlementKind } from '../types.js'

type SqliteDb = Database.Database

type CivRow = {
  civilizationId: string
  worldId: string
  regionId: string
  kind: SettlementKind
  originX: number
  originY: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  centroidX: number | null
  centroidY: number | null
  seedSalt: number
  population: number
  npcSlotCount: number
  npcSlotsAssigned: number
  statsVersion: number
  extraStats: string
  createdAt: string
  updatedAt: string
}

type ClaimRow = { x: number; y: number; civilizationId: string }

type SlotRow = {
  slotId: string
  civilizationId: string
  worldId: string
  regionId: string
  roleHint: NpcRoleHint
  status: NpcPlaceholderStatus
  assignedNpcId: string | null
  priority: number | null
  districtTag: string | null
}

export type CivilizationStore = {
  saveCivilization: (record: CivilizationRecord, claimedCells: Point[]) => CivilizationRecord
  getCivilization: (worldId: string, civilizationId: string) => CivilizationRecord | null
  listCivilizations: (worldId: string) => CivilizationRecord[]
  listInRegion: (worldId: string, regionId: string) => CivilizationRecord[]
  getAt: (worldId: string, x: number, y: number) => CivilizationRecord | null
  listInBounds: (worldId: string, bounds: Aabb) => CivilizationRecord[]
  deleteCivilization: (worldId: string, civilizationId: string) => void
  clearCivilizations: (worldId: string, regionId?: string) => void
  countCivilizations: (worldId: string) => number
  listClaimedCells: (worldId: string, bounds?: Aabb) => Point[]
  saveSlots: (slots: NpcPlaceholderSlot[]) => void
  listSlots: (worldId: string, civilizationId?: string) => NpcPlaceholderSlot[]
  getSlot: (worldId: string, slotId: string) => NpcPlaceholderSlot | null
  upsertSlot: (slot: NpcPlaceholderSlot) => NpcPlaceholderSlot
  deleteSlotsForCivilization: (worldId: string, civilizationId: string) => void
  deleteUnassignedSlots: (worldId: string, civilizationId: string, keepCount: number) => void
}

function worldDir(dataRoot: string, worldId: string): string {
  return join(dataRoot, worldId)
}

function dbPath(dataRoot: string, worldId: string): string {
  return join(worldDir(dataRoot, worldId), 'civilizations.sqlite')
}

function ensureSchema(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS civilizations (
      civilizationId TEXT PRIMARY KEY,
      worldId TEXT NOT NULL,
      regionId TEXT NOT NULL,
      kind TEXT NOT NULL,
      originX INTEGER NOT NULL,
      originY INTEGER NOT NULL,
      minX INTEGER NOT NULL,
      minY INTEGER NOT NULL,
      maxX INTEGER NOT NULL,
      maxY INTEGER NOT NULL,
      centroidX REAL,
      centroidY REAL,
      seedSalt INTEGER NOT NULL,
      population INTEGER NOT NULL,
      npcSlotCount INTEGER NOT NULL,
      npcSlotsAssigned INTEGER NOT NULL,
      statsVersion INTEGER NOT NULL,
      extraStats TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_civ_region ON civilizations(worldId, regionId);
    CREATE TABLE IF NOT EXISTS cell_claims (
      worldId TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      civilizationId TEXT NOT NULL,
      PRIMARY KEY(worldId, x, y)
    );
    CREATE INDEX IF NOT EXISTS idx_claims_civ ON cell_claims(worldId, civilizationId);
    CREATE TABLE IF NOT EXISTS npc_placeholders (
      slotId TEXT PRIMARY KEY,
      civilizationId TEXT NOT NULL,
      worldId TEXT NOT NULL,
      regionId TEXT NOT NULL,
      roleHint TEXT NOT NULL,
      status TEXT NOT NULL,
      assignedNpcId TEXT,
      priority INTEGER,
      districtTag TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_slots_world ON npc_placeholders(worldId, civilizationId);
  `)
}

function openDb(dataRoot: string, worldId: string): SqliteDb {
  mkdirSync(worldDir(dataRoot, worldId), { recursive: true })
  const db = new Database(dbPath(dataRoot, worldId))
  ensureSchema(db)
  return db
}

function runWithDb<T>(dataRoot: string, worldId: string, run: (db: SqliteDb) => T): T {
  const db = openDb(dataRoot, worldId)
  try {
    return run(db)
  } finally {
    db.close()
  }
}

function parseExtra(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } : {}
}

function rowToRecord(row: CivRow): CivilizationRecord {
  const record: CivilizationRecord = {
    civilizationId: row.civilizationId,
    worldId: row.worldId,
    regionId: row.regionId,
    kind: row.kind,
    origin: { x: row.originX, y: row.originY },
    bounds: { minX: row.minX, minY: row.minY, maxX: row.maxX, maxY: row.maxY },
    seedSalt: row.seedSalt,
    population: row.population,
    npcSlotCount: row.npcSlotCount,
    npcSlotsAssigned: row.npcSlotsAssigned,
    statsVersion: row.statsVersion,
    extraStats: parseExtra(row.extraStats),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
  if (row.centroidX !== null && row.centroidY !== null) {
    record.centroid = { x: row.centroidX, y: row.centroidY }
  }
  return record
}

function rowToSlot(row: SlotRow): NpcPlaceholderSlot {
  const slot: NpcPlaceholderSlot = {
    slotId: row.slotId,
    civilizationId: row.civilizationId,
    worldId: row.worldId,
    regionId: row.regionId,
    roleHint: row.roleHint,
    status: row.status
  }
  if (row.assignedNpcId) slot.assignedNpcId = row.assignedNpcId
  if (row.priority !== null) slot.priority = row.priority
  if (row.districtTag) slot.districtTag = row.districtTag
  return slot
}

function insertCivilization(db: SqliteDb, record: CivilizationRecord): void {
  db.prepare(
    `INSERT INTO civilizations VALUES (
      @civilizationId, @worldId, @regionId, @kind, @originX, @originY,
      @minX, @minY, @maxX, @maxY, @centroidX, @centroidY, @seedSalt,
      @population, @npcSlotCount, @npcSlotsAssigned, @statsVersion,
      @extraStats, @createdAt, @updatedAt
    )
    ON CONFLICT(civilizationId) DO UPDATE SET
      regionId=excluded.regionId, kind=excluded.kind, originX=excluded.originX,
      originY=excluded.originY, minX=excluded.minX, minY=excluded.minY,
      maxX=excluded.maxX, maxY=excluded.maxY, centroidX=excluded.centroidX,
      centroidY=excluded.centroidY, seedSalt=excluded.seedSalt,
      population=excluded.population, npcSlotCount=excluded.npcSlotCount,
      npcSlotsAssigned=excluded.npcSlotsAssigned, statsVersion=excluded.statsVersion,
      extraStats=excluded.extraStats, updatedAt=excluded.updatedAt`
  ).run({
    civilizationId: record.civilizationId,
    worldId: record.worldId,
    regionId: record.regionId,
    kind: record.kind,
    originX: record.origin.x,
    originY: record.origin.y,
    minX: record.bounds.minX,
    minY: record.bounds.minY,
    maxX: record.bounds.maxX,
    maxY: record.bounds.maxY,
    centroidX: record.centroid?.x ?? null,
    centroidY: record.centroid?.y ?? null,
    seedSalt: record.seedSalt,
    population: record.population,
    npcSlotCount: record.npcSlotCount,
    npcSlotsAssigned: record.npcSlotsAssigned,
    statsVersion: record.statsVersion,
    extraStats: JSON.stringify(record.extraStats),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  })
}

function replaceClaims(db: SqliteDb, worldId: string, civilizationId: string, cells: Point[]): void {
  db.prepare(`DELETE FROM cell_claims WHERE worldId = ? AND civilizationId = ?`).run(
    worldId,
    civilizationId
  )
  const insert = db.prepare(
    `INSERT INTO cell_claims (worldId, x, y, civilizationId) VALUES (?, ?, ?, ?)`
  )
  for (const cell of cells) insert.run(worldId, cell.x, cell.y, civilizationId)
}

function saveCivilizationRecord(
  dataRoot: string,
  record: CivilizationRecord,
  claimedCells: Point[]
): CivilizationRecord {
  return runWithDb(dataRoot, record.worldId, (db) => {
    const tx = db.transaction(() => {
      insertCivilization(db, record)
      replaceClaims(db, record.worldId, record.civilizationId, claimedCells)
    })
    tx()
    return record
  })
}

function getCivilizationRecord(
  dataRoot: string,
  worldId: string,
  civilizationId: string
): CivilizationRecord | null {
  return runWithDb(dataRoot, worldId, (db) => {
    const row = db
      .prepare(`SELECT * FROM civilizations WHERE worldId = ? AND civilizationId = ?`)
      .get(worldId, civilizationId) as CivRow | undefined
    return row ? rowToRecord(row) : null
  })
}

function listCivilizationRecords(dataRoot: string, worldId: string): CivilizationRecord[] {
  return runWithDb(dataRoot, worldId, (db) => {
    const rows = db
      .prepare(`SELECT * FROM civilizations WHERE worldId = ? ORDER BY civilizationId`)
      .all(worldId) as CivRow[]
    return rows.map(rowToRecord)
  })
}

function listRegionRecords(
  dataRoot: string,
  worldId: string,
  regionId: string
): CivilizationRecord[] {
  return runWithDb(dataRoot, worldId, (db) => {
    const rows = db
      .prepare(
        `SELECT * FROM civilizations WHERE worldId = ? AND regionId = ? ORDER BY civilizationId`
      )
      .all(worldId, regionId) as CivRow[]
    return rows.map(rowToRecord)
  })
}

function getAtPoint(
  dataRoot: string,
  worldId: string,
  x: number,
  y: number
): CivilizationRecord | null {
  return runWithDb(dataRoot, worldId, (db) => {
    const claim = db
      .prepare(`SELECT civilizationId FROM cell_claims WHERE worldId = ? AND x = ? AND y = ?`)
      .get(worldId, x, y) as { civilizationId: string } | undefined
    if (!claim) return null
    const row = db
      .prepare(`SELECT * FROM civilizations WHERE civilizationId = ?`)
      .get(claim.civilizationId) as CivRow | undefined
    return row ? rowToRecord(row) : null
  })
}

function listBoundsRecords(dataRoot: string, worldId: string, bounds: Aabb): CivilizationRecord[] {
  return runWithDb(dataRoot, worldId, (db) => {
    const ids = db
      .prepare(
        `SELECT DISTINCT civilizationId FROM cell_claims
         WHERE worldId = ? AND x BETWEEN ? AND ? AND y BETWEEN ? AND ?`
      )
      .all(worldId, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY) as {
      civilizationId: string
    }[]
    const out: CivilizationRecord[] = []
    const get = db.prepare(`SELECT * FROM civilizations WHERE civilizationId = ?`)
    for (const id of ids) {
      const row = get.get(id.civilizationId) as CivRow | undefined
      if (row) out.push(rowToRecord(row))
    }
    return out.sort((a, b) => a.civilizationId.localeCompare(b.civilizationId))
  })
}

function deleteCivilizationRecord(dataRoot: string, worldId: string, civilizationId: string): void {
  runWithDb(dataRoot, worldId, (db) => {
    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM cell_claims WHERE worldId = ? AND civilizationId = ?`).run(
        worldId,
        civilizationId
      )
      db.prepare(`DELETE FROM npc_placeholders WHERE worldId = ? AND civilizationId = ?`).run(
        worldId,
        civilizationId
      )
      db.prepare(`DELETE FROM civilizations WHERE worldId = ? AND civilizationId = ?`).run(
        worldId,
        civilizationId
      )
    })
    tx()
  })
}

function clearCivilizationRecords(dataRoot: string, worldId: string, regionId?: string): void {
  runWithDb(dataRoot, worldId, (db) => {
    const tx = db.transaction(() => {
      if (regionId === undefined) {
        db.prepare(`DELETE FROM cell_claims WHERE worldId = ?`).run(worldId)
        db.prepare(`DELETE FROM npc_placeholders WHERE worldId = ?`).run(worldId)
        db.prepare(`DELETE FROM civilizations WHERE worldId = ?`).run(worldId)
        return
      }
      const ids = db
        .prepare(`SELECT civilizationId FROM civilizations WHERE worldId = ? AND regionId = ?`)
        .all(worldId, regionId) as { civilizationId: string }[]
      for (const id of ids) {
        db.prepare(`DELETE FROM cell_claims WHERE worldId = ? AND civilizationId = ?`).run(
          worldId,
          id.civilizationId
        )
        db.prepare(`DELETE FROM npc_placeholders WHERE worldId = ? AND civilizationId = ?`).run(
          worldId,
          id.civilizationId
        )
      }
      db.prepare(`DELETE FROM civilizations WHERE worldId = ? AND regionId = ?`).run(
        worldId,
        regionId
      )
    })
    tx()
  })
}

function countCivilizationRecords(dataRoot: string, worldId: string): number {
  return runWithDb(dataRoot, worldId, (db) => {
    const row = db
      .prepare(`SELECT COUNT(*) AS n FROM civilizations WHERE worldId = ?`)
      .get(worldId) as { n: number }
    return row.n
  })
}

function listClaimed(dataRoot: string, worldId: string, bounds?: Aabb): Point[] {
  return runWithDb(dataRoot, worldId, (db) => {
    if (!bounds) {
      const rows = db
        .prepare(`SELECT x, y FROM cell_claims WHERE worldId = ?`)
        .all(worldId) as ClaimRow[]
      return rows.map((row) => ({ x: row.x, y: row.y }))
    }
    const rows = db
      .prepare(
        `SELECT x, y FROM cell_claims
         WHERE worldId = ? AND x BETWEEN ? AND ? AND y BETWEEN ? AND ?`
      )
      .all(worldId, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY) as ClaimRow[]
    return rows.map((row) => ({ x: row.x, y: row.y }))
  })
}

function saveSlotRows(dataRoot: string, worldId: string, slots: NpcPlaceholderSlot[]): void {
  runWithDb(dataRoot, worldId, (db) => {
    const stmt = db.prepare(
      `INSERT INTO npc_placeholders
       (slotId, civilizationId, worldId, regionId, roleHint, status, assignedNpcId, priority, districtTag)
       VALUES (@slotId, @civilizationId, @worldId, @regionId, @roleHint, @status, @assignedNpcId, @priority, @districtTag)
       ON CONFLICT(slotId) DO UPDATE SET
         status=excluded.status, assignedNpcId=excluded.assignedNpcId,
         priority=excluded.priority, districtTag=excluded.districtTag`
    )
    const tx = db.transaction((rows: NpcPlaceholderSlot[]) => {
      for (const slot of rows) {
        stmt.run({
          slotId: slot.slotId,
          civilizationId: slot.civilizationId,
          worldId: slot.worldId,
          regionId: slot.regionId,
          roleHint: slot.roleHint,
          status: slot.status,
          assignedNpcId: slot.assignedNpcId ?? null,
          priority: slot.priority ?? null,
          districtTag: slot.districtTag ?? null
        })
      }
    })
    tx(slots)
  })
}

function listSlotRows(
  dataRoot: string,
  worldId: string,
  civilizationId?: string
): NpcPlaceholderSlot[] {
  return runWithDb(dataRoot, worldId, (db) => {
    if (civilizationId === undefined) {
      const rows = db
        .prepare(`SELECT * FROM npc_placeholders WHERE worldId = ? ORDER BY slotId`)
        .all(worldId) as SlotRow[]
      return rows.map(rowToSlot)
    }
    const rows = db
      .prepare(
        `SELECT * FROM npc_placeholders WHERE worldId = ? AND civilizationId = ? ORDER BY slotId`
      )
      .all(worldId, civilizationId) as SlotRow[]
    return rows.map(rowToSlot)
  })
}

function getSlotRow(dataRoot: string, worldId: string, slotId: string): NpcPlaceholderSlot | null {
  return runWithDb(dataRoot, worldId, (db) => {
    const row = db
      .prepare(`SELECT * FROM npc_placeholders WHERE worldId = ? AND slotId = ?`)
      .get(worldId, slotId) as SlotRow | undefined
    return row ? rowToSlot(row) : null
  })
}

function upsertSlotRow(dataRoot: string, slot: NpcPlaceholderSlot): NpcPlaceholderSlot {
  saveSlotRows(dataRoot, slot.worldId, [slot])
  return { ...slot }
}

function deleteSlots(dataRoot: string, worldId: string, civilizationId: string): void {
  runWithDb(dataRoot, worldId, (db) => {
    db.prepare(`DELETE FROM npc_placeholders WHERE worldId = ? AND civilizationId = ?`).run(
      worldId,
      civilizationId
    )
  })
}

function deleteExtraUnassigned(
  dataRoot: string,
  worldId: string,
  civilizationId: string,
  keepCount: number
): void {
  runWithDb(dataRoot, worldId, (db) => {
    const rows = db
      .prepare(
        `SELECT slotId FROM npc_placeholders
         WHERE worldId = ? AND civilizationId = ? AND status = 'unassigned'
         ORDER BY slotId`
      )
      .all(worldId, civilizationId) as { slotId: string }[]
    const remove = rows.slice(keepCount)
    const del = db.prepare(`DELETE FROM npc_placeholders WHERE slotId = ?`)
    for (const row of remove) del.run(row.slotId)
  })
}

export function createCivilizationStore(dataRoot: string): CivilizationStore {
  return {
    saveCivilization: (record, cells) => saveCivilizationRecord(dataRoot, record, cells),
    getCivilization: (worldId, civilizationId) =>
      getCivilizationRecord(dataRoot, worldId, civilizationId),
    listCivilizations: (worldId) => listCivilizationRecords(dataRoot, worldId),
    listInRegion: (worldId, regionId) => listRegionRecords(dataRoot, worldId, regionId),
    getAt: (worldId, x, y) => getAtPoint(dataRoot, worldId, x, y),
    listInBounds: (worldId, bounds) => listBoundsRecords(dataRoot, worldId, bounds),
    deleteCivilization: (worldId, civilizationId) =>
      deleteCivilizationRecord(dataRoot, worldId, civilizationId),
    clearCivilizations: (worldId, regionId) => clearCivilizationRecords(dataRoot, worldId, regionId),
    countCivilizations: (worldId) => countCivilizationRecords(dataRoot, worldId),
    listClaimedCells: (worldId, bounds) => listClaimed(dataRoot, worldId, bounds),
    saveSlots: (slots) => {
      if (slots[0]) saveSlotRows(dataRoot, slots[0].worldId, slots)
    },
    listSlots: (worldId, civilizationId) => listSlotRows(dataRoot, worldId, civilizationId),
    getSlot: (worldId, slotId) => getSlotRow(dataRoot, worldId, slotId),
    upsertSlot: (slot) => upsertSlotRow(dataRoot, slot),
    deleteSlotsForCivilization: (worldId, civilizationId) =>
      deleteSlots(dataRoot, worldId, civilizationId),
    deleteUnassignedSlots: (worldId, civilizationId, keepCount) =>
      deleteExtraUnassigned(dataRoot, worldId, civilizationId, keepCount)
  }
}
