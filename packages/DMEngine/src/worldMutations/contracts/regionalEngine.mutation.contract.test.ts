import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { regionalEngine, type RegionCandidate, type RegionalWorldReader } from '@weaver/regional-engine'
import { emitWorldMutation } from '../emitWorldMutation.js'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('DMEngine -> RegionalEngine mutation contract', () => {
  it('applies a typed region mutation through RegionalEngine public API', () => {
    const dataRoot = tempRoot()
    const options = { dataRoot, world: unusedWorld() }
    regionalEngine.createRegion(options, 'world-region-contract', candidate())

    emitWorldMutation({
      target: 'region',
      worldId: 'world-region-contract',
      regionId: 'region_contract',
      mutation: { kind: 'scoured' }
    }, {
      regional: {
        applyRegionMutation: (worldId, regionId, mutation) =>
          regionalEngine.applyRegionMutation(options, worldId, regionId, mutation)
      },
      civilization: unusedSettlementMutation(),
      npc: unusedNpcMutation()
    })

    expect(
      regionalEngine.getRegion(options, 'world-region-contract', 'region_contract')?.mutationStatus
    ).toBe('scoured')
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dm-region-mutation-contract-'))
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
    regionId: 'region_contract',
    worldId: 'world-region-contract',
    dominantLandType: 'forest',
    landTypeHistogram: { forest: 1 },
    averageElevation: 0,
    minElevation: 0,
    maxElevation: 0,
    waterContent: 0,
    isOcean: false,
    touchesOcean: false,
    isLandlocked: true,
    cellCount: 1,
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    centroid: { x: 0, y: 0 },
    statsVersion: 1,
    extraStats: {},
    cells: [{ x: 0, y: 0 }]
  }
}

function unusedSettlementMutation() {
  return {
    applySettlementMutation: () => {
      throw new Error('not used')
    }
  }
}

function unusedNpcMutation() {
  return {
    applyNpcWorldMutation: () => {
      throw new Error('not used')
    }
  }
}
