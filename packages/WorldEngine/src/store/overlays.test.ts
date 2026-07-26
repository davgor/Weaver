import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorldService } from './worldService.js'
import { LAND_TYPE_OVERRIDE_KEY } from '../types.js'

function withTempService(run: (svc: ReturnType<typeof createWorldService>) => void): void {
  const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-world-overlay-'))
  try {
    run(createWorldService(dataRoot))
  } finally {
    rmSync(dataRoot, { recursive: true, force: true })
  }
}

describe('sparse overlay CRUD', () => {
  it('sets, gets, lists, and clears overlays by key prefix and bounds', () => {
    withTempService((svc) => {
      svc.createWorld({ worldId: 'w1', seed: 1, bounds: { minX: 0, minY: 0, maxX: 3, maxY: 3 } })
      svc.setSparseOverlay({ worldId: 'w1', x: 1, y: 1, key: 'weather.condition', value: 'rain' })
      svc.setSparseOverlay({ worldId: 'w1', x: 2, y: 2, key: 'weather.condition', value: 'storm' })
      svc.setSparseOverlay({ worldId: 'w1', x: 1, y: 1, key: 'other.marker', value: 'keep' })

      expect(svc.getSparseOverlay({ worldId: 'w1', x: 1, y: 1, key: 'weather.condition' })).toEqual({
        worldId: 'w1',
        x: 1,
        y: 1,
        key: 'weather.condition',
        value: 'rain'
      })
      expect(svc.listSparseOverlays({ worldId: 'w1', keyPrefix: 'weather.' })).toHaveLength(2)
      expect(
        svc.clearSparseOverlays({
          worldId: 'w1',
          keyPrefix: 'weather.',
          bounds: { minX: 1, minY: 1, maxX: 1, maxY: 1 }
        })
      ).toBe(1)
      expect(svc.getSparseOverlay({ worldId: 'w1', x: 1, y: 1, key: 'weather.condition' })).toBeNull()
      expect(svc.getSparseOverlay({ worldId: 'w1', x: 2, y: 2, key: 'weather.condition' })?.value).toBe(
        'storm'
      )
      expect(svc.getSparseOverlay({ worldId: 'w1', x: 1, y: 1, key: 'other.marker' })?.value).toBe('keep')
    })
  })
})

describe('landTypeOverride effective reads', () => {
  it('merges landTypeOverride into cell reads without rewriting base chunks', () => {
    withTempService((svc) => {
      svc.createWorld({ worldId: 'w1', seed: 42, bounds: { minX: 0, minY: 0, maxX: 2, maxY: 2 } })
      const base = svc.getCell({ worldId: 'w1', x: 1, y: 1 })
      expect(base).not.toBeNull()
      if (!base) throw new Error('expected cell')

      svc.setSparseOverlay({
        worldId: 'w1',
        x: 1,
        y: 1,
        key: LAND_TYPE_OVERRIDE_KEY,
        value: 'swamp'
      })
      expect(svc.getCell({ worldId: 'w1', x: 1, y: 1 })).toEqual({ ...base, landType: 'swamp' })
      expect(svc.getWorldSpecific({ worldId: 'w1', bounds: { minX: 1, minY: 1, maxX: 1, maxY: 1 } })).toEqual([
        { ...base, landType: 'swamp' }
      ])
      svc.clearSparseOverlays({ worldId: 'w1', keyPrefix: LAND_TYPE_OVERRIDE_KEY })
      expect(svc.getCell({ worldId: 'w1', x: 1, y: 1 })).toEqual(base)
    })
  })

  it('rejects invalid landTypeOverride values', () => {
    withTempService((svc) => {
      svc.createWorld({ worldId: 'w1', seed: 1, bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 } })
      expect(() =>
        svc.setSparseOverlay({
          worldId: 'w1',
          x: 0,
          y: 0,
          key: LAND_TYPE_OVERRIDE_KEY,
          value: 'lava'
        })
      ).toThrow(/landTypeOverride/)
    })
  })
})
