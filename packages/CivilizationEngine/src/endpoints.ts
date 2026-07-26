import { createRegionalService } from '@weaver/regional-engine'
import { createWorldService } from '@weaver/world-engine'
import { createCivilizationService, type CivilizationService } from './civilizationService.js'
import type { EngineEndpoint } from './typesApi.js'
import type {
  CivilizationCandidate,
  FillCivilizationsScope,
  PopulationChange,
  ProposeCivilizationsOpts,
  SettlementKind
} from './types.js'
import { PACKAGE_NAME, VERSION } from './typesApi.js'

type Payload = Record<string, unknown>

function asRecord(payload: unknown): Payload {
  if (!payload || typeof payload !== 'object') throw new Error('payload object required')
  return payload as Payload
}

function requireString(payload: Payload, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} required`)
  return value
}

function optionalString(payload: Payload, key: string): string | undefined {
  const value = payload[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} must be a string`)
  return value
}

function requireNumber(payload: Payload, key: string): number {
  const value = payload[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} required`)
  return value
}

async function serviceFromPayload(
  payload: unknown
): Promise<{ service: CivilizationService; body: Payload }> {
  const body = asRecord(payload)
  const dataRoot = requireString(body, 'dataRoot')
  const worldDataRoot = optionalString(body, 'worldDataRoot') ?? dataRoot
  const regionDataRoot = optionalString(body, 'regionDataRoot') ?? dataRoot
  const world = createWorldService(worldDataRoot)
  const regional = createRegionalService({ dataRoot: regionDataRoot, world })
  return { service: createCivilizationService({ dataRoot, regional, world }), body }
}

function parseProposeOpts(body: Payload): ProposeCivilizationsOpts | undefined {
  const opts: ProposeCivilizationsOpts = {}
  if (Array.isArray(body.kinds)) opts.kinds = body.kinds as SettlementKind[]
  if (typeof body.maxCount === 'number') opts.maxCount = body.maxCount
  if (typeof body.rngSalt === 'number') opts.rngSalt = body.rngSalt
  return Object.keys(opts).length === 0 ? undefined : opts
}

function parseScope(body: Payload): FillCivilizationsScope | undefined {
  const scope: FillCivilizationsScope = {}
  const regionId = optionalString(body, 'regionId')
  const expansionId = optionalString(body, 'expansionId')
  if (regionId) scope.regionId = regionId
  if (expansionId) scope.expansionId = expansionId
  if (Array.isArray(body.regionIds)) scope.regionIds = body.regionIds as string[]
  return Object.keys(scope).length === 0 ? undefined : scope
}

function parseChange(body: Payload): PopulationChange {
  if (typeof body.absolute === 'number') return { absolute: body.absolute }
  if (typeof body.delta === 'number') return { delta: body.delta }
  throw new Error('delta or absolute required')
}

function requireCandidate(body: Payload): CivilizationCandidate {
  const candidate = body.candidate
  if (!candidate || typeof candidate !== 'object') throw new Error('candidate required')
  return candidate as CivilizationCandidate
}

function endpoint(
  name: string,
  description: string,
  invoke: (payload?: unknown) => Promise<unknown> | unknown
): EngineEndpoint {
  return { name, description, invoke }
}

function healthEndpoint(): EngineEndpoint {
  return endpoint('health', 'Return package health metadata', () => ({
    ok: true as const,
    package: PACKAGE_NAME,
    version: VERSION
  }))
}

function placementEndpoints(): EngineEndpoint[] {
  return [
    endpoint('proposeCivilizations', 'Propose settlement candidates without persisting', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.proposeCivilizations(
        requireString(body, 'worldId'),
        requireString(body, 'regionId'),
        parseProposeOpts(body)
      )
    }),
    endpoint('createCivilization', 'Persist one civilization candidate', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.createCivilization(requireString(body, 'worldId'), requireCandidate(body))
    }),
    endpoint('fillCivilizations', 'Propose and create civilizations in scope', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.fillCivilizations(requireString(body, 'worldId'), parseScope(body))
    })
  ]
}

function populationEndpoints(): EngineEndpoint[] {
  return [
    endpoint('adjustPopulation', 'Mutate settlement population', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.adjustPopulation(
        requireString(body, 'worldId'),
        requireString(body, 'civilizationId'),
        parseChange(body)
      )
    }),
    endpoint('reconcilePopulation', 'Recompute population aggregates', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.reconcilePopulation(requireString(body, 'worldId'), optionalString(body, 'regionId'))
    }),
    endpoint('getPopulation', 'World population aggregate', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.getPopulation(requireString(body, 'worldId'))
    }),
    endpoint('getRegionPopulation', 'Region population aggregate', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.getRegionPopulation(
        requireString(body, 'worldId'),
        requireString(body, 'regionId')
      )
    }),
    endpoint('getCivilizationPopulation', 'Single settlement population', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.getCivilizationPopulation(
        requireString(body, 'worldId'),
        requireString(body, 'civilizationId')
      )
    })
  ]
}

function placeholderEndpoints(): EngineEndpoint[] {
  return [
    endpoint('ensureNpcPlaceholders', 'Re-sync NPC placeholder slots', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.ensureNpcPlaceholders(
        requireString(body, 'worldId'),
        requireString(body, 'civilizationId')
      )
    }),
    endpoint('listNpcPlaceholders', 'List NPC placeholder slots', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.listNpcPlaceholders(
        requireString(body, 'worldId'),
        requireString(body, 'civilizationId')
      )
    }),
    endpoint('listUnassignedNpcPlaceholders', 'List unassigned NPC slots', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      const filter: {
        regionId?: string
        civilizationId?: string
        roleHint?: string
      } = {}
      const regionId = optionalString(body, 'regionId')
      const civilizationId = optionalString(body, 'civilizationId')
      const roleHint = optionalString(body, 'roleHint')
      if (regionId !== undefined) filter.regionId = regionId
      if (civilizationId !== undefined) filter.civilizationId = civilizationId
      if (roleHint !== undefined) filter.roleHint = roleHint
      return service.listUnassignedNpcPlaceholders(requireString(body, 'worldId'), filter as never)
    }),
    endpoint('claimNpcPlaceholder', 'Assign an NPC id to a slot', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.claimNpcPlaceholder(
        requireString(body, 'worldId'),
        requireString(body, 'slotId'),
        requireString(body, 'npcId')
      )
    }),
    endpoint('releaseNpcPlaceholder', 'Clear assignment from a slot', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.releaseNpcPlaceholder(
        requireString(body, 'worldId'),
        requireString(body, 'slotId')
      )
    })
  ]
}

function queryEndpoints(): EngineEndpoint[] {
  return [
    endpoint('getCivilization', 'Full civilization record', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.getCivilization(
        requireString(body, 'worldId'),
        requireString(body, 'civilizationId')
      )
    }),
    endpoint('listCivilizations', 'List civilizations in a world', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.listCivilizations(requireString(body, 'worldId'))
    }),
    endpoint('listCivilizationsInRegion', 'List civilizations in a region', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.listCivilizationsInRegion(
        requireString(body, 'worldId'),
        requireString(body, 'regionId')
      )
    }),
    endpoint('getCivilizationAt', 'Civilization owning a cell', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.getCivilizationAt(
        requireString(body, 'worldId'),
        requireNumber(body, 'x'),
        requireNumber(body, 'y')
      )
    }),
    endpoint('getCivilizationsInBounds', 'Civilizations in an origin/size window', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.getCivilizationsInBounds(requireString(body, 'worldId'), {
        x: requireNumber(body, 'x'),
        y: requireNumber(body, 'y'),
        length: requireNumber(body, 'length'),
        width: requireNumber(body, 'width')
      })
    })
  ]
}

function summaryEndpoints(): EngineEndpoint[] {
  return [
    endpoint('getCivilizationSummary', 'Compact civilization summary', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.getCivilizationSummary(
        requireString(body, 'worldId'),
        requireString(body, 'civilizationId')
      )
    }),
    endpoint('getRegionCivilizationSummary', 'Region civilization summary', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.getRegionCivilizationSummary(
        requireString(body, 'worldId'),
        requireString(body, 'regionId')
      )
    }),
    endpoint('hasCivilizations', 'Whether a world has civilizations', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.hasCivilizations(requireString(body, 'worldId'))
    }),
    endpoint('countCivilizations', 'Count civilizations in a world', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      return service.countCivilizations(requireString(body, 'worldId'))
    }),
    endpoint('deleteCivilization', 'Delete one civilization', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      service.deleteCivilization(
        requireString(body, 'worldId'),
        requireString(body, 'civilizationId')
      )
      return { ok: true }
    }),
    endpoint('clearCivilizations', 'Clear civilizations for world or region', async (payload) => {
      const { service, body } = await serviceFromPayload(payload)
      service.clearCivilizations(requireString(body, 'worldId'), optionalString(body, 'regionId'))
      return { ok: true }
    })
  ]
}

export function buildEndpoints(): EngineEndpoint[] {
  return [
    healthEndpoint(),
    ...placementEndpoints(),
    ...populationEndpoints(),
    ...placeholderEndpoints(),
    ...queryEndpoints(),
    ...summaryEndpoints()
  ]
}
