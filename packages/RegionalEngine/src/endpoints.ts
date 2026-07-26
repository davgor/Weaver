import type { EngineEndpoint } from './typesApi.js'
import { createRegionalService } from './regionService.js'
import type { Aabb, RegionCandidate, RegionalService, RegionalWorldReader, RegionScope } from './types.js'

const PACKAGE_NAME = '@weaver/regional-engine'
const VERSION = '0.1.0'

type WorldEngineModule = {
  createWorldService: (dataRoot: string) => RegionalWorldReader
}

type EndpointPayload = Record<string, unknown>

function asRecord(payload: unknown): EndpointPayload {
  if (!payload || typeof payload !== 'object') throw new Error('payload object required')
  return payload as EndpointPayload
}

function requireString(payload: EndpointPayload, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} required`)
  return value
}

function optionalString(payload: EndpointPayload, key: string): string | undefined {
  const value = payload[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} must be a string`)
  return value
}

function requireNumber(payload: EndpointPayload, key: string): number {
  const value = payload[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} required`)
  return value
}

function parseBounds(value: unknown): Aabb {
  const body = asRecord(value)
  return {
    minX: requireNumber(body, 'minX'),
    minY: requireNumber(body, 'minY'),
    maxX: requireNumber(body, 'maxX'),
    maxY: requireNumber(body, 'maxY')
  }
}

function parseScope(payload: EndpointPayload): RegionScope | undefined {
  const source = payload.scope === undefined ? payload : asRecord(payload.scope)
  const scope: RegionScope = {}
  const expansionId = optionalString(source, 'expansionId')
  if (expansionId !== undefined) scope.expansionId = expansionId
  if (source.bounds !== undefined) scope.bounds = parseBounds(source.bounds)
  return scope.expansionId === undefined && scope.bounds === undefined ? undefined : scope
}

function requireCandidate(payload: EndpointPayload): RegionCandidate {
  const candidate = payload.candidate
  if (!candidate || typeof candidate !== 'object') throw new Error('candidate required')
  return candidate as RegionCandidate
}

async function defaultWorld(dataRoot: string): Promise<RegionalWorldReader> {
  const module = await import('@weaver/world-engine') as WorldEngineModule
  return module.createWorldService(dataRoot)
}

async function serviceFromPayload(payload: unknown): Promise<{ service: RegionalService; body: EndpointPayload }> {
  const body = asRecord(payload)
  const dataRoot = requireString(body, 'dataRoot')
  const worldDataRoot = optionalString(body, 'worldDataRoot') ?? dataRoot
  return { service: createRegionalService({ dataRoot, world: await defaultWorld(worldDataRoot) }), body }
}

function mutationEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'findNewRegion',
      description: 'Find unpersisted region candidates for a world and optional scope',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.findNewRegion(requireString(body, 'worldId'), parseScope(body))
      }
    },
    {
      name: 'createRegion',
      description: 'Persist one region candidate and its cell membership',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.createRegion(requireString(body, 'worldId'), requireCandidate(body))
      }
    },
    {
      name: 'fillRegions',
      description: 'Find and persist all currently unassigned regions in scope',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.fillRegions(requireString(body, 'worldId'), parseScope(body))
      }
    }
  ]
}

function regionQueryEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'getRegion',
      description: 'Return one region record',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.getRegion(requireString(body, 'worldId'), requireString(body, 'regionId'))
      }
    },
    {
      name: 'listRegions',
      description: 'List all regions for a world',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.listRegions(requireString(body, 'worldId'))
      }
    },
    {
      name: 'getRegionSummary',
      description: 'Return compact LLM-ready stats for one region',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.getRegionSummary(requireString(body, 'worldId'), requireString(body, 'regionId'))
      }
    }
  ]
}

function spatialQueryEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'getRegionAt',
      description: 'Return the region owning one world cell',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.getRegionAt(requireString(body, 'worldId'), requireNumber(body, 'x'), requireNumber(body, 'y'))
      }
    },
    {
      name: 'getRegionsInBounds',
      description: 'Return regions with membership inside an AABB',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.getRegionsInBounds(requireString(body, 'worldId'), parseBounds(body.bounds))
      }
    },
    {
      name: 'getRegionCells',
      description: 'Return cell membership for a region',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.getRegionCells(requireString(body, 'worldId'), requireString(body, 'regionId'))
      }
    }
  ]
}

function lifecycleEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'clearRegions',
      description: 'Delete all regions and memberships for a world',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        service.clearRegions(requireString(body, 'worldId'))
        return { ok: true as const }
      }
    },
    {
      name: 'deleteRegion',
      description: 'Delete one region and free its cells',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        service.deleteRegion(requireString(body, 'worldId'), requireString(body, 'regionId'))
        return { ok: true as const }
      }
    }
  ]
}

function readinessEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'hasRegions',
      description: 'Return whether any regions exist for a world',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.hasRegions(requireString(body, 'worldId'))
      }
    },
    {
      name: 'countRegions',
      description: 'Return persisted region count for a world',
      invoke: async (payload) => {
        const { service, body } = await serviceFromPayload(payload)
        return service.countRegions(requireString(body, 'worldId'))
      }
    }
  ]
}

export function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    ...mutationEndpoints(),
    ...regionQueryEndpoints(),
    ...spatialQueryEndpoints(),
    ...lifecycleEndpoints(),
    ...readinessEndpoints()
  ]
}
