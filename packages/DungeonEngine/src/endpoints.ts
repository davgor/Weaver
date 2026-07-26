import type { EngineEndpoint } from './typesApi.js'
import type { Aabb } from './types.js'
import { createDungeonService, type CreateDungeonOptions } from './store/dungeonService.js'

const PACKAGE_NAME = '@weaver/dungeon-engine'
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

function parseCreateOpts(payload: Record<string, unknown>): CreateDungeonOptions {
  const opts: CreateDungeonOptions = {}
  if (typeof payload.dungeonId === 'string') opts.dungeonId = payload.dungeonId
  const seed = optionalNumber(payload, 'seed')
  if (seed !== undefined) opts.seed = seed
  const floorCount = optionalNumber(payload, 'floorCount')
  if (floorCount !== undefined) opts.floorCount = floorCount
  const width = optionalNumber(payload, 'width')
  if (width !== undefined) opts.width = width
  const height = optionalNumber(payload, 'height')
  if (height !== undefined) opts.height = height
  if (typeof payload.theme === 'string') opts.theme = payload.theme
  return opts
}

function parseBounds(payload: Record<string, unknown>): Aabb {
  const bounds = payload.bounds
  if (!bounds || typeof bounds !== 'object') throw new Error('bounds required')
  const b = bounds as Record<string, unknown>
  return {
    minX: Number(b.minX),
    minY: Number(b.minY),
    maxX: Number(b.maxX),
    maxY: Number(b.maxY)
  }
}

function lifecycleEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'createDungeon',
      description: 'Create a seeded multi-floor dungeon under dataRoot',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createDungeonService(requireDataRoot(body)).createDungeon(parseCreateOpts(body))
      }
    },
    {
      name: 'hasDungeon',
      description: 'Check whether a dungeonId exists under dataRoot',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createDungeonService(requireDataRoot(body)).hasDungeon(requireString(body, 'dungeonId'))
      }
    },
    {
      name: 'listDungeons',
      description: 'List dungeon ids under dataRoot',
      invoke: (payload) => createDungeonService(requireDataRoot(payload)).listDungeons()
    },
    {
      name: 'deleteDungeon',
      description: 'Delete a dungeon store under dataRoot',
      invoke: (payload) => {
        const body = asRecord(payload)
        createDungeonService(requireDataRoot(body)).deleteDungeon(requireString(body, 'dungeonId'))
        return { ok: true as const }
      }
    }
  ]
}

function metaQueryEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'getDungeonMeta',
      description: 'Return dungeon metadata without cells',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createDungeonService(requireDataRoot(body)).getDungeonMeta(requireString(body, 'dungeonId'))
      }
    },
    {
      name: 'getDungeonBounds',
      description: 'Return dungeon AABB bounds',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createDungeonService(requireDataRoot(body)).getDungeonBounds(requireString(body, 'dungeonId'))
      }
    },
    {
      name: 'listFloors',
      description: 'List floor records for a dungeon',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createDungeonService(requireDataRoot(body)).listFloors(requireString(body, 'dungeonId'))
      }
    }
  ]
}

function cellQueryEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'getCell',
      description: 'Get one cell by floorIndex and coordinates',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createDungeonService(requireDataRoot(body)).getCell({
          dungeonId: requireString(body, 'dungeonId'),
          floorIndex: Number(body.floorIndex),
          x: Number(body.x),
          y: Number(body.y)
        })
      }
    },
    {
      name: 'getDungeonSpecific',
      description: 'Get cells in an AABB on one floor',
      invoke: (payload) => {
        const body = asRecord(payload)
        return createDungeonService(requireDataRoot(body)).getDungeonSpecific({
          dungeonId: requireString(body, 'dungeonId'),
          floorIndex: Number(body.floorIndex),
          bounds: parseBounds(body)
        })
      }
    },
    {
      name: 'getFloor',
      description: 'Get all cells on one floor (materialized array)',
      invoke: (payload) => {
        const body = asRecord(payload)
        const svc = createDungeonService(requireDataRoot(body))
        return [...svc.getFloor(requireString(body, 'dungeonId'), Number(body.floorIndex))]
      }
    },
    {
      name: 'getDungeonWhole',
      description: 'Get all cells across all floors (materialized array)',
      invoke: (payload) => {
        const body = asRecord(payload)
        return [...createDungeonService(requireDataRoot(body)).getDungeonWhole(requireString(body, 'dungeonId'))]
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
    ...metaQueryEndpoints(),
    ...cellQueryEndpoints()
  ]
}
