import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Aabb, Cell, ExpansionRecord, WorldMeta } from '@weaver/world-engine'
import { createRegionalService, type RegionalWorldReader, type RegionCandidate } from './regionService.js'

const roots: string[] = []

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-regional-'))
  roots.push(root)
  return root
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

function cell(x: number, y: number, landType: Cell['landType'], elevation = 0.25): Cell {
  return { x, y, landType, elevation }
}

function makeWorld(cells: Cell[], bounds: Aabb, expansions: ExpansionRecord[] = []): RegionalWorldReader {
  const byKey = new Map(cells.map((entry) => [`${entry.x},${entry.y}`, entry]))
  return {
    getWorldMeta: (worldId) => meta(worldId, bounds, cells.length),
    getWorldBounds: () => bounds,
    getExpansion: (_worldId, expansionId) => expansions.find((entry) => entry.expansionId === expansionId) ?? null,
    getCell: ({ x, y }) => byKey.get(`${x},${y}`) ?? null,
    getWorldSpecific: ({ bounds: requested }) => cells.filter((entry) => inBounds(requested, entry.x, entry.y))
  }
}

function meta(worldId: string, bounds: Aabb, cellCount: number): WorldMeta {
  return {
    worldId,
    seed: 42,
    bounds,
    noise: { frequency: 0.1, octaves: 1, persistence: 0.5, lacunarity: 2 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    cellCount
  }
}

function inBounds(bounds: Aabb, x: number, y: number): boolean {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY
}

function fixtureCells(): Cell[] {
  return [
    cell(0, 0, 'ocean'),
    cell(1, 0, 'ocean'),
    cell(2, 0, 'grassland'),
    cell(3, 0, 'grassland'),
    cell(0, 1, 'ocean'),
    cell(1, 1, 'ocean'),
    cell(2, 1, 'grassland'),
    cell(3, 1, 'forest'),
    cell(0, 2, 'desert'),
    cell(1, 2, 'desert'),
    cell(2, 2, 'forest'),
    cell(3, 2, 'forest')
  ]
}

function candidate(): RegionCandidate {
  return {
    regionId: 'region_manual',
    worldId: 'w1',
    sourceExpansionId: 'expansion_0',
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
    extraStats: { note: 'fixture' },
    cells: [
      { x: 2, y: 1 },
      { x: 3, y: 1 }
    ]
  }
}

describe('RegionalService store', () => {
  it('persists region records and cell membership in a per-world SQLite database', () => {
    const dataRoot = tempRoot()
    const service = createRegionalService({
      dataRoot,
      world: makeWorld(fixtureCells(), { minX: 0, minY: 0, maxX: 3, maxY: 2 })
    })

    const saved = service.createRegion('w1', candidate())
    const reopened = createRegionalService({
      dataRoot,
      world: makeWorld(fixtureCells(), { minX: 0, minY: 0, maxX: 3, maxY: 2 })
    })

    expect(existsSync(join(dataRoot, 'w1', 'regions.sqlite'))).toBe(true)
    expect(saved.regionId).toBe('region_manual')
    expect(reopened.getRegion('w1', 'region_manual')).toMatchObject({
      dominantLandType: 'forest',
      extraStats: { note: 'fixture' }
    })
    expect(reopened.getRegionCells('w1', 'region_manual')).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 1 }
    ])
    expect(reopened.getRegionAt('w1', 2, 1)?.regionId).toBe('region_manual')
  })
})

describe('RegionalService segmentation', () => {
  it('finds deterministic same-landType contiguous candidates without persisting them', () => {
    const service = createRegionalService({
      dataRoot: tempRoot(),
      world: makeWorld(fixtureCells(), { minX: 0, minY: 0, maxX: 3, maxY: 2 })
    })

    const candidates = service.findNewRegion('w1')
    const byType = candidates.map((entry) => [entry.dominantLandType, entry.cellCount])

    expect(byType).toEqual([
      ['ocean', 4],
      ['grassland', 3],
      ['forest', 3],
      ['desert', 2]
    ])
    expect(candidates[0]).toMatchObject({
      regionId: 'region_78a1573ca726',
      bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      isOcean: true,
      statsVersion: 1
    })
    expect(service.countRegions('w1')).toBe(0)
  })

  it('fills regions idempotently and exposes LLM-ready query summaries', () => {
    const service = createRegionalService({
      dataRoot: tempRoot(),
      world: makeWorld(fixtureCells(), { minX: 0, minY: 0, maxX: 3, maxY: 2 })
    })

    const created = service.fillRegions('w1')
    const repeated = service.fillRegions('w1')
    const grass = created.find((entry) => entry.dominantLandType === 'grassland')

    expect(created).toHaveLength(4)
    expect(repeated).toEqual([])
    expect(service.hasRegions('w1')).toBe(true)
    expect(service.countRegions('w1')).toBe(4)
    expect(service.listRegions('w1')).toHaveLength(4)
    expect(service.getRegionsInBounds('w1', { minX: 2, minY: 0, maxX: 3, maxY: 2 })).toHaveLength(2)
    expect(service.getRegionSummary('w1', grass?.regionId ?? '')).toMatchObject({
      dominantLandType: 'grassland',
      cellCount: 3,
      isLandlocked: false
    })
    service.deleteRegion('w1', grass?.regionId ?? '')
    expect(service.countRegions('w1')).toBe(3)
    service.clearRegions('w1')
    expect(service.hasRegions('w1')).toBe(false)
  })

  it('uses expansion metadata for scoped fill and only assigns unfilled cells in that scope', () => {
    const expansion = {
      expansionId: 'expansion_1',
      worldId: 'w1',
      sequence: 1,
      addedBounds: { minX: 4, minY: 0, maxX: 5, maxY: 1 },
      previousBounds: { minX: 0, minY: 0, maxX: 3, maxY: 1 },
      resultingBounds: { minX: 0, minY: 0, maxX: 5, maxY: 1 },
      createdAt: '2026-01-01T00:00:00.000Z',
      cellCount: 4
    } satisfies ExpansionRecord
    const requested: Aabb[] = []
    const world = makeWorld(
      [cell(4, 0, 'forest'), cell(5, 0, 'forest'), cell(4, 1, 'ocean'), cell(5, 1, 'ocean')],
      expansion.resultingBounds,
      [expansion]
    )
    const recordingWorld: RegionalWorldReader = {
      ...world,
      getWorldSpecific: (args) => {
        requested.push(args.bounds)
        return world.getWorldSpecific(args)
      }
    }
    const service = createRegionalService({ dataRoot: tempRoot(), world: recordingWorld })

    const created = service.fillRegions('w1', { expansionId: 'expansion_1' })

    expect(requested).toEqual([expansion.addedBounds])
    expect(created).toHaveLength(2)
    expect(created.every((entry) => entry.sourceExpansionId === 'expansion_1')).toBe(true)
    expect(service.getRegionAt('w1', 4, 0)?.dominantLandType).toBe('forest')
  })
})
