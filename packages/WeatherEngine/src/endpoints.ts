import { assertLandType, type Aabb } from '@weaver/world-engine'
import type { EngineEndpoint } from './typesApi.js'
import { applyWeatherField, clearWeatherField, getWeatherAt } from './weatherField.js'
import { sampleWeather } from './sampleWeather.js'

const PACKAGE_NAME = '@weaver/weather-engine'
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

function requireNumber(payload: Record<string, unknown>, key: string): number {
  const value = payload[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} required`)
  return value
}

function requireDataRoot(payload: unknown): string {
  return requireString(asRecord(payload), 'dataRoot')
}

function parseBounds(payload: Record<string, unknown>): Aabb {
  const bounds = payload.bounds
  if (!bounds || typeof bounds !== 'object') throw new Error('bounds required')
  const body = bounds as Record<string, unknown>
  return {
    minX: requireNumber(body, 'minX'),
    minY: requireNumber(body, 'minY'),
    maxX: requireNumber(body, 'maxX'),
    maxY: requireNumber(body, 'maxY')
  }
}

function sampleEndpoint(): EngineEndpoint {
  return {
    name: 'sampleWeather',
    description: 'Pure deterministic weather sample for a cell',
    invoke: (payload) => {
      const body = asRecord(payload)
      return sampleWeather({
        seed: requireNumber(body, 'seed'),
        day: requireNumber(body, 'day'),
        x: requireNumber(body, 'x'),
        y: requireNumber(body, 'y'),
        landType: assertLandType(requireString(body, 'landType'))
      })
    }
  }
}

function applyEndpoint(): EngineEndpoint {
  return {
    name: 'applyWeatherField',
    description: 'Apply weather overlays that mutate WorldEngine cell results',
    invoke: (payload) => {
      const body = asRecord(payload)
      return applyWeatherField({
        dataRoot: requireDataRoot(body),
        worldId: requireString(body, 'worldId'),
        day: requireNumber(body, 'day'),
        bounds: parseBounds(body)
      })
    }
  }
}

function clearEndpoint(): EngineEndpoint {
  return {
    name: 'clearWeatherField',
    description: 'Clear weather-owned overlays so WorldEngine reads revert',
    invoke: (payload) => {
      const body = asRecord(payload)
      return clearWeatherField({
        dataRoot: requireDataRoot(body),
        worldId: requireString(body, 'worldId'),
        bounds: parseBounds(body)
      })
    }
  }
}

function getAtEndpoint(): EngineEndpoint {
  return {
    name: 'getWeatherAt',
    description: 'Read current weather overlays for one cell',
    invoke: (payload) => {
      const body = asRecord(payload)
      return getWeatherAt({
        dataRoot: requireDataRoot(body),
        worldId: requireString(body, 'worldId'),
        x: requireNumber(body, 'x'),
        y: requireNumber(body, 'y')
      })
    }
  }
}

export function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    sampleEndpoint(),
    applyEndpoint(),
    clearEndpoint(),
    getAtEndpoint()
  ]
}
