import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCivilizationService } from './civilizationService.js'
import type { CivilizationCandidate, CivilizationServiceOptions } from './types.js'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('Settlement world mutations', () => {
  it('persists typed settlement mutation status across service instances', () => {
    const dataRoot = tempRoot()
    const service = createCivilizationService(options(dataRoot))
    const created = service.createCivilization('world-mutated-civ', candidate())

    const mutated = service.applySettlementMutation(
      'world-mutated-civ',
      created.civilizationId,
      { kind: 'destroyed', population: { absolute: 0 } }
    )
    const reopened = createCivilizationService(options(dataRoot))

    expect(mutated.mutationStatus).toBe('destroyed')
    expect(mutated.population).toBe(0)
    expect(reopened.getCivilization('world-mutated-civ', created.civilizationId)).toMatchObject({
      mutationStatus: 'destroyed',
      population: 0
    })
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-civ-mutation-'))
  roots.push(root)
  return root
}

function options(dataRoot: string): CivilizationServiceOptions {
  return {
    dataRoot,
    regional: {
      getRegion: () => null,
      getRegionSummary: () => null,
      getRegionCells: () => [],
      listRegions: () => [],
      getRegionsInBounds: () => []
    },
    world: {
      getWorldMeta: () => {
        throw new Error('not used')
      },
      getExpansion: () => null,
      getCell: () => null
    }
  }
}

function candidate(): CivilizationCandidate {
  return {
    civilizationId: 'civ_ashford',
    worldId: 'world-mutated-civ',
    regionId: 'region_ash',
    kind: 'village',
    origin: { x: 1, y: 1 },
    bounds: { minX: 1, minY: 1, maxX: 1, maxY: 1 },
    seedSalt: 7,
    population: 42,
    overlays: [{ x: 1, y: 1, landUse: 'building' }],
    npcSlots: [],
    statsVersion: 1,
    extraStats: {}
  }
}
