import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createRegionalService, type RegionCandidate } from './regionService.js'
import { realizeRegionNaming } from './regionNaming.js'
import type { Aabb, WorldMeta } from '@weaver/world-engine'
import type { RegionalWorldReader } from './types.js'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-regional-naming-'))
  roots.push(root)
  return root
}

function candidate(): RegionCandidate {
  return {
    regionId: 'region_naming',
    worldId: 'w1',
    dominantLandType: 'forest',
    landTypeHistogram: { forest: 2 },
    averageElevation: 0.4,
    minElevation: 0.3,
    maxElevation: 0.5,
    waterContent: 0,
    isOcean: false,
    touchesOcean: false,
    isLandlocked: true,
    cellCount: 2,
    bounds: { minX: 2, minY: 1, maxX: 3, maxY: 1 },
    centroid: { x: 2.5, y: 1 },
    statsVersion: 1,
    extraStats: {},
    cells: [
      { x: 2, y: 1 },
      { x: 3, y: 1 }
    ]
  }
}

function makeWorld(): RegionalWorldReader {
  const bounds: Aabb = { minX: 0, minY: 0, maxX: 3, maxY: 2 }
  return {
    getWorldMeta: (worldId) =>
      ({
        worldId,
        seed: 1,
        bounds,
        noise: { frequency: 0.1, octaves: 1, persistence: 0.5, lacunarity: 2 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        cellCount: 12
      }) satisfies WorldMeta,
    getWorldBounds: () => bounds,
    getExpansion: () => null,
    getCell: () => null,
    getWorldSpecific: () => []
  }
}

describe('realizeRegionNaming', () => {
  it('persists display name and history without changing terrain stats', () => {
    const dataRoot = tempRoot()
    const service = createRegionalService({ dataRoot, world: makeWorld() })
    const created = service.createRegion('w1', candidate())
    const before = service.getRegion('w1', created.regionId)
    expect(before).not.toBeNull()

    const updated = realizeRegionNaming(service, { worldId: 'w1', regionId: created.regionId }, {
      displayName: 'Greenfold Vale',
      history: 'Quiet grasslands between old hills.'
    })

    expect(updated.displayName).toBe('Greenfold Vale')
    expect(updated.history).toBe('Quiet grasslands between old hills.')
    expect(updated.namingRealizedAt).toBeTruthy()
    expect(updated.dominantLandType).toBe(before?.dominantLandType)
    expect(updated.cellCount).toBe(before?.cellCount)
    expect(updated.bounds).toEqual(before?.bounds)
  })

  it('realizes naming only once unless regenerate is true', () => {
    const dataRoot = tempRoot()
    const service = createRegionalService({ dataRoot, world: makeWorld() })
    const created = service.createRegion('w1', candidate())

    realizeRegionNaming(service, { worldId: 'w1', regionId: created.regionId }, {
      displayName: 'First Name',
      history: 'First history.'
    })

    expect(() =>
      realizeRegionNaming(service, { worldId: 'w1', regionId: created.regionId }, {
        displayName: 'Second Name',
        history: 'Second history.'
      })
    ).toThrow(/already realized/i)

    const regenerated = realizeRegionNaming(
      service,
      { worldId: 'w1', regionId: created.regionId },
      { displayName: 'Regenerated Name', history: 'New history.' },
      { regenerate: true }
    )

    expect(regenerated.displayName).toBe('Regenerated Name')
    expect(regenerated.history).toBe('New history.')
  })
})
