import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorldService } from './worldService.js'

function withTempService(run: (svc: ReturnType<typeof createWorldService>, root: string) => void): void {
  const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-world-'))
  try {
    run(createWorldService(dataRoot), dataRoot)
  } finally {
    rmSync(dataRoot, { recursive: true, force: true })
  }
}

describe('worldService', () => {
  it('creates, persists SQLite metadata and chunks, then reloads by world id', () => {
    withTempService((svc, dataRoot) => {
      const bounds = { minX: -2, minY: 3, maxX: 3, maxY: 6 }
      const created = svc.createWorld({ worldId: 'w1', seed: 123, bounds })
      expect(created.meta.worldId).toBe('w1')
      expect(created.meta.cellCount).toBe(24)
      expect(created.expansion0).toMatchObject({
        sequence: 0,
        addedBounds: bounds,
        previousBounds: null,
        resultingBounds: bounds,
        cellCount: 24
      })
      expect(existsSync(join(dataRoot, 'w1', 'world.sqlite'))).toBe(true)
      expect(existsSync(join(dataRoot, 'w1', 'chunks'))).toBe(true)

      const reopened = createWorldService(dataRoot)
      expect(reopened.hasWorld('w1')).toBe(true)
      expect(reopened.getWorldMeta('w1').seed).toBe(123)
      expect(reopened.getWorldBounds('w1')).toEqual(bounds)
      expect(reopened.getCell({ worldId: 'w1', x: -2, y: 3 })).toMatchObject({ x: -2, y: 3 })
      expect(reopened.listExpansions('w1')).toHaveLength(1)
    })
  })

  it('expands bounds, preserves prior cells, and persists expansion metadata', () => {
    withTempService((svc, dataRoot) => {
      svc.createWorld({ worldId: 'w1', seed: 5, bounds: { minX: 0, minY: 0, maxX: 3, maxY: 3 } })
      const before = svc.getCell({ worldId: 'w1', x: 1, y: 1 })
      const expansion = svc.expandWorld({ worldId: 'w1', bounds: { minX: 0, minY: 0, maxX: 5, maxY: 3 } })
      expect(expansion).toMatchObject({
        sequence: 1,
        addedBounds: { minX: 4, minY: 0, maxX: 5, maxY: 3 },
        previousBounds: { minX: 0, minY: 0, maxX: 3, maxY: 3 },
        resultingBounds: { minX: 0, minY: 0, maxX: 5, maxY: 3 },
        cellCount: 8
      })
      expect(svc.getCell({ worldId: 'w1', x: 1, y: 1 })).toEqual(before)

      const reopened = createWorldService(dataRoot)
      expect(reopened.getExpansion('w1', expansion.expansionId)).toEqual(expansion)
      expect(reopened.listExpansions('w1').map((record) => record.sequence)).toEqual([0, 1])
      expect(reopened.getLatestExpansion('w1')).toEqual(expansion)
      expect(reopened.getWorldSpecific({ worldId: 'w1', bounds: expansion.addedBounds })).toHaveLength(8)
    })
  })
})

describe('worldService queries and lifecycle', () => {
  it('queries specific AABBs and streams whole worlds without returning an array', () => {
    withTempService((svc) => {
      // 64×64 is large enough to exercise chunk streaming without CI timeouts.
      svc.createWorld({ worldId: 'large', seed: 99, bounds: { minX: 0, minY: 0, maxX: 63, maxY: 63 } })
      const slice = svc.getWorldSpecific({ worldId: 'large', bounds: { minX: 10, minY: 20, maxX: 13, maxY: 24 } })
      expect(slice).toHaveLength(20)
      expect(slice[0]).toMatchObject({ x: 10, y: 20 })

      const whole = svc.getWorldWhole('large')
      expect(Array.isArray(whole)).toBe(false)
      let count = 0
      for (const cell of whole) {
        count++
        if (count === 1) expect(cell.x).toBeGreaterThanOrEqual(0)
      }
      expect(count).toBe(4_096)
    })
  }, 15_000)

  it('supports lifecycle, bounds/meta, expansion getters, and point lookup', () => {
    withTempService((svc) => {
      expect(svc.listWorlds()).toEqual([])
      expect(svc.hasWorld('w2')).toBe(false)
      svc.createWorld({ worldId: 'w2', seed: 2, width: 8, height: 6 })
      expect(() => svc.createWorld({ worldId: 'w2', seed: 3, width: 8, height: 6 })).toThrow(/exists/)
      expect(svc.listWorlds()).toEqual(['w2'])
      expect(svc.getWorldMeta('w2')).toMatchObject({ worldId: 'w2', seed: 2, cellCount: 48 })
      expect(svc.getWorldBounds('w2')).toEqual({ minX: 0, minY: 0, maxX: 7, maxY: 5 })
      expect(svc.getCell({ worldId: 'w2', x: 8, y: 5 })).toBeNull()
      expect(svc.getExpansion('w2', 'missing')).toBeNull()
      expect(svc.getLatestExpansion('w2')?.sequence).toBe(0)
      svc.deleteWorld('w2')
      expect(svc.hasWorld('w2')).toBe(false)
      expect(() => svc.getWorldMeta('w2')).toThrow(/not found/)
    })
  })
})
