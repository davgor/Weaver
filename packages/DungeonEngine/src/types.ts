/** Hybrid layout: packed tile chunks on disk + durable JSON metadata
 * (table-shaped stand-in for per-dungeonId SQLite: meta, floors, overlays, chunk manifest). */

export const CHUNK_SIZE = 16

export const TILE_TYPES = ['wall', 'floor', 'door', 'stairsUp', 'stairsDown'] as const
export type TileType = (typeof TILE_TYPES)[number]

export type Aabb = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type DungeonPoint = {
  floorIndex: number
  x: number
  y: number
}

export type DungeonCell = {
  floorIndex: number
  x: number
  y: number
  tileType: TileType
}

export type FloorRecord = {
  floorIndex: number
  bounds: Aabb
  cellCount: number
}

export type DungeonRoom = {
  roomId: string
  floorIndex: number
  bounds: Aabb
  center: { x: number; y: number }
}

export type DungeonConnectionKind = 'corridor' | 'stairs'

export type DungeonConnection = {
  connectionId: string
  kind: DungeonConnectionKind
  fromRoomId: string
  toRoomId: string
  fromFloorIndex: number
  toFloorIndex: number
  points: DungeonPoint[]
}

export type DungeonTopology = {
  rooms: DungeonRoom[]
  connections: DungeonConnection[]
}

export type DungeonMeta = {
  dungeonId: string
  seed: number
  theme: string
  floorCount: number
  width: number
  height: number
  createdAt: string
}

export type SparseOverlay = {
  floorIndex: number
  x: number
  y: number
  key: string
  value: string
}

export type EntranceFacing = 'north' | 'south' | 'east' | 'west'

export type OverworldEntrance = {
  worldId: string
  x: number
  y: number
  facing?: EntranceFacing
}

export function encodeTile(tile: TileType): number {
  const code = TILE_TYPES.indexOf(tile)
  if (code < 0) throw new Error(`Unknown tileType: ${tile}`)
  return code
}

export function decodeTile(code: number): TileType {
  const tile = TILE_TYPES[code]
  if (!tile) throw new Error(`Invalid tile code: ${code}`)
  return tile
}

export function assertAabb(bounds: Aabb): Aabb {
  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) {
    throw new Error('Invalid bounds: max must be >= min')
  }
  return bounds
}

export function assertFloorRecord(floor: FloorRecord): FloorRecord {
  if (!Number.isInteger(floor.floorIndex) || floor.floorIndex < 0) {
    throw new Error('Invalid floorIndex')
  }
  if (floor.cellCount < 0) throw new Error('Invalid cellCount')
  assertAabb(floor.bounds)
  return floor
}
