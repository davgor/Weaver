import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createRegionalService, realizeRegionNaming } from '@weaver/regional-engine'
import {
  persistValidatedRegionNaming,
  toValidatedPlaceNaming,
  type ValidatedPlaceNaming
} from '../naming/worldNamingOrchestration.js'
import { realizePlaceNaming, sealPlaceNaming } from '@weaver/narration-engine'
import { DmNamingError } from '../naming/errors.js'
import type { Aabb, WorldMeta } from '@weaver/world-engine'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('DMEngine -> RegionalEngine naming contract persist (060)', () => {
  it('persists narration-validated region naming on the real RegionalEngine API', async () => {
    const dataRoot = tempRoot()
    const service = createRegionalService({ dataRoot, world: makeWorld() })
    const region = service.createRegion('w1', sampleRegion())

    const outcome = await realizePlaceNaming(
      {
        kind: 'region',
        campaignId: 'contract-camp',
        stats: {
          dominantLandType: region.dominantLandType,
          isOcean: region.isOcean,
          isLandlocked: region.isLandlocked,
          touchesOcean: region.touchesOcean,
          waterContent: region.waterContent
        }
      },
      scriptedCompleter([
        JSON.stringify({ displayName: 'Ironwood', history: 'Dark trees cover the hills.' })
      ])
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return

    const validated = toValidatedPlaceNaming(
      { realizePlaceNaming, realizePantheon: async () => ({ ok: false, reason: 'unused' }), sealPlaceNaming },
      outcome.naming
    )
    const updated = persistValidatedRegionNaming(
      { service, worldId: 'w1' },
      region.regionId,
      validated
    )

    expect(updated.displayName).toBe('Ironwood')
    expect(service.getRegion('w1', region.regionId)?.history).toContain('trees')
  })
})

describe('DMEngine -> RegionalEngine naming contract validation gate (060)', () => {
  it('rejects DM-invented naming that bypasses NarrationEngine validation', () => {
    const dataRoot = tempRoot()
    const service = createRegionalService({ dataRoot, world: makeWorld() })
    const region = service.createRegion('w1', sampleRegion())
    const dmInvented = {
      campaignId: 'contract-camp',
      displayName: 'DM Invented Vale',
      history: 'This text never passed NarrationEngine.',
      seal: '0000000000000000000000000000000000000000000000000000000000000000'
    } as ValidatedPlaceNaming

    expect(() =>
      persistValidatedRegionNaming({ service, worldId: 'w1' }, region.regionId, dmInvented)
    ).toThrow(DmNamingError)

    expect(service.getRegion('w1', region.regionId)?.displayName).toBeUndefined()
  })
})

describe('DMEngine -> RegionalEngine naming contract realize-once (060)', () => {
  it('exposes one-time realize semantics on the real RegionalEngine API', () => {
    const dataRoot = tempRoot()
    const service = createRegionalService({ dataRoot, world: makeWorld() })
    const region = service.createRegion('w1', sampleRegion())

    realizeRegionNaming(service, { worldId: 'w1', regionId: region.regionId }, {
      displayName: 'Named Once',
      history: 'Only one history.'
    })

    expect(() =>
      realizeRegionNaming(service, { worldId: 'w1', regionId: region.regionId }, {
        displayName: 'Second Try',
        history: 'Should fail.'
      })
    ).toThrow(/already realized/i)
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-regional-contract-'))
  roots.push(root)
  return root
}

function makeWorld() {
  const bounds: Aabb = { minX: 0, minY: 0, maxX: 1, maxY: 0 }
  return {
    getWorldMeta: (worldId: string): WorldMeta => ({
      worldId,
      seed: 1,
      bounds,
      noise: { frequency: 0.1, octaves: 1, persistence: 0.5, lacunarity: 2 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      cellCount: 2
    }),
    getWorldBounds: () => bounds,
    getExpansion: () => null,
    getCell: () => null,
    getWorldSpecific: () => []
  }
}

function sampleRegion() {
  return {
    regionId: 'region_contract',
    worldId: 'w1',
    dominantLandType: 'forest' as const,
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
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]
  }
}

function scriptedCompleter(responses: string[]) {
  let index = 0
  return {
    async completeText() {
      const text = responses[index] ?? responses[responses.length - 1] ?? '{}'
      index += 1
      return { text, backend: 'test' }
    }
  }
}
