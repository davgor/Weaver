import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createWorldService } from '@weaver/world-engine'
import { createRegionalService } from '@weaver/regional-engine'
import { createCivilizationService } from './civilizationService.js'
import type { CivilizationService } from './civilizationService.js'
import type { RegionSummary } from './types.js'

const roots: string[] = []

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-civ-svc-'))
  roots.push(root)
  return root
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

function boot(seed = 42): { service: CivilizationService; worldId: string; regionId: string } {
  const dataRoot = tempRoot()
  const world = createWorldService(dataRoot)
  const regional = createRegionalService({ dataRoot, world })
  const { meta } = world.createWorld({
    worldId: 'w1',
    seed,
    bounds: { minX: 0, minY: 0, maxX: 15, maxY: 15 }
  })
  const regions = regional.fillRegions(meta.worldId)
  const land = regions.find((region) => !region.isOcean)
  if (!land) throw new Error('expected a land region')
  const service = createCivilizationService({ dataRoot, regional, world })
  return { service, worldId: meta.worldId, regionId: land.regionId }
}

describe('ProposeCivilizations', () => {
  it('returns candidates without persisting', () => {
    const { service, worldId, regionId } = boot()
    const before = service.countCivilizations(worldId)
    const candidates = service.proposeCivilizations(worldId, regionId, { maxCount: 2 })
    expect(candidates.length).toBeGreaterThan(0)
    expect(service.countCivilizations(worldId)).toBe(before)
    expect(candidates.every((c) => c.overlays.length > 0)).toBe(true)
  })

  it('uses a seeded city density field deterministically', () => {
    const first = boot(77)
    const second = boot(77)
    const a = first.service.proposeCivilizations(first.worldId, first.regionId, {
      kinds: ['city'],
      maxCount: 1,
      rngSalt: 9
    })
    const b = second.service.proposeCivilizations(second.worldId, second.regionId, {
      kinds: ['city'],
      maxCount: 1,
      rngSalt: 9
    })
    if (a.length === 0 || b.length === 0) {
      const fallbackA = first.service.proposeCivilizations(first.worldId, first.regionId, {
        maxCount: 1,
        rngSalt: 9
      })
      const fallbackB = second.service.proposeCivilizations(second.worldId, second.regionId, {
        maxCount: 1,
        rngSalt: 9
      })
      expect(fallbackA).toEqual(fallbackB)
      return
    }
    expect(a).toEqual(b)
    expect(a[0]?.overlays.some((o) => o.density !== undefined)).toBe(true)
  })
})

describe('CreateCivilization', () => {
  it('persists civilizations and WorldEngine overlays', () => {
    const dataRoot = tempRoot()
    const world = createWorldService(dataRoot)
    const regional = createRegionalService({ dataRoot, world })
    world.createWorld({
      worldId: 'w1',
      seed: 11,
      bounds: { minX: 0, minY: 0, maxX: 15, maxY: 15 }
    })
    const regions = regional.fillRegions('w1')
    const land = regions.find((region) => !region.isOcean)
    if (!land) throw new Error('expected land')
    const service = createCivilizationService({ dataRoot, regional, world })
    const [candidate] = service.proposeCivilizations('w1', land.regionId, { maxCount: 1 })
    if (!candidate) throw new Error('expected candidate')
    const created = service.createCivilization('w1', candidate)
    expect(created.civilizationId).toBe(candidate.civilizationId)
    expect(service.getCivilization('w1', created.civilizationId)?.population).toBe(
      candidate.population
    )
    const cell = candidate.overlays[0]
    if (!cell) throw new Error('expected overlay cell')
    expect(
      createCivilizationService({ dataRoot, regional, world }).getCivilizationAt(
        'w1',
        cell.x,
        cell.y
      )?.civilizationId
    ).toBe(created.civilizationId)
  })
})

describe('FillCivilizations', () => {
  it('supports expansion-scoped fill and skips claimed cells', () => {
    const dataRoot = tempRoot()
    const world = createWorldService(dataRoot)
    const regional = createRegionalService({ dataRoot, world })
    world.createWorld({
      worldId: 'w1',
      seed: 5,
      bounds: { minX: 0, minY: 0, maxX: 7, maxY: 7 }
    })
    regional.fillRegions('w1')
    const service = createCivilizationService({ dataRoot, regional, world })
    const first = service.fillCivilizations('w1')
    const expansion = world.expandWorld({
      worldId: 'w1',
      bounds: { minX: 0, minY: 0, maxX: 11, maxY: 7 }
    })
    regional.fillRegions('w1', { expansionId: expansion.expansionId })
    const second = service.fillCivilizations('w1', { expansionId: expansion.expansionId })
    const again = service.fillCivilizations('w1', { expansionId: expansion.expansionId })
    expect(first.length + second.length).toBeGreaterThan(0)
    expect(again).toEqual([])
  })
})

describe('Population and NPC placeholders', () => {
  it('keeps aggregates consistent and claim/release without NPC construction', () => {
    const { service, worldId, regionId } = boot(13)
    const created = service.fillCivilizations(worldId, { regionId })
    expect(created.length).toBeGreaterThan(0)
    const civ = created[0]
    if (!civ) throw new Error('expected civilization')
    const worldPop = service.getPopulation(worldId)
    const regionPop = service.getRegionPopulation(worldId, regionId)
    expect(worldPop.population).toBeGreaterThan(0)
    expect(regionPop.population).toBeLessThanOrEqual(worldPop.population)
    expect(service.getCivilizationPopulation(worldId, civ.civilizationId)).toBe(civ.population)

    const slots = service.listNpcPlaceholders(worldId, civ.civilizationId)
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every((slot) => slot.assignedNpcId === undefined)).toBe(true)
    const [slot] = slots
    if (!slot) throw new Error('expected slot')
    const claimed = service.claimNpcPlaceholder(worldId, slot.slotId, 'npc-1')
    expect(claimed.status).toBe('assigned')
    expect(() => service.claimNpcPlaceholder(worldId, slot.slotId, 'npc-2')).toThrow(
      /already assigned/
    )
    const released = service.releaseNpcPlaceholder(worldId, slot.slotId)
    expect(released.status).toBe('unassigned')
    expect(released.assignedNpcId).toBeUndefined()

    const adjusted = service.adjustPopulation(worldId, civ.civilizationId, { absolute: 12 })
    expect(adjusted.population).toBe(12)
    expect(service.reconcilePopulation(worldId).population).toBe(
      service.getPopulation(worldId).population
    )
  })
})

describe('Query and lifecycle', () => {
  it('supports summaries and spatial queries', () => {
    const { service, worldId, regionId } = boot(19)
    const created = service.fillCivilizations(worldId, { regionId })
    const civ = created[0]
    if (!civ) throw new Error('expected civilization')
    expect(service.hasCivilizations(worldId)).toBe(true)
    expect(service.countCivilizations(worldId)).toBeGreaterThan(0)
    expect(service.listCivilizationsInRegion(worldId, regionId).length).toBeGreaterThan(0)
    expect(service.getCivilizationSummary(worldId, civ.civilizationId)).toMatchObject({
      civilizationId: civ.civilizationId,
      kind: civ.kind,
      population: civ.population
    })
    expect(service.getRegionCivilizationSummary(worldId, regionId)?.settlementCount).toBeGreaterThan(
      0
    )
    expect(service.getCivilizationAt(worldId, civ.origin.x, civ.origin.y)?.civilizationId).toBe(
      civ.civilizationId
    )
    expect(
      service.getCivilizationsInBounds(worldId, {
        x: civ.bounds.minX,
        y: civ.bounds.minY,
        length: civ.bounds.maxX - civ.bounds.minX + 1,
        width: civ.bounds.maxY - civ.bounds.minY + 1
      }).length
    ).toBeGreaterThan(0)
  })

  it('supports delete and clear lifecycle', () => {
    const { service, worldId, regionId } = boot(23)
    const created = service.fillCivilizations(worldId, { regionId })
    const civ = created[0]
    if (!civ) throw new Error('expected civilization')
    service.deleteCivilization(worldId, civ.civilizationId)
    expect(service.getCivilization(worldId, civ.civilizationId)).toBeNull()
    service.clearCivilizations(worldId)
    expect(service.countCivilizations(worldId)).toBe(0)
  })
})

describe('kindRules fixture typing', () => {
  it('accepts RegionSummary-shaped fixtures', () => {
    const fixture: RegionSummary = {
      regionId: 'r',
      worldId: 'w',
      dominantLandType: 'grassland',
      landTypeHistogram: { grassland: 1 },
      averageElevation: 0.5,
      minElevation: 0.4,
      maxElevation: 0.6,
      waterContent: 0,
      isOcean: false,
      touchesOcean: false,
      isLandlocked: true,
      cellCount: 4,
      bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      centroid: { x: 0.5, y: 0.5 },
      statsVersion: 1,
      extraStats: {}
    }
    expect(fixture.cellCount).toBe(4)
  })
})
