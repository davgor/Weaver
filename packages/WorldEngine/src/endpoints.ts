import type { EngineEndpoint } from './typesApi.js'
import type { Aabb, NoiseParams } from './types.js'
import { createWorldService, type CreateWorldOptions } from './store/worldService.js'

const PACKAGE_NAME = '@weaver/world-engine'
const VERSION = '0.1.0'

function asRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') throw new Error('payload object required')
  return payload as Record<string, unknown>
}

function requireString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string' || !value) throw new Error(`${key} required`)
  return value
}

function requireDataRoot(payload: unknown): string {
  return requireString(asRecord(payload), 'dataRoot')
}

function optionalNumber(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} must be a number`)
  return value
}

function requireNumber(payload: Record<string, unknown>, key: string): number {
  const value = optionalNumber(payload, key)
  if (value === undefined) throw new Error(`${key} required`)
  return value
}

function parseBoundsValue(value: unknown): Aabb {
  if (!value || typeof value !== 'object') throw new Error('bounds required')
  const bounds = value as Record<string, unknown>
  return {
    minX: requireNumber(bounds, 'minX'),
    minY: requireNumber(bounds, 'minY'),
    maxX: requireNumber(bounds, 'maxX'),
    maxY: requireNumber(bounds, 'maxY')
  }
}

function parseNoise(payload: Record<string, unknown>): Partial<NoiseParams> | undefined {
  const value = payload.noise
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object') throw new Error('noise must be an object')
  const noise = value as Record<string, unknown>
  const parsed: Partial<NoiseParams> = {}
  const frequency = optionalNumber(noise, 'frequency')
  if (frequency !== undefined) parsed.frequency = frequency
  const octaves = optionalNumber(noise, 'octaves')
  if (octaves !== undefined) parsed.octaves = octaves
  const persistence = optionalNumber(noise, 'persistence')
  if (persistence !== undefined) parsed.persistence = persistence
  const lacunarity = optionalNumber(noise, 'lacunarity')
  if (lacunarity !== undefined) parsed.lacunarity = lacunarity
  return parsed
}

function parseCreateOpts(payload: Record<string, unknown>): CreateWorldOptions {
  const opts: CreateWorldOptions = {}
  if (typeof payload.worldId === 'string') opts.worldId = payload.worldId
  const seed = optionalNumber(payload, 'seed')
  if (seed !== undefined) opts.seed = seed
  const width = optionalNumber(payload, 'width')
  if (width !== undefined) opts.width = width
  const height = optionalNumber(payload, 'height')
  if (height !== undefined) opts.height = height
  const originX = optionalNumber(payload, 'originX')
  if (originX !== undefined) opts.originX = originX
  const originY = optionalNumber(payload, 'originY')
  if (originY !== undefined) opts.originY = originY
  if (payload.bounds !== undefined) opts.bounds = parseBoundsValue(payload.bounds)
  const noise = parseNoise(payload)
  if (noise !== undefined) opts.noise = noise
  return opts
}

function lifecycleEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'createWorld',
      description: 'Create a seeded world under dataRoot',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).createWorld(parseCreateOpts(body))
      }
    },
    {
      name: 'expandWorld',
      description: 'Grow world bounds and record expansion metadata',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).expandWorld({
          worldId: requireString(body, 'worldId'),
          bounds: parseBoundsValue(body.bounds)
        })
      }
    },
    {
      name: 'deleteWorld',
      description: 'Delete a world store under dataRoot',
      invoke: (payload) => {
        const body = asRecord(payload)
        createWorldService(requireDataRoot(body)).deleteWorld(requireString(body, 'worldId'))
        return { ok: true as const }
      }
    }
  ]
}

function discoveryEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'hasWorld',
      description: 'Check whether a worldId exists under dataRoot',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).hasWorld(requireString(body, 'worldId'))
      }
    },
    {
      name: 'listWorlds',
      description: 'List world ids under dataRoot',
      invoke: (payload) => createWorldService(requireDataRoot(payload)).listWorlds()
    }
  ]
}

function metaEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'getWorldMeta',
      description: 'Return world metadata without cells',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).getWorldMeta(requireString(body, 'worldId'))
      }
    },
    {
      name: 'getWorldBounds',
      description: 'Return current world AABB bounds',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).getWorldBounds(requireString(body, 'worldId'))
      }
    }
  ]
}

function expansionEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'getExpansion',
      description: 'Return one expansion record',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).getExpansion(
          requireString(body, 'worldId'),
          requireString(body, 'expansionId')
        )
      }
    },
    {
      name: 'listExpansions',
      description: 'List expansion records for a world',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).listExpansions(requireString(body, 'worldId'))
      }
    },
    {
      name: 'getLatestExpansion',
      description: 'Return the latest expansion record for a world',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).getLatestExpansion(requireString(body, 'worldId'))
      }
    }
  ]
}

function cellEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'getCell',
      description: 'Get one world cell by coordinates',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).getCell({
          worldId: requireString(body, 'worldId'),
          x: requireNumber(body, 'x'),
          y: requireNumber(body, 'y')
        })
      }
    },
    {
      name: 'getWorldSpecific',
      description: 'Get cells in an AABB',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).getWorldSpecific({
          worldId: requireString(body, 'worldId'),
          bounds: parseBoundsValue(body.bounds)
        })
      }
    },
    {
      name: 'getWorldWhole',
      description: 'Get all cells materialized for admin inspection',
      invoke: (payload) => {
        const body = asRecord(payload)
        return [...createWorldService(requireDataRoot(body)).getWorldWhole(requireString(body, 'worldId'))]
      }
    }
  ]
}

function optionalBounds(body: Record<string, unknown>): Aabb | undefined {
  if (body.bounds === undefined) return undefined
  return parseBoundsValue(body.bounds)
}

function overlayEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'setSparseOverlay',
      description: 'Upsert a sparse overlay (landTypeOverride mutates effective cell reads)',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).setSparseOverlay({
          worldId: requireString(body, 'worldId'),
          x: requireNumber(body, 'x'),
          y: requireNumber(body, 'y'),
          key: requireString(body, 'key'),
          value: requireString(body, 'value')
        })
      }
    },
    {
      name: 'getSparseOverlay',
      description: 'Read one sparse overlay by coordinates and key',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createWorldService(requireDataRoot(body)).getSparseOverlay({
          worldId: requireString(body, 'worldId'),
          x: requireNumber(body, 'x'),
          y: requireNumber(body, 'y'),
          key: requireString(body, 'key')
        })
      }
    },
    {
      name: 'listSparseOverlays',
      description: 'List sparse overlays filtered by optional keyPrefix and bounds',
      invoke: (payload) => {
        const body = asRecord(payload)
        const filter: {
          worldId: string
          keyPrefix?: string
          bounds?: Aabb
        } = { worldId: requireString(body, 'worldId') }
        if (typeof body.keyPrefix === 'string') filter.keyPrefix = body.keyPrefix
        const bounds = optionalBounds(body)
        if (bounds) filter.bounds = bounds
        return createWorldService(requireDataRoot(body)).listSparseOverlays(filter)
      }
    },
    {
      name: 'clearSparseOverlays',
      description: 'Clear sparse overlays filtered by optional keyPrefix and bounds',
      invoke: (payload) => {
        const body = asRecord(payload)
        const filter: {
          worldId: string
          keyPrefix?: string
          bounds?: Aabb
        } = { worldId: requireString(body, 'worldId') }
        if (typeof body.keyPrefix === 'string') filter.keyPrefix = body.keyPrefix
        const bounds = optionalBounds(body)
        if (bounds) filter.bounds = bounds
        return createWorldService(requireDataRoot(body)).clearSparseOverlays(filter)
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
    ...lifecycleEndpoints(),
    ...discoveryEndpoints(),
    ...metaEndpoints(),
    ...expansionEndpoints(),
    ...cellEndpoints(),
    ...overlayEndpoints()
  ]
}
