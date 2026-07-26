import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LAND_TYPE_OVERRIDE_KEY, worldEngine } from '@weaver/world-engine'
import { applyWeatherField, clearWeatherField, getWeatherAt } from './weatherField.js'
import { WEATHER_CONDITION_KEY } from './types.js'

describe('WeatherEngine ↔ WorldEngine weather mutation contract', () => {
  it('applies weather through WorldEngine overlays and restores base terrain on clear', () => {
    const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-weather-contract-'))
    try {
      const { meta } = worldEngine.createWorld(dataRoot, {
        worldId: 'contract-world',
        seed: 99,
        bounds: { minX: 0, minY: 0, maxX: 4, maxY: 4 }
      })
      const bounds = meta.bounds
      const base = worldEngine.getCell({ dataRoot, worldId: meta.worldId, x: 2, y: 2 })
      expect(base).not.toBeNull()

      applyWeatherField({ dataRoot, worldId: meta.worldId, day: 8, bounds })
      expect(
        worldEngine.getSparseOverlay({
          dataRoot,
          worldId: meta.worldId,
          x: 2,
          y: 2,
          key: WEATHER_CONDITION_KEY
        })
      ).not.toBeNull()

      const weathered = getWeatherAt({ dataRoot, worldId: meta.worldId, x: 2, y: 2 })
      expect(weathered.condition).not.toEqual(undefined)
      expect(weathered.severity).toBeGreaterThanOrEqual(1)

      const override = worldEngine.getSparseOverlay({
        dataRoot,
        worldId: meta.worldId,
        x: 2,
        y: 2,
        key: LAND_TYPE_OVERRIDE_KEY
      })
      const cell = worldEngine.getCell({ dataRoot, worldId: meta.worldId, x: 2, y: 2 })
      if (override) {
        expect(cell?.landType).toBe(override.value)
        expect(cell?.landType).not.toBe(base?.landType)
      } else {
        expect(cell?.landType).toBe(base?.landType)
      }

      clearWeatherField({ dataRoot, worldId: meta.worldId, bounds })
      expect(worldEngine.getCell({ dataRoot, worldId: meta.worldId, x: 2, y: 2 })).toEqual(base)
      expect(
        worldEngine.getSparseOverlay({
          dataRoot,
          worldId: meta.worldId,
          x: 2,
          y: 2,
          key: WEATHER_CONDITION_KEY
        })
      ).toBeNull()
    } finally {
      rmSync(dataRoot, { recursive: true, force: true })
    }
  })
})
