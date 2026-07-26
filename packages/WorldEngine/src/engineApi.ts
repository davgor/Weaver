import { buildEndpoints } from './endpoints.js'
import {
  createWorldService,
  type CreateWorldOptions,
  type ExpandWorldOptions,
  type GetOverlayInput,
  type SetOverlayInput
} from './store/worldService.js'
import type { Aabb, Cell, ExpansionRecord, SparseOverlay, WorldMeta } from './types.js'
import type { ListOverlaysFilter } from './store/metaStore.js'

export type WorldEngineApi = {
  id: 'WorldEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => ReturnType<typeof buildEndpoints>
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  createWorld: (dataRoot: string, opts?: CreateWorldOptions) => { meta: WorldMeta; expansion0: ExpansionRecord }
  expandWorld: (dataRoot: string, opts: ExpandWorldOptions) => ExpansionRecord
  hasWorld: (dataRoot: string, worldId: string) => boolean
  listWorlds: (dataRoot: string) => string[]
  deleteWorld: (dataRoot: string, worldId: string) => void
  getWorldMeta: (dataRoot: string, worldId: string) => WorldMeta
  getWorldBounds: (dataRoot: string, worldId: string) => Aabb
  getExpansion: (dataRoot: string, worldId: string, expansionId: string) => ExpansionRecord | null
  listExpansions: (dataRoot: string, worldId: string) => ExpansionRecord[]
  getLatestExpansion: (dataRoot: string, worldId: string) => ExpansionRecord | null
  getCell: (args: { dataRoot: string; worldId: string; x: number; y: number }) => Cell | null
  getWorldSpecific: (args: { dataRoot: string; worldId: string; bounds: Aabb }) => Cell[]
  getWorldWhole: (dataRoot: string, worldId: string) => Iterable<Cell>
  setSparseOverlay: (args: SetOverlayInput & { dataRoot: string }) => SparseOverlay
  getSparseOverlay: (args: GetOverlayInput & { dataRoot: string }) => SparseOverlay | null
  listSparseOverlays: (args: ListOverlaysFilter & { dataRoot: string }) => SparseOverlay[]
  clearSparseOverlays: (args: ListOverlaysFilter & { dataRoot: string }) => number
}

const PACKAGE_NAME = '@weaver/world-engine'
const VERSION = '0.1.0'

export const worldEngine: WorldEngineApi = {
  id: 'WorldEngine',
  title: 'World Engine',
  description: 'Deterministic Perlin world generation and chunked map storage',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((entry) => entry.name === endpoint)
    if (!match) throw new Error(`Unknown endpoint: ${endpoint}`)
    return await match.invoke(payload)
  },
  createWorld(dataRoot, opts) {
    return createWorldService(dataRoot).createWorld(opts)
  },
  expandWorld(dataRoot, opts) {
    return createWorldService(dataRoot).expandWorld(opts)
  },
  hasWorld(dataRoot, worldId) {
    return createWorldService(dataRoot).hasWorld(worldId)
  },
  listWorlds(dataRoot) {
    return createWorldService(dataRoot).listWorlds()
  },
  deleteWorld(dataRoot, worldId) {
    createWorldService(dataRoot).deleteWorld(worldId)
  },
  getWorldMeta(dataRoot, worldId) {
    return createWorldService(dataRoot).getWorldMeta(worldId)
  },
  getWorldBounds(dataRoot, worldId) {
    return createWorldService(dataRoot).getWorldBounds(worldId)
  },
  getExpansion(dataRoot, worldId, expansionId) {
    return createWorldService(dataRoot).getExpansion(worldId, expansionId)
  },
  listExpansions(dataRoot, worldId) {
    return createWorldService(dataRoot).listExpansions(worldId)
  },
  getLatestExpansion(dataRoot, worldId) {
    return createWorldService(dataRoot).getLatestExpansion(worldId)
  },
  getCell(args) {
    return createWorldService(args.dataRoot).getCell(args)
  },
  getWorldSpecific(args) {
    return createWorldService(args.dataRoot).getWorldSpecific(args)
  },
  getWorldWhole(dataRoot, worldId) {
    return createWorldService(dataRoot).getWorldWhole(worldId)
  },
  setSparseOverlay(args) {
    const { dataRoot, ...overlay } = args
    return createWorldService(dataRoot).setSparseOverlay(overlay)
  },
  getSparseOverlay(args) {
    const { dataRoot, ...query } = args
    return createWorldService(dataRoot).getSparseOverlay(query)
  },
  listSparseOverlays(args) {
    const { dataRoot, ...filter } = args
    return createWorldService(dataRoot).listSparseOverlays(filter)
  },
  clearSparseOverlays(args) {
    const { dataRoot, ...filter } = args
    return createWorldService(dataRoot).clearSparseOverlays(filter)
  }
}
