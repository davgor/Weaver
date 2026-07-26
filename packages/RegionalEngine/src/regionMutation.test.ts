import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createRegionalService } from './regionService.js'
import type { RegionCandidate, RegionalWorldReader } from './types.js'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('Region world mutations', () => {
  it('persists typed region mutation status across service instances', () => {
    const dataRoot = tempRoot()
    const service = createRegionalService({ dataRoot, world: unusedWorld() })
    const created = service.createRegion('world-mutated-region', candidate())

    const mutated = service.applyRegionMutation(
      'world-mutated-region',
      created.regionId,
      { kind: 'ruined' }
    )
    const reopened = createRegionalService({ dataRoot, world: unusedWorld() })

    expect(mutated.mutationStatus).toBe('ruined')
    expect(reopened.getRegion('world-mutated-region', created.regionId)?.mutationStatus).toBe('ruined')
    expect(reopened.getRegionSummary('world-mutated-region', created.regionId)?.mutationStatus).toBe('ruined')
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-region-mutation-'))
  roots.push(root)
  return root
}

function unusedWorld(): RegionalWorldReader {
  return {
    getWorldMeta: () => {
      throw new Error('not used')
    },
    getWorldBounds: () => {
      throw new Error('not used')
    },
    getExpansion: () => null,
    getCell: () => null,
    getWorldSpecific: () => []
  }
}

function candidate(): RegionCandidate {
  return {
    regionId: 'region_ash_waste',
    worldId: 'world-mutated-region',
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
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 0 },
    centroid: { x: 0.5, y: 0 },
    statsVersion: 1,
    extraStats: {},
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }]
  }
}
