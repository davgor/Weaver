import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createWorldService } from '@weaver/world-engine'
import { createRegionalService } from '@weaver/regional-engine'
import { createCivilizationService } from '../civilizationService.js'
import { OVERLAY_KEYS } from '../overlayContract.js'
import { createWorldOverlayAdapter } from '../store/worldOverlayAdapter.js'

const roots: string[] = []

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-civ-contract-'))
  roots.push(root)
  return root
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('CivilizationEngine -> RegionalEngine contract', () => {
  it('reads region summary/cells via published RegionalEngine APIs for placement', () => {
    const dataRoot = tempRoot()
    const world = createWorldService(dataRoot)
    const regional = createRegionalService({ dataRoot, world })
    world.createWorld({
      worldId: 'contract-world',
      seed: 321,
      bounds: { minX: 0, minY: 0, maxX: 11, maxY: 11 }
    })
    const regions = regional.fillRegions('contract-world')
    const land = regions.find((region) => !region.isOcean)
    if (!land) throw new Error('expected land region')
    const summary = regional.getRegionSummary('contract-world', land.regionId)
    const cells = regional.getRegionCells('contract-world', land.regionId)
    expect(summary?.regionId).toBe(land.regionId)
    expect(cells.length).toBe(land.cellCount)

    const civ = createCivilizationService({ dataRoot, regional, world })
    const candidates = civ.proposeCivilizations('contract-world', land.regionId, { maxCount: 1 })
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0]?.regionId).toBe(land.regionId)
  })
})

describe('CivilizationEngine -> WorldEngine contract', () => {
  it('uses WorldEngine seed/meta and writes SparseOverlay rows into world.sqlite', () => {
    const dataRoot = tempRoot()
    const world = createWorldService(dataRoot)
    const regional = createRegionalService({ dataRoot, world })
    const { meta } = world.createWorld({
      worldId: 'overlay-world',
      seed: 654,
      bounds: { minX: 0, minY: 0, maxX: 11, maxY: 11 }
    })
    expect(world.getWorldMeta('overlay-world').seed).toBe(meta.seed)
    const regions = regional.fillRegions('overlay-world')
    const land = regions.find((region) => !region.isOcean)
    if (!land) throw new Error('expected land region')
    const civ = createCivilizationService({ dataRoot, regional, world })
    const created = civ.fillCivilizations('overlay-world', { regionId: land.regionId })
    expect(created.length).toBeGreaterThan(0)
    const settlement = created[0]
    if (!settlement) throw new Error('expected settlement')
    const overlays = createWorldOverlayAdapter(dataRoot).listOverlaysAt(
      'overlay-world',
      settlement.origin.x,
      settlement.origin.y
    )
    expect(overlays.some((row) => row.key === OVERLAY_KEYS.civilizationId)).toBe(true)
    expect(overlays.some((row) => row.key === OVERLAY_KEYS.landUse)).toBe(true)
    expect(world.getCell({ worldId: 'overlay-world', x: settlement.origin.x, y: settlement.origin.y })).toBeTruthy()
  })
})
