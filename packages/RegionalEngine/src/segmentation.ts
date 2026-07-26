import { createHash } from 'node:crypto'
import type {
  Aabb,
  Cell,
  LandType,
  LandTypeHistogram,
  RegionCandidate,
  RegionCellRef,
  RegionalWorldReader,
  RegionScope,
  RegionStats,
  WorldMeta
} from './types.js'
import { REGION_STATS_VERSION } from './types.js'

type CellMap = Map<string, Cell>
type FloodContext = {
  landType: LandType
  available: CellMap
  visited: Set<string>
  stack: Cell[]
}

const WATER_EDGE_TYPES = new Set<LandType>(['ocean', 'beach'])

function keyOf(x: number, y: number): string {
  return `${x},${y}`
}

function sortCells<T extends RegionCellRef>(cells: T[]): T[] {
  return [...cells].sort((a, b) => a.y - b.y || a.x - b.x)
}

function cellBounds(cell: RegionCellRef): Aabb {
  return { minX: cell.x, minY: cell.y, maxX: cell.x, maxY: cell.y }
}

function expandBounds(bounds: Aabb, cell: RegionCellRef): Aabb {
  return {
    minX: Math.min(bounds.minX, cell.x),
    minY: Math.min(bounds.minY, cell.y),
    maxX: Math.max(bounds.maxX, cell.x),
    maxY: Math.max(bounds.maxY, cell.y)
  }
}

function intersectBounds(a: Aabb, b: Aabb): Aabb | null {
  const bounds = {
    minX: Math.max(a.minX, b.minX),
    minY: Math.max(a.minY, b.minY),
    maxX: Math.min(a.maxX, b.maxX),
    maxY: Math.min(a.maxY, b.maxY)
  }
  return bounds.maxX < bounds.minX || bounds.maxY < bounds.minY ? null : bounds
}

function neighbors(cell: RegionCellRef): RegionCellRef[] {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 }
  ]
}

function histogram(cells: Cell[]): LandTypeHistogram {
  const counts: LandTypeHistogram = {}
  for (const cell of cells) counts[cell.landType] = (counts[cell.landType] ?? 0) + 1
  return counts
}

function elevationStats(cells: Cell[]): Pick<RegionStats, 'averageElevation' | 'minElevation' | 'maxElevation'> {
  const elevations = cells.map((cell) => cell.elevation)
  const total = elevations.reduce((sum, value) => sum + value, 0)
  return {
    averageElevation: total / elevations.length,
    minElevation: Math.min(...elevations),
    maxElevation: Math.max(...elevations)
  }
}

function spatialStats(cells: Cell[]): Pick<RegionStats, 'bounds' | 'centroid'> {
  const sorted = sortCells(cells)
  let bounds = cellBounds(sorted[0] as Cell)
  let totalX = 0
  let totalY = 0
  for (const cell of sorted) {
    bounds = expandBounds(bounds, cell)
    totalX += cell.x
    totalY += cell.y
  }
  return { bounds, centroid: { x: totalX / sorted.length, y: totalY / sorted.length } }
}

function waterTouches(world: RegionalWorldReader, worldId: string, local: CellMap, cell: Cell): boolean {
  if (WATER_EDGE_TYPES.has(cell.landType)) return true
  for (const neighbor of neighbors(cell)) {
    const adjacent = local.get(keyOf(neighbor.x, neighbor.y)) ?? world.getCell({ worldId, ...neighbor })
    if (adjacent && WATER_EDGE_TYPES.has(adjacent.landType)) return true
  }
  return false
}

function waterStats(world: RegionalWorldReader, worldId: string, local: CellMap, cells: Cell[]): Pick<RegionStats, 'waterContent' | 'touchesOcean'> {
  let waterAdjacent = 0
  for (const cell of cells) {
    if (waterTouches(world, worldId, local, cell)) waterAdjacent++
  }
  return { waterContent: waterAdjacent / cells.length, touchesOcean: waterAdjacent > 0 }
}

function regionId(args: { meta: WorldMeta; sourceExpansionId?: string; landType: LandType; cells: Cell[] }): string {
  const keys = sortCells(args.cells).map((cell) => keyOf(cell.x, cell.y)).join(';')
  const input = `${args.meta.worldId}|${args.meta.seed}|${args.sourceExpansionId ?? 'full'}|${args.landType}|${keys}`
  return `region_${createHash('sha256').update(input).digest('hex').slice(0, 12)}`
}

function buildStats(world: RegionalWorldReader, worldId: string, local: CellMap, cells: Cell[]): RegionStats {
  const dominantLandType = cells[0]?.landType
  if (!dominantLandType) throw new Error('Cannot build region stats for empty cells')
  const isOcean = dominantLandType === 'ocean'
  const water = waterStats(world, worldId, local, cells)
  return {
    dominantLandType,
    landTypeHistogram: histogram(cells),
    ...elevationStats(cells),
    ...water,
    isOcean,
    isLandlocked: !isOcean && !water.touchesOcean,
    cellCount: cells.length,
    ...spatialStats(cells),
    statsVersion: REGION_STATS_VERSION,
    extraStats: { waterContentFormula: 'share of cells that are ocean/beach or 4-neighbor an ocean/beach cell' }
  }
}

function flood(start: Cell, available: CellMap, visited: Set<string>): Cell[] {
  const result: Cell[] = []
  const stack = [start]
  const context = { landType: start.landType, available, visited, stack }
  visited.add(keyOf(start.x, start.y))
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    result.push(current)
    for (const neighbor of neighbors(current)) visitNeighbor(context, neighbor)
  }
  return sortCells(result)
}

function visitNeighbor(context: FloodContext, point: RegionCellRef): void {
  const key = keyOf(point.x, point.y)
  const cell = context.available.get(key)
  if (!cell || context.visited.has(key) || cell.landType !== context.landType) return
  context.visited.add(key)
  context.stack.push(cell)
}

export function resolveScopeBounds(world: RegionalWorldReader, worldId: string, scope?: RegionScope): Aabb | null {
  const base = scope?.expansionId ? expansionBounds(world, worldId, scope.expansionId) : world.getWorldBounds(worldId)
  return scope?.bounds ? intersectBounds(base, scope.bounds) : base
}

function expansionBounds(world: RegionalWorldReader, worldId: string, expansionId: string): Aabb {
  const expansion = world.getExpansion(worldId, expansionId)
  if (!expansion) throw new Error(`Expansion not found: ${expansionId}`)
  return expansion.addedBounds
}

export function findRegionCandidates(args: {
  world: RegionalWorldReader
  worldId: string
  scope?: RegionScope
  occupied: Set<string>
}): RegionCandidate[] {
  const bounds = resolveScopeBounds(args.world, args.worldId, args.scope)
  if (!bounds) return []
  const cells = args.world.getWorldSpecific({ worldId: args.worldId, bounds })
  const available = new Map(cells.filter((cell) => !args.occupied.has(keyOf(cell.x, cell.y))).map((cell) => [keyOf(cell.x, cell.y), cell]))
  return candidatesFromCells(args.world, args.worldId, args.scope, available)
}

function candidatesFromCells(
  world: RegionalWorldReader,
  worldId: string,
  scope: RegionScope | undefined,
  available: CellMap
): RegionCandidate[] {
  const meta = world.getWorldMeta(worldId)
  const visited = new Set<string>()
  const candidates: RegionCandidate[] = []
  for (const cell of sortCells([...available.values()])) {
    if (visited.has(keyOf(cell.x, cell.y))) continue
    const regionCells = flood(cell, available, visited)
    const stats = buildStats(world, worldId, available, regionCells)
    candidates.push({ ...candidateBase(meta, scope, stats, regionCells), cells: regionCells.map(({ x, y }) => ({ x, y })) })
  }
  return candidates
}

function candidateBase(meta: WorldMeta, scope: RegionScope | undefined, stats: RegionStats, cells: Cell[]): Omit<RegionCandidate, 'cells'> {
  const idArgs = { meta, landType: stats.dominantLandType, cells }
  const base: Omit<RegionCandidate, 'cells'> = {
    regionId: scope?.expansionId === undefined ? regionId(idArgs) : regionId({ ...idArgs, sourceExpansionId: scope.expansionId }),
    worldId: meta.worldId,
    ...stats
  }
  if (scope?.expansionId !== undefined) base.sourceExpansionId = scope.expansionId
  return base
}

export function membershipKey(cell: RegionCellRef): string {
  return keyOf(cell.x, cell.y)
}
