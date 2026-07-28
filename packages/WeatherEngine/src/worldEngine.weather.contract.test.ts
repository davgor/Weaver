import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LAND_TYPE_OVERRIDE_KEY, worldEngine, type Cell } from '@weaver/world-engine'
import { applyWeatherField, clearWeatherField, getWeatherAt } from './weatherField.js'
import { WEATHER_CONDITION_KEY } from './types.js'

function withContractWorld(run: (dataRoot: string, worldId: string, base: Cell) => void): void {
  const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-weather-contract-'))
  try {
    const { meta } = worldEngine.createWorld(dataRoot, {
      worldId: 'contract-world',
      seed: 99,
      bounds: { minX: 0, minY: 0, maxX: 4, maxY: 4 }
    })
    const base = worldEngine.getCell({ dataRoot, worldId: meta.worldId, x: 2, y: 2 })
    if (!base) throw new Error('expected base cell')
    run(dataRoot, meta.worldId, base)
  } finally {
    rmSync(dataRoot, { recursive: true, force: true })
  }
}

describe('WeatherEngine ↔ WorldEngine weather mutation contract', () => {
  // Windows CI + better-sqlite3 world bootstrap can exceed 30s (see weatherField.test.ts).
  it(
    'applies weather through WorldEngine overlays and restores base terrain on clear',
    () => {
      withContractWorld((dataRoot, worldId, base) => {
        const bounds = { minX: 0, minY: 0, maxX: 4, maxY: 4 }
        applyWeatherField({ dataRoot, worldId, day: 8, bounds })

        expect(
          worldEngine.getSparseOverlay({ dataRoot, worldId, x: 2, y: 2, key: WEATHER_CONDITION_KEY })
        ).not.toBeNull()
        const weathered = getWeatherAt({ dataRoot, worldId, x: 2, y: 2 })
        expect(weathered.severity).toBeGreaterThanOrEqual(1)

        const override = worldEngine.getSparseOverlay({
          dataRoot,
          worldId,
          x: 2,
          y: 2,
          key: LAND_TYPE_OVERRIDE_KEY
        })
        const cell = worldEngine.getCell({ dataRoot, worldId, x: 2, y: 2 })
        expect(cell?.landType).toBe(override ? override.value : base.landType)

        clearWeatherField({ dataRoot, worldId, bounds })
        expect(worldEngine.getCell({ dataRoot, worldId, x: 2, y: 2 })).toEqual(base)
        expect(
          worldEngine.getSparseOverlay({ dataRoot, worldId, x: 2, y: 2, key: WEATHER_CONDITION_KEY })
        ).toBeNull()
      })
    },
    120_000
  )
})
