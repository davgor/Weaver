import type { Aabb, DungeonCell, DungeonMeta, FloorRecord } from '../types.js'
import { assertAabb } from '../types.js'
import { generateDungeonLayout } from '../layout/generateLayout.js'
import { readChunkTile } from './chunks.js'
import {
  hasMeta,
  listDungeonIds,
  readMeta,
  removeDungeonDir,
  writeMeta
} from './metaStore.js'
import { persistFloor } from './persistFloor.js'

export type CreateDungeonOptions = {
  dungeonId?: string
  seed?: number
  floorCount?: number
  width?: number
  height?: number
  theme?: string
}

export type DungeonService = {
  createDungeon: (opts?: CreateDungeonOptions) => { meta: DungeonMeta }
  hasDungeon: (dungeonId: string) => boolean
  listDungeons: () => string[]
  deleteDungeon: (dungeonId: string) => void
  getDungeonMeta: (dungeonId: string) => DungeonMeta
  getDungeonBounds: (dungeonId: string) => Aabb
  listFloors: (dungeonId: string) => FloorRecord[]
  getCell: (args: {
    dungeonId: string
    floorIndex: number
    x: number
    y: number
  }) => DungeonCell | null
  getDungeonSpecific: (args: {
    dungeonId: string
    floorIndex: number
    bounds: Aabb
  }) => DungeonCell[]
  getFloor: (dungeonId: string, floorIndex: number) => Iterable<DungeonCell>
  getDungeonWhole: (dungeonId: string) => Iterable<DungeonCell>
}

function newId(): string {
  return `dungeon_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`
}

function createDungeonAt(dataRoot: string, opts: CreateDungeonOptions): { meta: DungeonMeta } {
  const dungeonId = opts.dungeonId ?? newId()
  if (hasMeta(dataRoot, dungeonId)) throw new Error(`Dungeon already exists: ${dungeonId}`)
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9)
  const width = opts.width ?? 32
  const height = opts.height ?? 32
  const floorCount = opts.floorCount ?? 1
  const theme = opts.theme ?? 'default'
  const layout = generateDungeonLayout({ seed, width, height, floorCount })
  const floors: FloorRecord[] = []
  const chunkManifest: string[] = []
  for (const floor of layout.floors) {
    const persisted = persistFloor({
      dataRoot,
      dungeonId,
      floorIndex: floor.floorIndex,
      grid: floor.grid
    })
    floors.push(persisted.record)
    chunkManifest.push(...persisted.chunks)
  }
  const meta: DungeonMeta = {
    dungeonId,
    seed,
    theme,
    floorCount,
    width,
    height,
    createdAt: new Date().toISOString()
  }
  writeMeta(dataRoot, dungeonId, { meta, floors, overlays: [], chunkManifest })
  return { meta }
}

function getCellAt(
  dataRoot: string,
  args: { dungeonId: string; floorIndex: number; x: number; y: number }
): DungeonCell | null {
  const { meta } = readMeta(dataRoot, args.dungeonId)
  if (args.floorIndex < 0 || args.floorIndex >= meta.floorCount) return null
  if (args.x < 0 || args.y < 0 || args.x >= meta.width || args.y >= meta.height) return null
  return {
    floorIndex: args.floorIndex,
    x: args.x,
    y: args.y,
    tileType: readChunkTile({ dataRoot, ...args })
  }
}

function* iterateFloor(dataRoot: string, dungeonId: string, floorIndex: number): Iterable<DungeonCell> {
  const { meta } = readMeta(dataRoot, dungeonId)
  for (let y = 0; y < meta.height; y++) {
    for (let x = 0; x < meta.width; x++) {
      const cell = getCellAt(dataRoot, { dungeonId, floorIndex, x, y })
      if (cell) yield cell
    }
  }
}

function getSpecific(
  dataRoot: string,
  args: { dungeonId: string; floorIndex: number; bounds: Aabb }
): DungeonCell[] {
  assertAabb(args.bounds)
  const cells: DungeonCell[] = []
  for (let y = args.bounds.minY; y <= args.bounds.maxY; y++) {
    for (let x = args.bounds.minX; x <= args.bounds.maxX; x++) {
      const cell = getCellAt(dataRoot, { dungeonId: args.dungeonId, floorIndex: args.floorIndex, x, y })
      if (cell) cells.push(cell)
    }
  }
  return cells
}

export function createDungeonService(dataRoot: string): DungeonService {
  return {
    createDungeon: (opts = {}) => createDungeonAt(dataRoot, opts),
    hasDungeon: (dungeonId) => hasMeta(dataRoot, dungeonId),
    listDungeons: () => listDungeonIds(dataRoot),
    deleteDungeon: (dungeonId) => {
      if (!hasMeta(dataRoot, dungeonId)) throw new Error(`Dungeon not found: ${dungeonId}`)
      removeDungeonDir(dataRoot, dungeonId)
    },
    getDungeonMeta: (dungeonId) => readMeta(dataRoot, dungeonId).meta,
    getDungeonBounds: (dungeonId) => {
      const { meta } = readMeta(dataRoot, dungeonId)
      return { minX: 0, minY: 0, maxX: meta.width - 1, maxY: meta.height - 1 }
    },
    listFloors: (dungeonId) => readMeta(dataRoot, dungeonId).floors,
    getCell: (args) => getCellAt(dataRoot, args),
    getDungeonSpecific: (args) => getSpecific(dataRoot, args),
    getFloor: (dungeonId, floorIndex) => iterateFloor(dataRoot, dungeonId, floorIndex),
    getDungeonWhole: function* (dungeonId) {
      const { meta } = readMeta(dataRoot, dungeonId)
      for (let f = 0; f < meta.floorCount; f++) yield* iterateFloor(dataRoot, dungeonId, f)
    }
  }
}
