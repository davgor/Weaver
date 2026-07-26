import { buildEndpoints } from './endpoints.js'
import { createRegionalService } from './regionService.js'
import type { EngineEndpoint } from './typesApi.js'
import type {
  Aabb,
  RegionMutation,
  RegionCandidate,
  RegionRecord,
  RegionalService,
  RegionalServiceOptions,
  RegionScope,
  RegionSummary
} from './types.js'

export type RegionalEngineApi = {
  id: 'RegionalEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  createService: (options: RegionalServiceOptions) => RegionalService
  findNewRegion: (options: RegionalServiceOptions, worldId: string, scope?: RegionScope) => RegionCandidate[]
  createRegion: (options: RegionalServiceOptions, worldId: string, candidate: RegionCandidate) => RegionRecord
  fillRegions: (options: RegionalServiceOptions, worldId: string, scope?: RegionScope) => RegionRecord[]
  getRegion: (options: RegionalServiceOptions, worldId: string, regionId: string) => RegionRecord | null
  listRegions: (options: RegionalServiceOptions, worldId: string) => RegionRecord[]
  getRegionAt: (options: RegionalServiceOptions, worldId: string, x: number, y: number) => RegionRecord | null
  getRegionsInBounds: (options: RegionalServiceOptions, worldId: string, bounds: Aabb) => RegionRecord[]
  getRegionCells: (options: RegionalServiceOptions, worldId: string, regionId: string) => { x: number; y: number }[]
  getRegionSummary: (options: RegionalServiceOptions, worldId: string, regionId: string) => RegionSummary | null
  applyRegionMutation: (
    options: RegionalServiceOptions,
    worldId: string,
    regionId: string,
    mutation: RegionMutation
  ) => RegionRecord
  clearRegions: (options: RegionalServiceOptions, worldId: string) => void
  deleteRegion: (options: RegionalServiceOptions, worldId: string, regionId: string) => void
  hasRegions: (options: RegionalServiceOptions, worldId: string) => boolean
  countRegions: (options: RegionalServiceOptions, worldId: string) => number
}

const PACKAGE_NAME = '@weaver/regional-engine'
const VERSION = '0.1.0'

function service(options: RegionalServiceOptions): RegionalService {
  return createRegionalService(options)
}

export const regionalEngine: RegionalEngineApi = {
  id: 'RegionalEngine',
  title: 'Regional Engine',
  description: 'Deterministic map segmentation and region stats for WorldEngine worlds',
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
  createService(options) {
    return service(options)
  },
  findNewRegion(options, worldId, scope) {
    return service(options).findNewRegion(worldId, scope)
  },
  createRegion(options, worldId, candidate) {
    return service(options).createRegion(worldId, candidate)
  },
  fillRegions(options, worldId, scope) {
    return service(options).fillRegions(worldId, scope)
  },
  getRegion(options, worldId, regionId) {
    return service(options).getRegion(worldId, regionId)
  },
  listRegions(options, worldId) {
    return service(options).listRegions(worldId)
  },
  getRegionAt(options, worldId, x, y) {
    return service(options).getRegionAt(worldId, x, y)
  },
  getRegionsInBounds(options, worldId, bounds) {
    return service(options).getRegionsInBounds(worldId, bounds)
  },
  getRegionCells(options, worldId, regionId) {
    return service(options).getRegionCells(worldId, regionId)
  },
  getRegionSummary(options, worldId, regionId) {
    return service(options).getRegionSummary(worldId, regionId)
  },
  applyRegionMutation(options, worldId, regionId, mutation) {
    return service(options).applyRegionMutation(worldId, regionId, mutation)
  },
  clearRegions(options, worldId) {
    service(options).clearRegions(worldId)
  },
  deleteRegion(options, worldId, regionId) {
    service(options).deleteRegion(worldId, regionId)
  },
  hasRegions(options, worldId) {
    return service(options).hasRegions(worldId)
  },
  countRegions(options, worldId) {
    return service(options).countRegions(worldId)
  }
}
