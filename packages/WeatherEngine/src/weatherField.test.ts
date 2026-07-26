import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { worldEngine } from '@weaver/world-engine'
import { applyWeatherField, clearWeatherField, getWeatherAt } from './weatherField.js'
import { landTypeMutation } from './mutationRules.js'
import { sampleWeather } from './sampleWeather.js'

function withWorld(run: (dataRoot: string, worldId: string) => void): void {
  const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-weather-'))
  try {
    const created = worldEngine.createWorld(dataRoot, {
      worldId: 'w1',
      seed: 12345,
      bounds: { minX: 0, minY: 0, maxX: 7, maxY: 7 }
    })
    run(dataRoot, created.meta.worldId)
  } finally {
    rmSync(dataRoot, { recursive: true, force: true })
  }
}

describe('applyWeatherField', () => {
  // Windows CI + better-sqlite3 world bootstrap/cell reads can exceed the default 30s.
  it(
    'writes weather overlays and mutates WorldEngine landType where rules apply',
    () => {
    withWorld((dataRoot, worldId) => {
      const bounds = { minX: 0, minY: 0, maxX: 7, maxY: 7 }
      const before = worldEngine.getWorldSpecific({ dataRoot, worldId, bounds })
      const result = applyWeatherField({ dataRoot, worldId, day: 3, bounds })
      expect(result.cellsTouched).toBe(before.length)

      let expectedOverrides = 0
      for (const base of before) {
        const sample = sampleWeather({
          seed: 12345,
          day: 3,
          x: base.x,
          y: base.y,
          landType: base.landType
        })
        expect(getWeatherAt({ dataRoot, worldId, x: base.x, y: base.y })).toMatchObject(sample)
        const expectedOverride = landTypeMutation(sample.condition, sample.severity, base.landType)
        if (expectedOverride) expectedOverrides += 1
        const after = worldEngine.getCell({ dataRoot, worldId, x: base.x, y: base.y })
        expect(after?.landType).toBe(expectedOverride ?? base.landType)
      }
      expect(result.overridesWritten).toBe(expectedOverrides)

      clearWeatherField({ dataRoot, worldId, bounds })
      for (const base of before) {
        expect(worldEngine.getCell({ dataRoot, worldId, x: base.x, y: base.y })).toEqual(base)
        expect(getWeatherAt({ dataRoot, worldId, x: base.x, y: base.y })).toEqual({
          condition: 'clear',
          severity: 0
        })
      }
    })
  },
    60_000
  )
})
