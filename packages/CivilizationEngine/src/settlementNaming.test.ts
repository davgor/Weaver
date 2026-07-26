import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createRegionalService } from '@weaver/regional-engine'
import { createCivilizationService } from './civilizationService.js'
import { realizeSettlementNaming } from './settlementNaming.js'
import type { CivilizationCandidate, CivilizationRegionalReader } from './types.js'
import type { Aabb, Cell, ExpansionRecord, WorldMeta } from '@weaver/world-engine'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-civ-naming-'))
  roots.push(root)
  return root
}

function makeWorld() {
  const bounds: Aabb = { minX: 0, minY: 0, maxX: 3, maxY: 2 }
  return {
    getWorldMeta: (worldId: string): WorldMeta => ({
      worldId,
      seed: 1,
      bounds,
      noise: { frequency: 0.1, octaves: 1, persistence: 0.5, lacunarity: 2 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      cellCount: 12
    }),
    getExpansion: (_worldId: string, _expansionId: string): ExpansionRecord | null => null,
    getCell: (_args: { worldId: string; x: number; y: number }): Cell | null => null
  }
}

function makeRegional(dataRoot: string): CivilizationRegionalReader {
  const world = makeWorld()
  const regional = createRegionalService({ dataRoot, world })
  regional.createRegion('w1', {
    regionId: 'region_1',
    worldId: 'w1',
    dominantLandType: 'grassland',
    landTypeHistogram: { grassland: 4 },
    averageElevation: 0.3,
    minElevation: 0.2,
    maxElevation: 0.4,
    waterContent: 0,
    isOcean: false,
    touchesOcean: false,
    isLandlocked: true,
    cellCount: 4,
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    centroid: { x: 0.5, y: 0.5 },
    statsVersion: 1,
    extraStats: {},
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ]
  })
  return regional
}

function candidate(): CivilizationCandidate {
  return {
    civilizationId: 'civ_naming',
    worldId: 'w1',
    regionId: 'region_1',
    kind: 'village',
    origin: { x: 0, y: 0 },
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    seedSalt: 1,
    population: 120,
    overlays: [{ x: 0, y: 0, landUse: 'building' }],
    npcSlots: [{ roleHint: 'resident' }],
    statsVersion: 1,
    extraStats: {}
  }
}

describe('realizeSettlementNaming persist', () => {
  it('persists display name and history without changing settlement stats', () => {
    const service = makeService()
    const created = service.createCivilization('w1', candidate())
    const before = service.getCivilization('w1', created.civilizationId)
    expect(before).not.toBeNull()
    const updated = realizeSettlementNaming(
      service,
      { worldId: 'w1', civilizationId: created.civilizationId },
      {
        displayName: 'Millbrook',
        history: 'Farmers gather grain beside a quiet brook.'
      }
    )
    expect(updated.displayName).toBe('Millbrook')
    expect(updated.history).toContain('brook')
    expect(updated.namingRealizedAt).toBeTruthy()
    expect(updated.population).toBe(before?.population)
    expect(updated.kind).toBe(before?.kind)
  })
})

describe('realizeSettlementNaming once', () => {
  it('realizes naming only once unless regenerate is true', () => {
    const service = makeService()
    const created = service.createCivilization('w1', candidate())
    realizeSettlementNaming(
      service,
      { worldId: 'w1', civilizationId: created.civilizationId },
      { displayName: 'First Hamlet', history: 'An old story.' }
    )
    expect(() =>
      realizeSettlementNaming(
        service,
        { worldId: 'w1', civilizationId: created.civilizationId },
        { displayName: 'Second Hamlet', history: 'Another story.' }
      )
    ).toThrow(/already realized/i)
    const regenerated = realizeSettlementNaming(
      service,
      { worldId: 'w1', civilizationId: created.civilizationId },
      { displayName: 'New Hamlet', history: 'A refreshed story.' },
      { regenerate: true }
    )
    expect(regenerated.displayName).toBe('New Hamlet')
  }, 15_000)
})

function makeService() {
  const dataRoot = tempRoot()
  return createCivilizationService({
    dataRoot,
    regional: makeRegional(dataRoot),
    world: makeWorld()
  })
}
