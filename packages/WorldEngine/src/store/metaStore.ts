import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type {
  Aabb,
  ChunkRecord,
  ExpansionRecord,
  NoiseParams,
  SparseOverlay,
  WorldMeta
} from '../types.js'
import { assertAabb, assertLandType, LAND_TYPE_OVERRIDE_KEY } from '../types.js'
import { chunkBounds, chunkFileName } from './chunks.js'

type OverlayRow = {
  worldId: string
  x: number
  y: number
  key: string
  value: string
}

type SqliteDb = Database.Database

type MetaRow = {
  worldId: string
  seed: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  frequency: number
  octaves: number
  persistence: number
  lacunarity: number
  createdAt: string
  updatedAt: string
  cellCount: number
}

type ExpansionRow = {
  expansionId: string
  worldId: string
  sequence: number
  addedMinX: number
  addedMinY: number
  addedMaxX: number
  addedMaxY: number
  previousMinX: number | null
  previousMinY: number | null
  previousMaxX: number | null
  previousMaxY: number | null
  resultingMinX: number
  resultingMinY: number
  resultingMaxX: number
  resultingMaxY: number
  createdAt: string
  cellCount: number | null
}

function worldDir(dataRoot: string, worldId: string): string {
  return join(dataRoot, worldId)
}

function dbPath(dataRoot: string, worldId: string): string {
  return join(worldDir(dataRoot, worldId), 'world.sqlite')
}

function createWorldMetaTable(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_meta (
      worldId TEXT PRIMARY KEY,
      seed INTEGER NOT NULL,
      minX INTEGER NOT NULL,
      minY INTEGER NOT NULL,
      maxX INTEGER NOT NULL,
      maxY INTEGER NOT NULL,
      frequency REAL NOT NULL,
      octaves INTEGER NOT NULL,
      persistence REAL NOT NULL,
      lacunarity REAL NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      cellCount INTEGER NOT NULL
    );
  `)
}

function createExpansionTable(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS expansions (
      expansionId TEXT PRIMARY KEY,
      worldId TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      addedMinX INTEGER NOT NULL,
      addedMinY INTEGER NOT NULL,
      addedMaxX INTEGER NOT NULL,
      addedMaxY INTEGER NOT NULL,
      previousMinX INTEGER,
      previousMinY INTEGER,
      previousMaxX INTEGER,
      previousMaxY INTEGER,
      resultingMinX INTEGER NOT NULL,
      resultingMinY INTEGER NOT NULL,
      resultingMaxX INTEGER NOT NULL,
      resultingMaxY INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      cellCount INTEGER,
      UNIQUE(worldId, sequence)
    );
  `)
}

function createChunkManifestTable(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chunk_manifest (
      chunkId TEXT PRIMARY KEY,
      worldId TEXT NOT NULL,
      cx INTEGER NOT NULL,
      cy INTEGER NOT NULL,
      minX INTEGER NOT NULL,
      minY INTEGER NOT NULL,
      maxX INTEGER NOT NULL,
      maxY INTEGER NOT NULL,
      fileName TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)
}

function createOverlayTable(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS overlays (
      worldId TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY(worldId, x, y, key)
    );
  `)
}

function ensureSchema(db: SqliteDb): void {
  createWorldMetaTable(db)
  createExpansionTable(db)
  createChunkManifestTable(db)
  createOverlayTable(db)
}

function openDb(dataRoot: string, worldId: string): SqliteDb {
  mkdirSync(worldDir(dataRoot, worldId), { recursive: true })
  const db = new Database(dbPath(dataRoot, worldId))
  ensureSchema(db)
  return db
}

function boundsFromRow(row: MetaRow): Aabb {
  return { minX: row.minX, minY: row.minY, maxX: row.maxX, maxY: row.maxY }
}

function noiseFromRow(row: MetaRow): NoiseParams {
  return {
    frequency: row.frequency,
    octaves: row.octaves,
    persistence: row.persistence,
    lacunarity: row.lacunarity
  }
}

function rowToMeta(row: MetaRow): WorldMeta {
  return {
    worldId: row.worldId,
    seed: row.seed,
    bounds: boundsFromRow(row),
    noise: noiseFromRow(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    cellCount: row.cellCount
  }
}

function previousBounds(row: ExpansionRow): Aabb | null {
  if (row.previousMinX === null || row.previousMinY === null) return null
  if (row.previousMaxX === null || row.previousMaxY === null) return null
  return { minX: row.previousMinX, minY: row.previousMinY, maxX: row.previousMaxX, maxY: row.previousMaxY }
}

function rowToExpansion(row: ExpansionRow): ExpansionRecord {
  const record = {
    expansionId: row.expansionId,
    worldId: row.worldId,
    sequence: row.sequence,
    addedBounds: { minX: row.addedMinX, minY: row.addedMinY, maxX: row.addedMaxX, maxY: row.addedMaxY },
    previousBounds: previousBounds(row),
    resultingBounds: { minX: row.resultingMinX, minY: row.resultingMinY, maxX: row.resultingMaxX, maxY: row.resultingMaxY },
    createdAt: row.createdAt
  }
  return row.cellCount === null ? record : { ...record, cellCount: row.cellCount }
}

function requireMetaRow(db: SqliteDb, worldId: string): MetaRow {
  const row = db.prepare('SELECT * FROM world_meta WHERE worldId = ?').get(worldId) as MetaRow | undefined
  if (!row) throw new Error(`World not found: ${worldId}`)
  return row
}

function insertMeta(db: SqliteDb, meta: WorldMeta): void {
  db.prepare(
    `INSERT INTO world_meta VALUES
    (@worldId, @seed, @minX, @minY, @maxX, @maxY, @frequency, @octaves,
     @persistence, @lacunarity, @createdAt, @updatedAt, @cellCount)`
  ).run({ ...meta, ...meta.bounds, ...meta.noise })
}

function expansionParams(record: ExpansionRecord): Record<string, string | number | null> {
  return {
    expansionId: record.expansionId,
    worldId: record.worldId,
    sequence: record.sequence,
    addedMinX: record.addedBounds.minX,
    addedMinY: record.addedBounds.minY,
    addedMaxX: record.addedBounds.maxX,
    addedMaxY: record.addedBounds.maxY,
    previousMinX: record.previousBounds?.minX ?? null,
    previousMinY: record.previousBounds?.minY ?? null,
    previousMaxX: record.previousBounds?.maxX ?? null,
    previousMaxY: record.previousBounds?.maxY ?? null,
    resultingMinX: record.resultingBounds.minX,
    resultingMinY: record.resultingBounds.minY,
    resultingMaxX: record.resultingBounds.maxX,
    resultingMaxY: record.resultingBounds.maxY,
    createdAt: record.createdAt,
    cellCount: record.cellCount ?? null
  }
}

export function hasMeta(dataRoot: string, worldId: string): boolean {
  return existsSync(dbPath(dataRoot, worldId))
}

export function listWorldIds(dataRoot: string): string[] {
  if (!existsSync(dataRoot)) return []
  return readdirSync(dataRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && hasMeta(dataRoot, entry.name))
    .map((entry) => entry.name)
    .sort()
}

export function removeWorldDir(dataRoot: string, worldId: string): void {
  rmSync(worldDir(dataRoot, worldId), { recursive: true, force: true })
}

export function initializeWorld(args: { dataRoot: string; meta: WorldMeta; expansion: ExpansionRecord }): void {
  const db = openDb(args.dataRoot, args.meta.worldId)
  try {
    insertMeta(db, args.meta)
    insertExpansion(args.dataRoot, args.meta.worldId, args.expansion)
  } finally {
    db.close()
  }
}

export function readMeta(dataRoot: string, worldId: string): WorldMeta {
  const db = openDb(dataRoot, worldId)
  try {
    return rowToMeta(requireMetaRow(db, worldId))
  } finally {
    db.close()
  }
}

export function updateMeta(dataRoot: string, meta: WorldMeta): void {
  const db = openDb(dataRoot, meta.worldId)
  try {
    db.prepare(
      `UPDATE world_meta SET minX=@minX, minY=@minY, maxX=@maxX, maxY=@maxY,
       updatedAt=@updatedAt, cellCount=@cellCount WHERE worldId=@worldId`
    ).run({ ...meta, ...meta.bounds })
  } finally {
    db.close()
  }
}

export function insertExpansion(dataRoot: string, worldId: string, record: ExpansionRecord): void {
  const db = openDb(dataRoot, worldId)
  try {
    db.prepare(
      `INSERT INTO expansions VALUES
      (@expansionId, @worldId, @sequence, @addedMinX, @addedMinY, @addedMaxX,
       @addedMaxY, @previousMinX, @previousMinY, @previousMaxX, @previousMaxY,
       @resultingMinX, @resultingMinY, @resultingMaxX, @resultingMaxY, @createdAt, @cellCount)`
    ).run(expansionParams(record))
  } finally {
    db.close()
  }
}

export function getExpansion(dataRoot: string, worldId: string, expansionId: string): ExpansionRecord | null {
  const db = openDb(dataRoot, worldId)
  try {
    requireMetaRow(db, worldId)
    const row = db.prepare('SELECT * FROM expansions WHERE worldId = ? AND expansionId = ?').get(worldId, expansionId)
    return row ? rowToExpansion(row as ExpansionRow) : null
  } finally {
    db.close()
  }
}

export function listExpansions(dataRoot: string, worldId: string): ExpansionRecord[] {
  const db = openDb(dataRoot, worldId)
  try {
    requireMetaRow(db, worldId)
    const rows = db.prepare('SELECT * FROM expansions WHERE worldId = ? ORDER BY sequence').all(worldId) as ExpansionRow[]
    return rows.map(rowToExpansion)
  } finally {
    db.close()
  }
}

export function getLatestExpansion(dataRoot: string, worldId: string): ExpansionRecord | null {
  const expansions = listExpansions(dataRoot, worldId)
  return expansions.at(-1) ?? null
}

export function nextExpansionSequence(dataRoot: string, worldId: string): number {
  const latest = getLatestExpansion(dataRoot, worldId)
  return latest ? latest.sequence + 1 : 0
}

function parseChunkId(id: string): { cx: number; cy: number } {
  const match = /^c(-?\d+)_(-?\d+)$/.exec(id)
  if (!match?.[1] || !match[2]) throw new Error(`Invalid chunkId: ${id}`)
  return { cx: Number(match[1]), cy: Number(match[2]) }
}

function chunkRecord(worldId: string, id: string, updatedAt: string): ChunkRecord {
  const { cx, cy } = parseChunkId(id)
  return { chunkId: id, worldId, cx, cy, bounds: chunkBounds(cx, cy), fileName: chunkFileName(cx, cy), updatedAt }
}

export function upsertChunkManifest(args: { dataRoot: string; worldId: string; chunkIds: Iterable<string>; updatedAt: string }): void {
  const db = openDb(args.dataRoot, args.worldId)
  try {
    const stmt = db.prepare(
      `INSERT INTO chunk_manifest VALUES
      (@chunkId, @worldId, @cx, @cy, @minX, @minY, @maxX, @maxY, @fileName, @updatedAt)
      ON CONFLICT(chunkId) DO UPDATE SET updatedAt=@updatedAt`
    )
    for (const id of args.chunkIds) {
      const record = chunkRecord(args.worldId, id, args.updatedAt)
      stmt.run({ ...record, ...record.bounds })
    }
  } finally {
    db.close()
  }
}

function rowToOverlay(row: OverlayRow): SparseOverlay {
  return { worldId: row.worldId, x: row.x, y: row.y, key: row.key, value: row.value }
}

function validateOverlayValue(key: string, value: string): string {
  if (key === LAND_TYPE_OVERRIDE_KEY) return assertLandType(value)
  if (!key) throw new Error('overlay key required')
  if (value === '') throw new Error('overlay value required')
  return value
}

export function setSparseOverlay(
  dataRoot: string,
  overlay: Omit<SparseOverlay, 'worldId'> & { worldId: string }
): SparseOverlay {
  const value = validateOverlayValue(overlay.key, overlay.value)
  const db = openDb(dataRoot, overlay.worldId)
  try {
    requireMetaRow(db, overlay.worldId)
    db.prepare(
      `INSERT INTO overlays (worldId, x, y, key, value) VALUES (@worldId, @x, @y, @key, @value)
       ON CONFLICT(worldId, x, y, key) DO UPDATE SET value=@value`
    ).run({ ...overlay, value })
    return { ...overlay, value }
  } finally {
    db.close()
  }
}

export function getSparseOverlay(
  dataRoot: string,
  args: { worldId: string; x: number; y: number; key: string }
): SparseOverlay | null {
  const db = openDb(dataRoot, args.worldId)
  try {
    requireMetaRow(db, args.worldId)
    const row = db
      .prepare('SELECT * FROM overlays WHERE worldId = ? AND x = ? AND y = ? AND key = ?')
      .get(args.worldId, args.x, args.y, args.key) as OverlayRow | undefined
    return row ? rowToOverlay(row) : null
  } finally {
    db.close()
  }
}

export type ListOverlaysFilter = {
  worldId: string
  keyPrefix?: string
  bounds?: Aabb
}

export function listSparseOverlays(dataRoot: string, filter: ListOverlaysFilter): SparseOverlay[] {
  const db = openDb(dataRoot, filter.worldId)
  try {
    requireMetaRow(db, filter.worldId)
    return queryOverlays(db, filter).map(rowToOverlay)
  } finally {
    db.close()
  }
}

export function clearSparseOverlays(dataRoot: string, filter: ListOverlaysFilter): number {
  const db = openDb(dataRoot, filter.worldId)
  try {
    requireMetaRow(db, filter.worldId)
    const rows = queryOverlays(db, filter)
    if (rows.length === 0) return 0
    const stmt = db.prepare('DELETE FROM overlays WHERE worldId = ? AND x = ? AND y = ? AND key = ?')
    for (const row of rows) stmt.run(row.worldId, row.x, row.y, row.key)
    return rows.length
  } finally {
    db.close()
  }
}

function queryOverlays(db: SqliteDb, filter: ListOverlaysFilter): OverlayRow[] {
  const bounds = filter.bounds ? assertAabb(filter.bounds) : null
  const prefix = filter.keyPrefix
  let sql = 'SELECT * FROM overlays WHERE worldId = ?'
  const params: Array<string | number> = [filter.worldId]
  if (prefix !== undefined) {
    sql += ' AND key LIKE ?'
    params.push(`${prefix}%`)
  }
  if (bounds) {
    sql += ' AND x >= ? AND x <= ? AND y >= ? AND y <= ?'
    params.push(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY)
  }
  sql += ' ORDER BY y, x, key'
  return db.prepare(sql).all(...params) as OverlayRow[]
}
