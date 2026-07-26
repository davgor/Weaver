/** Hybrid layout: packed binary terrain chunks on disk plus per-world SQLite
 * metadata for seed/noise params, bounds, expansion history, chunk manifest,
 * and sparse overlays. Callers use service/API methods; chunk files and SQL
 * tables are an engine-local storage detail.
 */

export const CHUNK_SIZE = 32

export const LAND_TYPES = [
  'ocean',
  'beach',
  'grassland',
  'forest',
  'jungle',
  'desert',
  'mountain',
  'tundra',
  'swamp'
] as const

export type LandType = (typeof LAND_TYPES)[number]

export type Aabb = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type Cell = {
  x: number
  y: number
  elevation: number
  landType: LandType
}

export type NoiseParams = {
  frequency: number
  octaves: number
  persistence: number
  lacunarity: number
}

export type ChunkRecord = {
  chunkId: string
  worldId: string
  cx: number
  cy: number
  bounds: Aabb
  fileName: string
  updatedAt: string
}

export type WorldMeta = {
  worldId: string
  seed: number
  bounds: Aabb
  noise: NoiseParams
  createdAt: string
  updatedAt: string
  cellCount: number
}

export type ExpansionRecord = {
  expansionId: string
  worldId: string
  sequence: number
  addedBounds: Aabb
  previousBounds: Aabb | null
  resultingBounds: Aabb
  createdAt: string
  cellCount?: number
}

export type SparseOverlay = {
  worldId: string
  x: number
  y: number
  key: string
  value: string
}

export function encodeLandType(landType: LandType): number {
  const code = LAND_TYPES.indexOf(landType)
  if (code < 0) throw new Error(`Unknown landType: ${landType}`)
  return code
}

export function decodeLandType(code: number): LandType {
  const landType = LAND_TYPES[code]
  if (!landType) throw new Error(`Invalid landType code: ${code}`)
  return landType
}

function assertInteger(value: number, field: string): void {
  if (!Number.isInteger(value)) throw new Error(`Invalid ${field}: integer required`)
}

export function assertAabb(bounds: Aabb): Aabb {
  assertInteger(bounds.minX, 'minX')
  assertInteger(bounds.minY, 'minY')
  assertInteger(bounds.maxX, 'maxX')
  assertInteger(bounds.maxY, 'maxY')
  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) {
    throw new Error('Invalid bounds: max must be >= min')
  }
  return bounds
}

export function aabbWidth(bounds: Aabb): number {
  assertAabb(bounds)
  return bounds.maxX - bounds.minX + 1
}

export function aabbHeight(bounds: Aabb): number {
  assertAabb(bounds)
  return bounds.maxY - bounds.minY + 1
}

export function aabbCellCount(bounds: Aabb): number {
  return aabbWidth(bounds) * aabbHeight(bounds)
}

export function aabbContainsPoint(bounds: Aabb, x: number, y: number): boolean {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY
}

export function aabbIntersects(a: Aabb, b: Aabb): boolean {
  assertAabb(a)
  assertAabb(b)
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
}

export function unionAabb(a: Aabb, b: Aabb): Aabb {
  assertAabb(a)
  assertAabb(b)
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY)
  }
}

export function assertExpansionRecord(record: ExpansionRecord): ExpansionRecord {
  if (!record.expansionId) throw new Error('Invalid expansionId')
  if (!record.worldId) throw new Error('Invalid worldId')
  if (!Number.isInteger(record.sequence) || record.sequence < 0) throw new Error('Invalid sequence')
  assertAabb(record.addedBounds)
  if (record.previousBounds) assertAabb(record.previousBounds)
  assertAabb(record.resultingBounds)
  if (record.cellCount !== undefined && record.cellCount < 0) throw new Error('Invalid cellCount')
  return record
}
