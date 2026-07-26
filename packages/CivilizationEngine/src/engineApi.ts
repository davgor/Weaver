import { buildEndpoints } from './endpoints.js'
import { createCivilizationService } from './civilizationService.js'
import type { CivilizationService } from './civilizationService.js'
import type { EngineEndpoint } from './typesApi.js'
import type {
  CivilizationCandidate,
  CivilizationServiceOptions,
  FillCivilizationsScope,
  PopulationChange,
  ProposeCivilizationsOpts,
  SettlementMutation
} from './types.js'
import { PACKAGE_NAME, VERSION } from './typesApi.js'

export type CivilizationEngineApi = {
  id: 'CivilizationEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  createService: (options: CivilizationServiceOptions) => CivilizationService
  proposeCivilizations: (
    options: CivilizationServiceOptions,
    worldId: string,
    regionId: string,
    opts?: ProposeCivilizationsOpts
  ) => ReturnType<CivilizationService['proposeCivilizations']>
  createCivilization: (
    options: CivilizationServiceOptions,
    worldId: string,
    candidate: CivilizationCandidate
  ) => ReturnType<CivilizationService['createCivilization']>
  fillCivilizations: (
    options: CivilizationServiceOptions,
    worldId: string,
    scope?: FillCivilizationsScope
  ) => ReturnType<CivilizationService['fillCivilizations']>
  getPopulation: (
    options: CivilizationServiceOptions,
    worldId: string
  ) => ReturnType<CivilizationService['getPopulation']>
  getRegionPopulation: (
    options: CivilizationServiceOptions,
    worldId: string,
    regionId: string
  ) => ReturnType<CivilizationService['getRegionPopulation']>
  getCivilizationPopulation: (
    options: CivilizationServiceOptions,
    worldId: string,
    civilizationId: string
  ) => ReturnType<CivilizationService['getCivilizationPopulation']>
  adjustPopulation: (
    options: CivilizationServiceOptions,
    worldId: string,
    civilizationId: string,
    change: PopulationChange
  ) => ReturnType<CivilizationService['adjustPopulation']>
  applySettlementMutation: (
    options: CivilizationServiceOptions,
    worldId: string,
    civilizationId: string,
    mutation: SettlementMutation
  ) => ReturnType<CivilizationService['applySettlementMutation']>
  reconcilePopulation: (
    options: CivilizationServiceOptions,
    worldId: string,
    regionId?: string
  ) => ReturnType<CivilizationService['reconcilePopulation']>
  listNpcPlaceholders: (
    options: CivilizationServiceOptions,
    worldId: string,
    civilizationId: string
  ) => ReturnType<CivilizationService['listNpcPlaceholders']>
  listUnassignedNpcPlaceholders: (
    options: CivilizationServiceOptions,
    worldId: string,
    filter?: Parameters<CivilizationService['listUnassignedNpcPlaceholders']>[1]
  ) => ReturnType<CivilizationService['listUnassignedNpcPlaceholders']>
  claimNpcPlaceholder: (
    options: CivilizationServiceOptions,
    worldId: string,
    slotId: string,
    npcId: string
  ) => ReturnType<CivilizationService['claimNpcPlaceholder']>
  releaseNpcPlaceholder: (
    options: CivilizationServiceOptions,
    worldId: string,
    slotId: string
  ) => ReturnType<CivilizationService['releaseNpcPlaceholder']>
  ensureNpcPlaceholders: (
    options: CivilizationServiceOptions,
    worldId: string,
    civilizationId: string
  ) => ReturnType<CivilizationService['ensureNpcPlaceholders']>
  getCivilization: (
    options: CivilizationServiceOptions,
    worldId: string,
    civilizationId: string
  ) => ReturnType<CivilizationService['getCivilization']>
  listCivilizations: (
    options: CivilizationServiceOptions,
    worldId: string
  ) => ReturnType<CivilizationService['listCivilizations']>
  listCivilizationsInRegion: (
    options: CivilizationServiceOptions,
    worldId: string,
    regionId: string
  ) => ReturnType<CivilizationService['listCivilizationsInRegion']>
  getCivilizationAt: (
    options: CivilizationServiceOptions,
    worldId: string,
    x: number,
    y: number
  ) => ReturnType<CivilizationService['getCivilizationAt']>
  getCivilizationsInBounds: (
    options: CivilizationServiceOptions,
    worldId: string,
    query: { x: number; y: number; length: number; width: number }
  ) => ReturnType<CivilizationService['getCivilizationsInBounds']>
  getCivilizationSummary: (
    options: CivilizationServiceOptions,
    worldId: string,
    civilizationId: string
  ) => ReturnType<CivilizationService['getCivilizationSummary']>
  getRegionCivilizationSummary: (
    options: CivilizationServiceOptions,
    worldId: string,
    regionId: string
  ) => ReturnType<CivilizationService['getRegionCivilizationSummary']>
  hasCivilizations: (
    options: CivilizationServiceOptions,
    worldId: string
  ) => ReturnType<CivilizationService['hasCivilizations']>
  countCivilizations: (
    options: CivilizationServiceOptions,
    worldId: string
  ) => ReturnType<CivilizationService['countCivilizations']>
  deleteCivilization: (
    options: CivilizationServiceOptions,
    worldId: string,
    civilizationId: string
  ) => void
  clearCivilizations: (
    options: CivilizationServiceOptions,
    worldId: string,
    regionId?: string
  ) => void
}

function service(options: CivilizationServiceOptions): CivilizationService {
  return createCivilizationService(options)
}

export const civilizationEngine: CivilizationEngineApi = {
  id: 'CivilizationEngine',
  title: 'Civilization Engine',
  description:
    'Deterministic settlement placement, population tracking, and NPC placeholders for regions',
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
  proposeCivilizations(options, worldId, regionId, opts) {
    return service(options).proposeCivilizations(worldId, regionId, opts)
  },
  createCivilization(options, worldId, candidate) {
    return service(options).createCivilization(worldId, candidate)
  },
  fillCivilizations(options, worldId, scope) {
    return service(options).fillCivilizations(worldId, scope)
  },
  getPopulation(options, worldId) {
    return service(options).getPopulation(worldId)
  },
  getRegionPopulation(options, worldId, regionId) {
    return service(options).getRegionPopulation(worldId, regionId)
  },
  getCivilizationPopulation(options, worldId, civilizationId) {
    return service(options).getCivilizationPopulation(worldId, civilizationId)
  },
  adjustPopulation(options, worldId, civilizationId, change) {
    return service(options).adjustPopulation(worldId, civilizationId, change)
  },
  applySettlementMutation(options, worldId, civilizationId, mutation) {
    return service(options).applySettlementMutation(worldId, civilizationId, mutation)
  },
  reconcilePopulation(options, worldId, regionId) {
    return service(options).reconcilePopulation(worldId, regionId)
  },
  listNpcPlaceholders(options, worldId, civilizationId) {
    return service(options).listNpcPlaceholders(worldId, civilizationId)
  },
  listUnassignedNpcPlaceholders(options, worldId, filter) {
    return service(options).listUnassignedNpcPlaceholders(worldId, filter)
  },
  claimNpcPlaceholder(options, worldId, slotId, npcId) {
    return service(options).claimNpcPlaceholder(worldId, slotId, npcId)
  },
  releaseNpcPlaceholder(options, worldId, slotId) {
    return service(options).releaseNpcPlaceholder(worldId, slotId)
  },
  ensureNpcPlaceholders(options, worldId, civilizationId) {
    return service(options).ensureNpcPlaceholders(worldId, civilizationId)
  },
  getCivilization(options, worldId, civilizationId) {
    return service(options).getCivilization(worldId, civilizationId)
  },
  listCivilizations(options, worldId) {
    return service(options).listCivilizations(worldId)
  },
  listCivilizationsInRegion(options, worldId, regionId) {
    return service(options).listCivilizationsInRegion(worldId, regionId)
  },
  getCivilizationAt(options, worldId, x, y) {
    return service(options).getCivilizationAt(worldId, x, y)
  },
  getCivilizationsInBounds(options, worldId, query) {
    return service(options).getCivilizationsInBounds(worldId, query)
  },
  getCivilizationSummary(options, worldId, civilizationId) {
    return service(options).getCivilizationSummary(worldId, civilizationId)
  },
  getRegionCivilizationSummary(options, worldId, regionId) {
    return service(options).getRegionCivilizationSummary(worldId, regionId)
  },
  hasCivilizations(options, worldId) {
    return service(options).hasCivilizations(worldId)
  },
  countCivilizations(options, worldId) {
    return service(options).countCivilizations(worldId)
  },
  deleteCivilization(options, worldId, civilizationId) {
    service(options).deleteCivilization(worldId, civilizationId)
  },
  clearCivilizations(options, worldId, regionId) {
    service(options).clearCivilizations(worldId, regionId)
  }
}
