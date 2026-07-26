import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createWorldService } from '@weaver/world-engine'
import { createRegionalService } from '../regionService.js'

const roots: string[] = []

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-regional-contract-'))
  roots.push(root)
  return root
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('RegionalEngine -> WorldEngine contract', () => {
  it('fills initial and expanded WorldEngine cells via published WorldEngine APIs', () => {
    const dataRoot = tempRoot()
    const world = createWorldService(dataRoot)
    const regional = createRegionalService({ dataRoot, world })
    const { meta } = world.createWorld({
      worldId: 'contract-world',
      seed: 1234,
      bounds: { minX: 0, minY: 0, maxX: 5, maxY: 5 }
    })

    const initialRegions = regional.fillRegions(meta.worldId)
    const expansion = world.expandWorld({
      worldId: meta.worldId,
      bounds: { minX: 0, minY: 0, maxX: 7, maxY: 5 }
    })
    const expandedRegions = regional.fillRegions(meta.worldId, { expansionId: expansion.expansionId })
    const addedCell = world.getCell({ worldId: meta.worldId, x: 6, y: 0 })
    const addedRegion = regional.getRegionAt(meta.worldId, 6, 0)

    expect(initialRegions.length).toBeGreaterThan(0)
    expect(expansion.addedBounds).toEqual({ minX: 6, minY: 0, maxX: 7, maxY: 5 })
    expect(expandedRegions.length).toBeGreaterThan(0)
    expect(addedRegion).toMatchObject({
      worldId: meta.worldId,
      sourceExpansionId: expansion.expansionId,
      dominantLandType: addedCell?.landType
    })
    expect(regional.getRegionSummary(meta.worldId, addedRegion?.regionId ?? '')).toMatchObject({
      regionId: addedRegion?.regionId,
      worldId: meta.worldId,
      dominantLandType: addedCell?.landType,
      statsVersion: 1
    })
  })
})
