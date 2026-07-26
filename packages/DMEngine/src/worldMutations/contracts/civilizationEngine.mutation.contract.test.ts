import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  civilizationEngine,
  type CivilizationCandidate,
  type CivilizationServiceOptions
} from '@weaver/civilization-engine'
import { emitWorldMutation } from '../emitWorldMutation.js'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('DMEngine -> CivilizationEngine mutation contract', () => {
  it('applies typed settlement mutation through CivilizationEngine public API', () => {
    const options = serviceOptions(tempRoot())
    civilizationEngine.createCivilization(options, 'world-civ-contract', candidate())

    emitWorldMutation({
      target: 'settlement',
      worldId: 'world-civ-contract',
      civilizationId: 'civ_contract',
      mutation: { kind: 'burned' }
    }, {
      regional: unusedRegionMutation(),
      civilization: {
        applySettlementMutation: (worldId, civilizationId, mutation) =>
          civilizationEngine.applySettlementMutation(options, worldId, civilizationId, mutation)
      },
      npc: unusedNpcMutation()
    })

    expect(
      civilizationEngine.getCivilization(options, 'world-civ-contract', 'civ_contract')?.mutationStatus
    ).toBe('burned')
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dm-civ-mutation-contract-'))
  roots.push(root)
  return root
}

function serviceOptions(dataRoot: string): CivilizationServiceOptions {
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
    civilizationId: 'civ_contract',
    worldId: 'world-civ-contract',
    regionId: 'region_contract',
    kind: 'village',
    origin: { x: 0, y: 0 },
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    seedSalt: 1,
    population: 25,
    overlays: [{ x: 0, y: 0, landUse: 'building' }],
    npcSlots: [],
    statsVersion: 1,
    extraStats: {}
  }
}

function unusedRegionMutation() {
  return {
    applyRegionMutation: () => {
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
