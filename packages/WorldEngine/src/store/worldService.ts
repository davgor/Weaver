import type { Aabb, Cell, ExpansionRecord, NoiseParams, SparseOverlay, WorldMeta } from '../types.js'
import {
  aabbCellCount,
  aabbContainsPoint,
  applyLandTypeOverride,
  assertAabb,
  LAND_TYPE_OVERRIDE_KEY,
  unionAabb
} from '../types.js'
import { DEFAULT_NOISE, createWorldCell } from '../noise/perlin.js'
import { readChunkCell, writeCells } from './chunks.js'
import {
  clearSparseOverlays,
  getExpansion,
  getLatestExpansion,
  getSparseOverlay,
  hasMeta,
  initializeWorld,
  insertExpansion,
  listExpansions,
  listSparseOverlays,
  listWorldIds,
  nextExpansionSequence,
  readMeta,
  removeWorldDir,
  setSparseOverlay,
  updateMeta,
  upsertChunkManifest,
  type ListOverlaysFilter
} from './metaStore.js'

export type CreateWorldOptions = {
  worldId?: string
  seed?: number
  width?: number
  height?: number
  originX?: number
  originY?: number
  bounds?: Aabb
  noise?: Partial<NoiseParams>
}

export type ExpandWorldOptions = {
  worldId: string
  bounds: Aabb
}

export type SetOverlayInput = {
  worldId: string
  x: number
  y: number
  key: string
  value: string
}

export type GetOverlayInput = {
  worldId: string
  x: number
  y: number
  key: string
}

export type WorldService = {
  createWorld: (opts?: CreateWorldOptions) => { meta: WorldMeta; expansion0: ExpansionRecord }
  expandWorld: (opts: ExpandWorldOptions) => ExpansionRecord
  hasWorld: (worldId: string) => boolean
  listWorlds: () => string[]
  deleteWorld: (worldId: string) => void
  getWorldMeta: (worldId: string) => WorldMeta
  getWorldBounds: (worldId: string) => Aabb
  getExpansion: (worldId: string, expansionId: string) => ExpansionRecord | null
  listExpansions: (worldId: string) => ExpansionRecord[]
  getLatestExpansion: (worldId: string) => ExpansionRecord | null
  getCell: (args: { worldId: string; x: number; y: number }) => Cell | null
  getWorldSpecific: (args: { worldId: string; bounds: Aabb }) => Cell[]
  getWorldWhole: (worldId: string) => Iterable<Cell>
  setSparseOverlay: (overlay: SetOverlayInput) => SparseOverlay
  getSparseOverlay: (args: GetOverlayInput) => SparseOverlay | null
  listSparseOverlays: (filter: Omit<ListOverlaysFilter, 'worldId'> & { worldId: string }) => SparseOverlay[]
  clearSparseOverlays: (filter: Omit<ListOverlaysFilter, 'worldId'> & { worldId: string }) => number
}

type AddedCells = {
  bounds: Aabb
  count: number
}

function newId(): string {
  return `world_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`
}

function createBounds(opts: CreateWorldOptions): Aabb {
  if (opts.bounds) return assertAabb(opts.bounds)
  const width = opts.width ?? 64
  const height = opts.height ?? 64
  if (width < 1 || height < 1) throw new Error('width and height must be >= 1')
  const minX = opts.originX ?? 0
  const minY = opts.originY ?? 0
  return assertAabb({ minX, minY, maxX: minX + width - 1, maxY: minY + height - 1 })
}

function noiseParams(input?: Partial<NoiseParams>): NoiseParams {
  return { ...DEFAULT_NOISE, ...input }
}

function containsAabb(outer: Aabb, inner: Aabb): boolean {
  return outer.minX <= inner.minX && outer.minY <= inner.minY && outer.maxX >= inner.maxX && outer.maxY >= inner.maxY
}

function sameAabb(a: Aabb, b: Aabb): boolean {
  return a.minX === b.minX && a.minY === b.minY && a.maxX === b.maxX && a.maxY === b.maxY
}

function intersection(a: Aabb, b: Aabb): Aabb | null {
  const bounds = {
    minX: Math.max(a.minX, b.minX),
    minY: Math.max(a.minY, b.minY),
    maxX: Math.min(a.maxX, b.maxX),
    maxY: Math.min(a.maxY, b.maxY)
  }
  return bounds.maxX < bounds.minX || bounds.maxY < bounds.minY ? null : bounds
}

function generatedCell(meta: WorldMeta, x: number, y: number): Cell {
  return createWorldCell({ seed: meta.seed, x, y, noise: meta.noise })
}

function* generateCells(meta: WorldMeta, bounds: Aabb, previous?: Aabb): Iterable<Cell> {
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!previous || !aabbContainsPoint(previous, x, y)) yield generatedCell(meta, x, y)
    }
  }
}

function addedCells(resulting: Aabb, previous: Aabb): AddedCells {
  let added: Aabb | null = null
  let count = 0
  for (let y = resulting.minY; y <= resulting.maxY; y++) {
    for (let x = resulting.minX; x <= resulting.maxX; x++) {
      if (aabbContainsPoint(previous, x, y)) continue
      const cellBounds = { minX: x, minY: y, maxX: x, maxY: y }
      added = added ? unionAabb(added, cellBounds) : cellBounds
      count++
    }
  }
  if (!added) throw new Error('Expansion does not add cells')
  return { bounds: added, count }
}

function createMeta(worldId: string, opts: CreateWorldOptions, bounds: Aabb): WorldMeta {
  const now = new Date().toISOString()
  return {
    worldId,
    seed: opts.seed ?? Math.floor(Math.random() * 1e9),
    bounds,
    noise: noiseParams(opts.noise),
    createdAt: now,
    updatedAt: now,
    cellCount: aabbCellCount(bounds)
  }
}

function expansionRecord(args: {
  worldId: string
  sequence: number
  addedBounds: Aabb
  previousBounds: Aabb | null
  resultingBounds: Aabb
  cellCount: number
}): ExpansionRecord {
  return {
    expansionId: `expansion_${args.sequence}`,
    worldId: args.worldId,
    sequence: args.sequence,
    addedBounds: args.addedBounds,
    previousBounds: args.previousBounds,
    resultingBounds: args.resultingBounds,
    createdAt: new Date().toISOString(),
    cellCount: args.cellCount
  }
}

function persistGenerated(args: { dataRoot: string; meta: WorldMeta; bounds: Aabb; previous?: Aabb }): void {
  const chunkIds = writeCells({
    dataRoot: args.dataRoot,
    worldId: args.meta.worldId,
    cells: generateCells(args.meta, args.bounds, args.previous)
  })
  upsertChunkManifest({
    dataRoot: args.dataRoot,
    worldId: args.meta.worldId,
    chunkIds,
    updatedAt: args.meta.updatedAt
  })
}

function createWorldAt(dataRoot: string, opts: CreateWorldOptions): { meta: WorldMeta; expansion0: ExpansionRecord } {
  const worldId = opts.worldId ?? newId()
  if (hasMeta(dataRoot, worldId)) throw new Error(`World already exists: ${worldId}`)
  const bounds = createBounds(opts)
  const meta = createMeta(worldId, opts, bounds)
  const expansion0 = expansionRecord({
    worldId,
    sequence: 0,
    addedBounds: bounds,
    previousBounds: null,
    resultingBounds: bounds,
    cellCount: meta.cellCount
  })
  const chunkIds = writeCells({ dataRoot, worldId, cells: generateCells(meta, bounds) })
  initializeWorld({ dataRoot, meta, expansion: expansion0 })
  upsertChunkManifest({ dataRoot, worldId, chunkIds, updatedAt: meta.updatedAt })
  return { meta, expansion0 }
}

function expandedMeta(meta: WorldMeta, bounds: Aabb, addedCount: number): WorldMeta {
  return {
    ...meta,
    bounds,
    updatedAt: new Date().toISOString(),
    cellCount: meta.cellCount + addedCount
  }
}

function expandWorldAt(dataRoot: string, opts: ExpandWorldOptions): ExpansionRecord {
  const current = readMeta(dataRoot, opts.worldId)
  const bounds = assertAabb(opts.bounds)
  if (!containsAabb(bounds, current.bounds) || sameAabb(bounds, current.bounds)) {
    throw new Error('Expansion bounds must grow the existing world bounds')
  }
  const added = addedCells(bounds, current.bounds)
  const meta = expandedMeta(current, bounds, added.count)
  const sequence = nextExpansionSequence(dataRoot, opts.worldId)
  const expansion = expansionRecord({
    worldId: opts.worldId,
    sequence,
    addedBounds: added.bounds,
    previousBounds: current.bounds,
    resultingBounds: bounds,
    cellCount: added.count
  })
  persistGenerated({ dataRoot, meta, bounds, previous: current.bounds })
  updateMeta(dataRoot, meta)
  insertExpansion(dataRoot, opts.worldId, expansion)
  return expansion
}

function overlayKey(x: number, y: number): string {
  return `${x},${y}`
}

function landTypeOverrideMap(
  dataRoot: string,
  worldId: string,
  bounds?: Aabb
): Map<string, string> {
  const filter: ListOverlaysFilter = {
    worldId,
    keyPrefix: LAND_TYPE_OVERRIDE_KEY
  }
  if (bounds) filter.bounds = bounds
  const overlays = listSparseOverlays(dataRoot, filter)
  const map = new Map<string, string>()
  for (const overlay of overlays) {
    if (overlay.key === LAND_TYPE_OVERRIDE_KEY) map.set(overlayKey(overlay.x, overlay.y), overlay.value)
  }
  return map
}

type CellLookup = {
  dataRoot: string
  meta: WorldMeta
  x: number
  y: number
  overrides?: Map<string, string>
}

function getCellAt(lookup: CellLookup): Cell | null {
  const { dataRoot, meta, x, y, overrides } = lookup
  if (!aabbContainsPoint(meta.bounds, x, y)) return null
  const base = readChunkCell({ dataRoot, worldId: meta.worldId, x, y })
  if (!base) return null
  return applyLandTypeOverride(base, overrides?.get(overlayKey(x, y)))
}

function getSpecific(dataRoot: string, args: { worldId: string; bounds: Aabb }): Cell[] {
  const meta = readMeta(dataRoot, args.worldId)
  const bounds = intersection(assertAabb(args.bounds), meta.bounds)
  if (!bounds) return []
  const overrides = landTypeOverrideMap(dataRoot, args.worldId, bounds)
  const cells: Cell[] = []
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const cell = getCellAt({ dataRoot, meta, x, y, overrides })
      if (cell) cells.push(cell)
    }
  }
  return cells
}

function* iterateWorld(dataRoot: string, worldId: string): Iterable<Cell> {
  const meta = readMeta(dataRoot, worldId)
  const overrides = landTypeOverrideMap(dataRoot, worldId, meta.bounds)
  for (let y = meta.bounds.minY; y <= meta.bounds.maxY; y++) {
    for (let x = meta.bounds.minX; x <= meta.bounds.maxX; x++) {
      const cell = getCellAt({ dataRoot, meta, x, y, overrides })
      if (cell) yield cell
    }
  }
}

function getEffectiveCell(
  dataRoot: string,
  args: { worldId: string; x: number; y: number }
): Cell | null {
  const meta = readMeta(dataRoot, args.worldId)
  const overrides = landTypeOverrideMap(dataRoot, args.worldId, {
    minX: args.x,
    minY: args.y,
    maxX: args.x,
    maxY: args.y
  })
  return getCellAt({ dataRoot, meta, x: args.x, y: args.y, overrides })
}

export function createWorldService(dataRoot: string): WorldService {
  return {
    createWorld: (opts = {}) => createWorldAt(dataRoot, opts),
    expandWorld: (opts) => expandWorldAt(dataRoot, opts),
    hasWorld: (worldId) => hasMeta(dataRoot, worldId),
    listWorlds: () => listWorldIds(dataRoot),
    deleteWorld: (worldId) => {
      if (!hasMeta(dataRoot, worldId)) throw new Error(`World not found: ${worldId}`)
      removeWorldDir(dataRoot, worldId)
    },
    getWorldMeta: (worldId) => readMeta(dataRoot, worldId),
    getWorldBounds: (worldId) => readMeta(dataRoot, worldId).bounds,
    getExpansion: (worldId, expansionId) => getExpansion(dataRoot, worldId, expansionId),
    listExpansions: (worldId) => listExpansions(dataRoot, worldId),
    getLatestExpansion: (worldId) => getLatestExpansion(dataRoot, worldId),
    getCell: (args) => getEffectiveCell(dataRoot, args),
    getWorldSpecific: (args) => getSpecific(dataRoot, args),
    getWorldWhole: (worldId) => iterateWorld(dataRoot, worldId),
    setSparseOverlay: (overlay) => setSparseOverlay(dataRoot, overlay),
    getSparseOverlay: (args) => getSparseOverlay(dataRoot, args),
    listSparseOverlays: (filter) => listSparseOverlays(dataRoot, filter),
    clearSparseOverlays: (filter) => clearSparseOverlays(dataRoot, filter)
  }
}
