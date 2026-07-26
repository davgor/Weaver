import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Aabb, LandType, LandTypeHistogram, RegionCellRef, RegionRecord } from '../types.js'

type SqliteDb = Database.Database
type SqlValue = string | number | null

type RegionRow = {
  regionId: string
  worldId: string
  sourceExpansionId: string | null
  dominantLandType: LandType
  landTypeHistogram: string
  averageElevation: number
  minElevation: number
  maxElevation: number
  waterContent: number
  isOcean: number
  touchesOcean: number
  isLandlocked: number
  cellCount: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  centroidX: number
  centroidY: number
  statsVersion: number
  extraStats: string
  createdAt: string
  updatedAt: string
}

type MembershipRow = {
  x: number
  y: number
  regionId: string
}

function worldDir(dataRoot: string, worldId: string): string {
  return join(dataRoot, worldId)
}

function dbPath(dataRoot: string, worldId: string): string {
  return join(worldDir(dataRoot, worldId), 'regions.sqlite')
}

function ensureSchema(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS regions (
      regionId TEXT PRIMARY KEY,
      worldId TEXT NOT NULL,
      sourceExpansionId TEXT,
      dominantLandType TEXT NOT NULL,
      landTypeHistogram TEXT NOT NULL,
      averageElevation REAL NOT NULL,
      minElevation REAL NOT NULL,
      maxElevation REAL NOT NULL,
      waterContent REAL NOT NULL,
      isOcean INTEGER NOT NULL,
      touchesOcean INTEGER NOT NULL,
      isLandlocked INTEGER NOT NULL,
      cellCount INTEGER NOT NULL,
      minX INTEGER NOT NULL,
      minY INTEGER NOT NULL,
      maxX INTEGER NOT NULL,
      maxY INTEGER NOT NULL,
      centroidX REAL NOT NULL,
      centroidY REAL NOT NULL,
      statsVersion INTEGER NOT NULL,
      extraStats TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS region_membership (
      worldId TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      regionId TEXT NOT NULL,
      PRIMARY KEY(worldId, x, y)
    );
    CREATE INDEX IF NOT EXISTS idx_region_membership_region
      ON region_membership(worldId, regionId);
  `)
}

function openDb(dataRoot: string, worldId: string): SqliteDb {
  mkdirSync(worldDir(dataRoot, worldId), { recursive: true })
  const db = new Database(dbPath(dataRoot, worldId))
  ensureSchema(db)
  return db
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } : {}
}

function parseHistogram(value: string): LandTypeHistogram {
  const parsed: unknown = JSON.parse(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } as LandTypeHistogram : {}
}

function rowBounds(row: RegionRow): Aabb {
  return { minX: row.minX, minY: row.minY, maxX: row.maxX, maxY: row.maxY }
}

function rowToRegion(row: RegionRow): RegionRecord {
  const record: RegionRecord = {
    regionId: row.regionId,
    worldId: row.worldId,
    dominantLandType: row.dominantLandType,
    landTypeHistogram: parseHistogram(row.landTypeHistogram),
    averageElevation: row.averageElevation,
    minElevation: row.minElevation,
    maxElevation: row.maxElevation,
    waterContent: row.waterContent,
    isOcean: row.isOcean === 1,
    touchesOcean: row.touchesOcean === 1,
    isLandlocked: row.isLandlocked === 1,
    cellCount: row.cellCount,
    bounds: rowBounds(row),
    centroid: { x: row.centroidX, y: row.centroidY },
    statsVersion: row.statsVersion,
    extraStats: parseJsonObject(row.extraStats),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
  if (row.sourceExpansionId !== null) record.sourceExpansionId = row.sourceExpansionId
  return record
}

function regionParams(region: RegionRecord): Record<string, SqlValue> {
  return {
    regionId: region.regionId,
    worldId: region.worldId,
    sourceExpansionId: region.sourceExpansionId ?? null,
    dominantLandType: region.dominantLandType,
    landTypeHistogram: JSON.stringify(region.landTypeHistogram),
    averageElevation: region.averageElevation,
    minElevation: region.minElevation,
    maxElevation: region.maxElevation,
    waterContent: region.waterContent,
    isOcean: region.isOcean ? 1 : 0,
    touchesOcean: region.touchesOcean ? 1 : 0,
    isLandlocked: region.isLandlocked ? 1 : 0,
    cellCount: region.cellCount,
    minX: region.bounds.minX,
    minY: region.bounds.minY,
    maxX: region.bounds.maxX,
    maxY: region.bounds.maxY,
    centroidX: region.centroid.x,
    centroidY: region.centroid.y,
    statsVersion: region.statsVersion,
    extraStats: JSON.stringify(region.extraStats),
    createdAt: region.createdAt,
    updatedAt: region.updatedAt
  }
}

function runWithDb<T>(dataRoot: string, worldId: string, run: (db: SqliteDb) => T): T {
  const db = openDb(dataRoot, worldId)
  try {
    return run(db)
  } finally {
    db.close()
  }
}

export type RegionStore = {
  saveRegion: (region: RegionRecord, cells: RegionCellRef[]) => RegionRecord
  getRegion: (worldId: string, regionId: string) => RegionRecord | null
  listRegions: (worldId: string) => RegionRecord[]
  getRegionAt: (worldId: string, x: number, y: number) => RegionRecord | null
  getRegionsInBounds: (worldId: string, bounds: Aabb) => RegionRecord[]
  getRegionCells: (worldId: string, regionId: string) => RegionCellRef[]
  listMembershipInBounds: (worldId: string, bounds: Aabb) => RegionCellRef[]
  deleteRegion: (worldId: string, regionId: string) => void
  clearRegions: (worldId: string) => void
  countRegions: (worldId: string) => number
}

function insertRegion(db: SqliteDb, region: RegionRecord): void {
  db.prepare(
    `INSERT OR REPLACE INTO regions VALUES
    (@regionId, @worldId, @sourceExpansionId, @dominantLandType, @landTypeHistogram,
     @averageElevation, @minElevation, @maxElevation, @waterContent, @isOcean,
     @touchesOcean, @isLandlocked, @cellCount, @minX, @minY, @maxX, @maxY,
     @centroidX, @centroidY, @statsVersion, @extraStats, @createdAt, @updatedAt)`
  ).run(regionParams(region))
}

function insertMembership(db: SqliteDb, region: RegionRecord, cells: RegionCellRef[]): void {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO region_membership (worldId, x, y, regionId)
     VALUES (@worldId, @x, @y, @regionId)`
  )
  for (const cell of cells) stmt.run({ worldId: region.worldId, regionId: region.regionId, ...cell })
}

function queryRegionsByIds(db: SqliteDb, worldId: string, ids: string[]): RegionRecord[] {
  if (ids.length === 0) return []
  const rows = ids.flatMap((id) => db.prepare('SELECT * FROM regions WHERE worldId = ? AND regionId = ?').all(worldId, id))
  return (rows as RegionRow[]).map(rowToRegion)
}

function saveRegionRecord(dataRoot: string, region: RegionRecord, cells: RegionCellRef[]): RegionRecord {
  return runWithDb(dataRoot, region.worldId, (db) => {
    const save = db.transaction(() => {
      insertRegion(db, region)
      insertMembership(db, region, cells)
    })
    save()
    return region
  })
}

function getRegionRecord(dataRoot: string, worldId: string, regionId: string): RegionRecord | null {
  return runWithDb(dataRoot, worldId, (db) => {
    const row = db.prepare('SELECT * FROM regions WHERE worldId = ? AND regionId = ?').get(worldId, regionId)
    return row ? rowToRegion(row as RegionRow) : null
  })
}

function listRegionRecords(dataRoot: string, worldId: string): RegionRecord[] {
  return runWithDb(dataRoot, worldId, (db) => {
    const rows = db.prepare('SELECT * FROM regions WHERE worldId = ? ORDER BY regionId').all(worldId)
    return (rows as RegionRow[]).map(rowToRegion)
  })
}

function getRegionAtPoint(dataRoot: string, worldId: string, x: number, y: number): RegionRecord | null {
  return runWithDb(dataRoot, worldId, (db) => {
    const row = db.prepare('SELECT regionId FROM region_membership WHERE worldId = ? AND x = ? AND y = ?').get(worldId, x, y)
    const membership = row as MembershipRow | undefined
    return membership ? queryRegionsByIds(db, worldId, [membership.regionId])[0] ?? null : null
  })
}

function getRecordsInBounds(dataRoot: string, worldId: string, bounds: Aabb): RegionRecord[] {
  return runWithDb(dataRoot, worldId, (db) => {
    const rows = db.prepare(
      `SELECT DISTINCT regionId FROM region_membership
       WHERE worldId = ? AND x BETWEEN ? AND ? AND y BETWEEN ? AND ? ORDER BY regionId`
    ).all(worldId, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY)
    return queryRegionsByIds(db, worldId, (rows as MembershipRow[]).map((row) => row.regionId))
  })
}

function getMembershipRows(dataRoot: string, worldId: string, sql: string, params: SqlValue[]): RegionCellRef[] {
  return runWithDb(dataRoot, worldId, (db) => {
    const rows = db.prepare(sql).all(...params)
    return (rows as MembershipRow[]).map(({ x, y }) => ({ x, y }))
  })
}

function getCellsForRegion(dataRoot: string, worldId: string, regionId: string): RegionCellRef[] {
  return getMembershipRows(
    dataRoot,
    worldId,
    `SELECT x, y FROM region_membership
     WHERE worldId = ? AND regionId = ? ORDER BY y, x`,
    [worldId, regionId]
  )
}

function getMembershipInBounds(dataRoot: string, worldId: string, bounds: Aabb): RegionCellRef[] {
  return getMembershipRows(
    dataRoot,
    worldId,
    `SELECT x, y FROM region_membership
     WHERE worldId = ? AND x BETWEEN ? AND ? AND y BETWEEN ? AND ?`,
    [worldId, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]
  )
}

function deleteRegionRecord(dataRoot: string, worldId: string, regionId: string): void {
  runWithDb(dataRoot, worldId, (db) => {
    db.prepare('DELETE FROM region_membership WHERE worldId = ? AND regionId = ?').run(worldId, regionId)
    db.prepare('DELETE FROM regions WHERE worldId = ? AND regionId = ?').run(worldId, regionId)
  })
}

function clearRegionRecords(dataRoot: string, worldId: string): void {
  runWithDb(dataRoot, worldId, (db) => {
    db.prepare('DELETE FROM region_membership WHERE worldId = ?').run(worldId)
    db.prepare('DELETE FROM regions WHERE worldId = ?').run(worldId)
  })
}

function countRegionRecords(dataRoot: string, worldId: string): number {
  return runWithDb(dataRoot, worldId, (db) => {
    const row = db.prepare('SELECT COUNT(*) AS count FROM regions WHERE worldId = ?').get(worldId) as { count: number }
    return row.count
  })
}

export function createRegionStore(dataRoot: string): RegionStore {
  return {
    saveRegion: (region, cells) => saveRegionRecord(dataRoot, region, cells),
    getRegion: (worldId, regionId) => getRegionRecord(dataRoot, worldId, regionId),
    listRegions: (worldId) => listRegionRecords(dataRoot, worldId),
    getRegionAt: (worldId, x, y) => getRegionAtPoint(dataRoot, worldId, x, y),
    getRegionsInBounds: (worldId, bounds) => getRecordsInBounds(dataRoot, worldId, bounds),
    getRegionCells: (worldId, regionId) => getCellsForRegion(dataRoot, worldId, regionId),
    listMembershipInBounds: (worldId, bounds) => getMembershipInBounds(dataRoot, worldId, bounds),
    deleteRegion: (worldId, regionId) => deleteRegionRecord(dataRoot, worldId, regionId),
    clearRegions: (worldId) => clearRegionRecords(dataRoot, worldId),
    countRegions: (worldId) => countRegionRecords(dataRoot, worldId)
  }
}
