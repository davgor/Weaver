import { createDungeonService, type CreateDungeonOptions } from './store/dungeonService.js'
import { createWorldEngineLookup } from './worldLookup.js'
import type {
  Aabb,
  DungeonCell,
  DungeonConnection,
  DungeonMeta,
  DungeonRoom,
  DungeonTopology,
  FloorRecord,
  OverworldEntrance,
  SparseOverlay
} from './types.js'
import { buildEndpoints } from './endpoints.js'

export type DungeonEngineApi = {
  id: 'DungeonEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => ReturnType<typeof buildEndpoints>
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  createDungeon: (dataRoot: string, opts?: CreateDungeonOptions) => { meta: DungeonMeta }
  hasDungeon: (dataRoot: string, dungeonId: string) => boolean
  listDungeons: (dataRoot: string) => string[]
  deleteDungeon: (dataRoot: string, dungeonId: string) => void
  getDungeonMeta: (dataRoot: string, dungeonId: string) => DungeonMeta
  getDungeonBounds: (dataRoot: string, dungeonId: string) => Aabb
  listFloors: (dataRoot: string, dungeonId: string) => FloorRecord[]
  getCell: (args: {
    dataRoot: string
    dungeonId: string
    floorIndex: number
    x: number
    y: number
  }) => DungeonCell | null
  getDungeonSpecific: (args: {
    dataRoot: string
    dungeonId: string
    floorIndex: number
    bounds: Aabb
  }) => DungeonCell[]
  getFloor: (dataRoot: string, dungeonId: string, floorIndex: number) => DungeonCell[]
  getDungeonWhole: (dataRoot: string, dungeonId: string) => DungeonCell[]
  listRooms: (dataRoot: string, dungeonId: string, floorIndex?: number) => DungeonRoom[]
  getRoom: (dataRoot: string, dungeonId: string, roomId: string) => DungeonRoom | null
  listConnections: (dataRoot: string, dungeonId: string, floorIndex?: number) => DungeonConnection[]
  getTopology: (dataRoot: string, dungeonId: string, floorIndex?: number) => DungeonTopology
  resetDungeonInstance: (dataRoot: string, dungeonId: string) => { meta: DungeonMeta; overlays: SparseOverlay[] }
  restockDungeonInstance: (dataRoot: string, dungeonId: string) => { meta: DungeonMeta; overlays: SparseOverlay[] }
  setOverworldEntrance: (args: {
    dataRoot: string
    dungeonId: string
    worldDataRoot: string
    entrance: OverworldEntrance
  }) => OverworldEntrance
  getOverworldEntrance: (dataRoot: string, dungeonId: string) => OverworldEntrance | null
  clearOverworldEntrance: (dataRoot: string, dungeonId: string) => void
}

const PACKAGE_NAME = '@weaver/dungeon-engine'
const VERSION = '0.1.0'

export const dungeonEngine: DungeonEngineApi = {
  id: 'DungeonEngine',
  title: 'Dungeon Engine',
  description: 'Deterministic instanced dungeon generation and map storage',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((e) => e.name === endpoint)
    if (!match) throw new Error(`Unknown endpoint: ${endpoint}`)
    return await match.invoke(payload)
  },
  createDungeon(dataRoot, opts) {
    return createDungeonService(dataRoot).createDungeon(opts)
  },
  hasDungeon(dataRoot, dungeonId) {
    return createDungeonService(dataRoot).hasDungeon(dungeonId)
  },
  listDungeons(dataRoot) {
    return createDungeonService(dataRoot).listDungeons()
  },
  deleteDungeon(dataRoot, dungeonId) {
    createDungeonService(dataRoot).deleteDungeon(dungeonId)
  },
  getDungeonMeta(dataRoot, dungeonId) {
    return createDungeonService(dataRoot).getDungeonMeta(dungeonId)
  },
  getDungeonBounds(dataRoot, dungeonId) {
    return createDungeonService(dataRoot).getDungeonBounds(dungeonId)
  },
  listFloors(dataRoot, dungeonId) {
    return createDungeonService(dataRoot).listFloors(dungeonId)
  },
  getCell(args) {
    return createDungeonService(args.dataRoot).getCell(args)
  },
  getDungeonSpecific(args) {
    return createDungeonService(args.dataRoot).getDungeonSpecific(args)
  },
  getFloor(dataRoot, dungeonId, floorIndex) {
    return [...createDungeonService(dataRoot).getFloor(dungeonId, floorIndex)]
  },
  getDungeonWhole(dataRoot, dungeonId) {
    return [...createDungeonService(dataRoot).getDungeonWhole(dungeonId)]
  },
  listRooms(dataRoot, dungeonId, floorIndex) {
    return createDungeonService(dataRoot).listRooms(dungeonId, floorIndex)
  },
  getRoom(dataRoot, dungeonId, roomId) {
    return createDungeonService(dataRoot).getRoom(dungeonId, roomId)
  },
  listConnections(dataRoot, dungeonId, floorIndex) {
    return createDungeonService(dataRoot).listConnections(dungeonId, floorIndex)
  },
  getTopology(dataRoot, dungeonId, floorIndex) {
    return createDungeonService(dataRoot).getTopology(dungeonId, floorIndex)
  },
  resetDungeonInstance(dataRoot, dungeonId) {
    return createDungeonService(dataRoot).resetDungeonInstance(dungeonId)
  },
  restockDungeonInstance(dataRoot, dungeonId) {
    return createDungeonService(dataRoot).restockDungeonInstance(dungeonId)
  },
  setOverworldEntrance(args) {
    return createDungeonService(args.dataRoot, {
      worldLookup: createWorldEngineLookup(args.worldDataRoot)
    }).setOverworldEntrance(args.dungeonId, args.entrance)
  },
  getOverworldEntrance(dataRoot, dungeonId) {
    return createDungeonService(dataRoot).getOverworldEntrance(dungeonId)
  },
  clearOverworldEntrance(dataRoot, dungeonId) {
    createDungeonService(dataRoot).clearOverworldEntrance(dungeonId)
  }
}
